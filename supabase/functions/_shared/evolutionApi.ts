// Wrapper minimo da Evolution API para Edge Functions.
// Replica logica de backend/src/services/evolutionApiService.js

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") ?? "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const EVOLUTION_INSTANCE =
  Deno.env.get("EVOLUTION_API_INSTANCE") ??
  Deno.env.get("EVOLUTION_INSTANCE") ??
  "diversao-brinquedos";

export function formatPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

export type SendResult =
  | { success: true; messageId?: string; remoteJid?: string }
  // timeout = nao sabemos se foi entregue. NAO retentar (pode duplicar).
  | { success: false; timeout: true; error: string }
  | { success: false; timeout?: false; error: string };

// Timeout generoso: Evolution API no Fly free tier pode demorar.
// Mais importante: se passar daqui, a msg pode ter sido entregue e nao podemos retentar.
const SEND_TIMEOUT_MS = 60_000;

export async function sendText(to: string, text: string): Promise<SendResult> {
  if (!EVOLUTION_API_KEY || !EVOLUTION_API_URL) {
    return { success: false, error: "Evolution API not configured" };
  }
  const number = formatPhone(to);
  if (!number) return { success: false, error: "Invalid phone number" };

  try {
    const res = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({ number, text }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }

    const data = await res.json();
    return {
      success: true,
      messageId: data?.key?.id,
      remoteJid: data?.key?.remoteJid,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // AbortSignal timeout vira "DOMException: signal is aborted due to timeout" ou similar
    const isTimeout = msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("abort");
    if (isTimeout) {
      return { success: false, timeout: true, error: msg };
    }
    return { success: false, timeout: false, error: msg };
  }
}

export async function findMessages(limit = 20) {
  if (!EVOLUTION_API_KEY || !EVOLUTION_API_URL) {
    return { records: [] as any[] };
  }
  const res = await fetch(
    `${EVOLUTION_API_URL}/chat/findMessages/${EVOLUTION_INSTANCE}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ where: { key: { fromMe: false } }, limit }),
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!res.ok) {
    throw new Error(`Evolution findMessages HTTP ${res.status}`);
  }
  const data = await res.json();
  return { records: (data?.messages?.records ?? []) as any[] };
}
