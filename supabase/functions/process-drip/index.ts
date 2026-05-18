// Edge Function: processa drip_queue.
// Disparada por pg_cron a cada 1 minuto.
//
// Concorrencia: claim via claim_pending_drip (FOR UPDATE SKIP LOCKED).
// Garantia absoluta contra envio duplicado.

import { supabase } from "../_shared/supabase.ts";
import { sendText } from "../_shared/evolutionApi.ts";

function resolveTemplate(template: string, lead: {
  nome: string;
  whatsapp: string;
  origem: string;
}): string {
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

  const { data: items, error } = await supabase.rpc("claim_pending_drip", {
    p_limit: 50,
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!items || items.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, failed: 0, cancelled: 0, duration_ms: Date.now() - start }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  let sent = 0;
  let failed = 0;
  let cancelled = 0;

  for (const item of items) {
    // Lead convertido/perdido: cancela ao inves de enviar
    if (["Convertido", "Perdido"].includes(item.lead_status)) {
      await supabase
        .from("drip_queue")
        .update({ status: "cancelled", sent_at: null })
        .eq("id", item.id);
      cancelled++;
      continue;
    }

    const message = resolveTemplate(item.message_template, {
      nome: item.lead_nome,
      whatsapp: item.lead_whatsapp,
      origem: item.lead_origem,
    });

    const result = await sendText(item.lead_whatsapp, message);

    if (result.success === true) {
      await supabase
        .from("drip_queue")
        .update({
          sent_at: new Date().toISOString(),
          message_id: result.messageId ?? null,
        })
        .eq("id", item.id);

      await supabase.from("mensagens_log").insert({
        lead_id: item.lead_id,
        whatsapp: item.lead_whatsapp,
        direcao: "enviada",
        conteudo: message,
        metadata: { drip_step_id: item.drip_step_id, campaign_id: item.campaign_id },
      });

      sent++;
    } else {
      // canRetry=false: incerteza de entrega. NUNCA retentar.
      // canRetry=true: erro de validacao. Reagenda em 5min se ainda ha retries.
      const errorMsg = result.error;
      const exhausted = item.attempts >= item.max_attempts;

      const update: Record<string, unknown> = {
        error_message: errorMsg,
        sent_at: null,
      };
      if (!result.canRetry || exhausted) {
        update.status = "failed";
      } else {
        update.scheduled_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        update.status = "pending";
      }
      await supabase.from("drip_queue").update(update).eq("id", item.id);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, failed, cancelled, duration_ms: Date.now() - start }),
    { headers: { "Content-Type": "application/json" } }
  );
});
