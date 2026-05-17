// Edge Function: processa mensagens_agendadas pendentes e envia via Evolution API.
// Disparada por pg_cron a cada 1 minuto.
// Substitui backend/src/jobs/whatsappJobs.js -> processScheduledMessages

import { supabase } from "../_shared/supabase.ts";
import { sendText } from "../_shared/evolutionApi.ts";

const MAX_RETRIES = 3;

const DEFAULT_TEMPLATES: Record<string, string> = {
  dia_3:
    "Ola {{nome}}, voce tem alguma duvida sobre os brinquedos, ou tem interesse em fazer a reserva?",
  dia_7:
    "Ola {{nome}}, como vai? Voce ja fez a locacao dos brinquedos, ou tem interesse em fazer a locacao?",
  mes_10:
    "Ola {{nome}}, sou o Fernando da Diversao Brinquedos, como vai?\nHa um tempo atras voce fez a cotacao de brinquedos com nossa empresa.\nGostaria de saber se tem interesse em receber o catalogo atualizado para uma nova locacao?",
};

Deno.serve(async (_req) => {
  const start = Date.now();

  const { data: messages, error } = await supabase
    .from("mensagens_agendadas")
    .select(
      "id, tipo, conteudo_custom, forcar_envio, data_agendada, tentativas, leads!inner(id, nome, whatsapp, status)"
    )
    .eq("status", "pendente")
    .lte("data_agendada", new Date().toISOString())
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!messages || messages.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, failed: 0, skipped: 0, duration_ms: Date.now() - start }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: templates } = await supabase
    .from("templates_mensagem")
    .select("tipo, conteudo")
    .eq("ativo", true);

  const templateMap: Record<string, string> = {};
  for (const t of templates ?? []) templateMap[t.tipo] = t.conteudo;

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const msg of messages) {
    const lead = (msg as any).leads;

    if (
      !msg.forcar_envio &&
      msg.tipo !== "mes_10" &&
      ["Perdido", "Convertido"].includes(lead.status)
    ) {
      await supabase
        .from("mensagens_agendadas")
        .update({ status: "cancelada" })
        .eq("id", msg.id)
        .eq("status", "pendente");
      continue;
    }

    // Resolve texto ANTES do claim. Se faltar template, pula sem claimar
    // (caso contrario tentativas ficaria incrementada e mensagem nunca seria reenviada).
    let text: string;
    if (msg.conteudo_custom) {
      text = msg.conteudo_custom.replace(/\{\{nome\}\}/g, lead.nome);
    } else {
      const template = templateMap[msg.tipo] ?? DEFAULT_TEMPLATES[msg.tipo];
      if (!template) continue;
      text = template.replace(/\{\{nome\}\}/g, lead.nome);
    }

    // Claim atomico: so envia se ainda for 'pendente' e tentativas nao mudou.
    // Previne envio duplicado entre execucoes concorrentes.
    const novaTentativa = msg.tentativas + 1;
    const { data: claimed, error: claimErr } = await supabase
      .from("mensagens_agendadas")
      .update({ tentativas: novaTentativa })
      .eq("id", msg.id)
      .eq("status", "pendente")
      .eq("tentativas", msg.tentativas)
      .select("id");

    if (claimErr) {
      console.error(`claim error ${msg.id}:`, claimErr.message);
      continue;
    }
    if (!claimed || claimed.length === 0) {
      skipped++;
      continue;
    }

    const result = await sendText(lead.whatsapp, text);

    if (result.success === true) {
      await supabase
        .from("mensagens_agendadas")
        .update({ status: "enviada", enviada_em: new Date().toISOString() })
        .eq("id", msg.id);

      await supabase.from("mensagens_log").insert({
        lead_id: lead.id,
        whatsapp: lead.whatsapp,
        direcao: "enviada",
        conteudo: text,
        mensagem_agendada_id: msg.id,
        metadata: { messageId: result.messageId },
      });

      await supabase
        .from("leads")
        .update(
          lead.status === "Novo"
            ? { status: "Em Contato" }
            : { atualizado_em: new Date().toISOString() }
        )
        .eq("id", lead.id);

      sent++;
    } else {
      const errorMsg = result.error;
      await supabase
        .from("mensagens_agendadas")
        .update({
          status: novaTentativa >= MAX_RETRIES ? "falha" : "pendente",
          erro_detalhe: JSON.stringify(errorMsg),
        })
        .eq("id", msg.id);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, failed, skipped, duration_ms: Date.now() - start }),
    { headers: { "Content-Type": "application/json" } }
  );
});
