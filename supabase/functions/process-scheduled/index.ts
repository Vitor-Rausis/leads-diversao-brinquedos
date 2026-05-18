// Edge Function: processa mensagens_agendadas pendentes e envia via Evolution API.
// Disparada por pg_cron a cada 1 minuto.
//
// Concorrencia: o claim acontece dentro de claim_pending_messages (funcao SQL)
// usando FOR UPDATE SKIP LOCKED. Garantia absoluta de que duas execucoes
// concorrentes nunca pegam a mesma linha.

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

  // Claim atomico via funcao SQL com FOR UPDATE SKIP LOCKED.
  // Linhas retornadas ja tem status='enviada' (com enviada_em=NULL).
  const { data: messages, error } = await supabase.rpc("claim_pending_messages", {
    p_limit: 50,
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!messages || messages.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, failed: 0, cancelled: 0, duration_ms: Date.now() - start }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Busca templates uma vez
  const { data: templates } = await supabase
    .from("templates_mensagem")
    .select("tipo, conteudo")
    .eq("ativo", true);

  const templateMap: Record<string, string> = {};
  for (const t of templates ?? []) templateMap[t.tipo] = t.conteudo;

  let sent = 0;
  let failed = 0;
  let cancelled = 0;

  for (const msg of messages) {
    // Regras de cancelamento: lead Convertido/Perdido nao recebe dia_3/dia_7
    // (mes_10 sempre envia; forcar_envio bypassa)
    if (
      !msg.forcar_envio &&
      msg.tipo !== "mes_10" &&
      ["Perdido", "Convertido"].includes(msg.lead_status)
    ) {
      await supabase
        .from("mensagens_agendadas")
        .update({ status: "cancelada", enviada_em: null })
        .eq("id", msg.id);
      cancelled++;
      continue;
    }

    // Resolve texto
    let text: string;
    if (msg.conteudo_custom) {
      text = msg.conteudo_custom.replace(/\{\{nome\}\}/g, msg.lead_nome);
    } else {
      const template = templateMap[msg.tipo] ?? DEFAULT_TEMPLATES[msg.tipo];
      if (!template) {
        // Sem template e sem conteudo - reverte para pendente sem perder retry
        await supabase
          .from("mensagens_agendadas")
          .update({
            status: "pendente",
            tentativas: msg.tentativas - 1, // desfaz incremento do claim
          })
          .eq("id", msg.id);
        continue;
      }
      text = template.replace(/\{\{nome\}\}/g, msg.lead_nome);
    }

    const result = await sendText(msg.lead_whatsapp, text);

    if (result.success === true) {
      // Confirma envio: marca enviada_em (status ja era 'enviada' do claim)
      await supabase
        .from("mensagens_agendadas")
        .update({ enviada_em: new Date().toISOString() })
        .eq("id", msg.id);

      await supabase.from("mensagens_log").insert({
        lead_id: msg.lead_id,
        whatsapp: msg.lead_whatsapp,
        direcao: "enviada",
        conteudo: text,
        mensagem_agendada_id: msg.id,
        metadata: { messageId: result.messageId },
      });

      // Atualiza atualizado_em do lead (usado pelo alerta "Esquecido")
      // Se ainda era Novo, avanca para Em Contato
      await supabase
        .from("leads")
        .update(
          msg.lead_status === "Novo"
            ? { status: "Em Contato" }
            : { atualizado_em: new Date().toISOString() }
        )
        .eq("id", msg.lead_id);

      sent++;
    } else {
      // canRetry=false: incerteza de entrega (timeout, 5xx, network). NUNCA retentar.
      // canRetry=true: erro definitivo de validacao (telefone invalido, config). Retenta
      // ate MAX_RETRIES — mas como esse tipo de erro raramente se resolve sozinho,
      // na pratica vira falha logo.
      const errorMsg = result.error;
      const exhausted = msg.tentativas >= MAX_RETRIES;
      const newStatus = !result.canRetry || exhausted ? "falha" : "pendente";

      await supabase
        .from("mensagens_agendadas")
        .update({
          status: newStatus,
          enviada_em: null,
          erro_detalhe: JSON.stringify(errorMsg),
        })
        .eq("id", msg.id);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, failed, cancelled, duration_ms: Date.now() - start }),
    { headers: { "Content-Type": "application/json" } }
  );
});
