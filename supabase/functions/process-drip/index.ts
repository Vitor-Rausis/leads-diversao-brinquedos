// Edge Function: processa drip_queue.
// Disparada por pg_cron a cada 1 minuto.
// Substitui backend/src/services/dripService.js -> processQueue

import { supabase } from "../_shared/supabase.ts";
import { sendText } from "../_shared/evolutionApi.ts";

function resolveTemplate(template: string, lead: any): string {
  if (!template) return "";
  return template
    .replace(/\{\{nome\}\}/g, lead.nome || "")
    .replace(/\{\{primeiro_nome\}\}/g, (lead.nome || "").split(" ")[0])
    .replace(/\{\{first_name\}\}/g, (lead.nome || "").split(" ")[0])
    .replace(/\{\{name\}\}/g, lead.nome || "")
    .replace(/\{\{whatsapp\}\}/g, lead.whatsapp || "")
    .replace(/\{\{phone\}\}/g, lead.whatsapp || "")
    .replace(/\{\{origem\}\}/g, lead.origem || "")
    .replace(/\{\{source\}\}/g, lead.origem || "");
}

Deno.serve(async (_req) => {
  const start = Date.now();
  const now = new Date().toISOString();

  const { data: pending, error } = await supabase
    .from("drip_queue")
    .select("*, lead:leads(*), step:drip_steps(*)")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!pending || pending.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, failed: 0, skipped: 0, duration_ms: Date.now() - start }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of pending) {
    if (["Convertido", "Perdido"].includes((item as any).lead?.status)) {
      await supabase.from("drip_queue").update({ status: "cancelled" }).eq("id", item.id);
      continue;
    }

    // Claim atomico: muda status para 'sent' IMEDIATAMENTE (com sent_at=NULL como
    // sentinela "em processamento"). Garante que SELECT WHERE status='pending' de
    // execucoes concorrentes nao pegue esta linha. Se sendText falhar, revertemos.
    const novaTentativa = item.attempts + 1;
    const { data: claimed } = await supabase
      .from("drip_queue")
      .update({
        status: "sent",
        attempts: novaTentativa,
        sent_at: null,
      })
      .eq("id", item.id)
      .eq("status", "pending")
      .select("id");

    if (!claimed || claimed.length === 0) {
      skipped++;
      continue;
    }

    const message = resolveTemplate((item as any).step.message_template, (item as any).lead);
    const result = await sendText((item as any).lead.whatsapp, message);

    if (result.success === true) {
      // Confirma envio: marca sent_at e message_id (status ja era 'sent')
      await supabase
        .from("drip_queue")
        .update({
          sent_at: new Date().toISOString(),
          message_id: result.messageId ?? null,
        })
        .eq("id", item.id);

      await supabase.from("mensagens_log").insert({
        lead_id: (item as any).lead.id,
        whatsapp: (item as any).lead.whatsapp,
        direcao: "enviada",
        conteudo: message,
        metadata: { drip_step_id: item.drip_step_id, campaign_id: item.campaign_id },
      });

      sent++;
    } else {
      const errorMsg = result.error;
      const update: Record<string, unknown> = { error_message: errorMsg };
      if (novaTentativa >= item.max_attempts) {
        update.status = "failed";
      } else {
        update.scheduled_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        update.status = "pending"; // reagenda
      }
      await supabase.from("drip_queue").update(update).eq("id", item.id);
      failed++;
    }

    // Delay 2s entre envios para evitar bloqueio do WhatsApp
    await new Promise((r) => setTimeout(r, 2000));
  }

  return new Response(
    JSON.stringify({ ok: true, sent, failed, skipped, duration_ms: Date.now() - start }),
    { headers: { "Content-Type": "application/json" } }
  );
});
