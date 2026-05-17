// Edge Function: busca mensagens recebidas via Evolution API.
// Disparada por pg_cron a cada 1 minuto.
// Substitui backend/src/jobs/incomingMessagesJob.js -> pollIncomingMessages
//
// Diferenca do backend original: nao mantem lastProcessedTimestamp em memoria
// (Edge Functions sao stateless). Usa cron_state na tabela para persistir.

import { supabase } from "../_shared/supabase.ts";
import { findMessages } from "../_shared/evolutionApi.ts";

async function getLastTimestamp(): Promise<number> {
  const { data } = await supabase
    .from("cron_state")
    .select("value")
    .eq("key", "poll_messages_last_ts")
    .maybeSingle();

  if (data?.value) return Number(data.value);
  // Inicia 2 minutos atras
  return Math.floor(Date.now() / 1000) - 120;
}

async function setLastTimestamp(ts: number): Promise<void> {
  await supabase
    .from("cron_state")
    .upsert({ key: "poll_messages_last_ts", value: String(ts) }, { onConflict: "key" });
}

async function findLeadByPhone(variants: string[]) {
  for (const v of variants) {
    const { data } = await supabase
      .from("leads")
      .select("id, nome, status, data_cadastro")
      .eq("whatsapp", v)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

Deno.serve(async (_req) => {
  const start = Date.now();

  try {
    const lastTs = await getLastTimestamp();
    const { records } = await findMessages(20);

    if (!records.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0, duration_ms: Date.now() - start }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const novas = records.filter((m: any) => m.messageTimestamp > lastTs);
    if (!novas.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0, duration_ms: Date.now() - start }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const record of novas) {
      const remoteJid: string = record.key?.remoteJid ?? "";
      if (remoteJid.endsWith("@g.us")) continue; // ignora grupos

      const digits = remoteJid
        .replace(/@s\.whatsapp\.net$/, "")
        .replace(/@c\.us$/, "")
        .replace(/\D/g, "");

      const whatsappFull = digits.startsWith("55") ? digits : "55" + digits;
      const whatsappShort = whatsappFull.replace(/^55/, "");
      const whatsappWith9 = whatsappFull.replace(/^(55\d{2})(\d{8})$/, "$19$2");
      const whatsappWithout9 = whatsappFull.replace(/^(55\d{2})9(\d{8})$/, "$1$2");

      const msg = record.message ?? {};
      const content =
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        (msg.imageMessage ? "[imagem]" : null) ||
        (msg.videoMessage ? "[vídeo]" : null) ||
        (msg.audioMessage ? "[áudio]" : null) ||
        (msg.documentMessage ? "[documento]" : null) ||
        "[mensagem]";

      const fromMe = record.key?.fromMe === true;
      const direcao = fromMe ? "enviada" : "recebida";

      // Deduplica por messageId
      const messageId = record.key?.id;
      if (messageId) {
        const { data: existing } = await supabase
          .from("mensagens_log")
          .select("id")
          .eq("metadata->>messageId", messageId)
          .maybeSingle();
        if (existing) continue;
      }

      const lead = await findLeadByPhone([
        whatsappFull,
        whatsappShort,
        whatsappWith9,
        whatsappWithout9,
      ]);

      await supabase.from("mensagens_log").insert({
        lead_id: lead?.id ?? null,
        whatsapp: whatsappFull,
        direcao,
        conteudo: content,
        metadata: {
          remoteJid,
          messageId,
          pushName: record.pushName ?? null,
          timestamp: record.messageTimestamp,
        },
      });

      const msgTimestamp: number = record.messageTimestamp;
      const leadCadastroTs = lead?.data_cadastro
        ? Math.floor(new Date(lead.data_cadastro).getTime() / 1000)
        : null;

      if (
        !fromMe &&
        lead &&
        ["Novo", "Em Contato"].includes(lead.status) &&
        leadCadastroTs &&
        msgTimestamp >= leadCadastroTs
      ) {
        await supabase.from("leads").update({ status: "Respondeu" }).eq("id", lead.id);
      }

      processed++;
    }

    const maxTs = Math.max(...novas.map((m: any) => m.messageTimestamp));
    if (maxTs > lastTs) await setLastTimestamp(maxTs);

    return new Response(
      JSON.stringify({ ok: true, processed, duration_ms: Date.now() - start }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
