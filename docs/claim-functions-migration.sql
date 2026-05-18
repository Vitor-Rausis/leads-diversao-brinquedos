-- ============================================================
-- Funcoes SQL para claim atomico de mensagens
-- Usa FOR UPDATE SKIP LOCKED para garantir que duas execucoes
-- concorrentes nunca peguem a mesma linha.
--
-- COMO USAR:
-- Execute uma vez no Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- claim_pending_messages: pega ate N mensagens pendentes,
-- marca como 'enviada' atomicamente (com enviada_em=NULL como sentinela
-- "em processamento") e retorna as linhas claimed para envio.
--
-- Outras execucoes concorrentes nunca pegam as mesmas linhas porque
-- FOR UPDATE SKIP LOCKED faz com que a 2a transacao simplesmente
-- ignore (skip) as linhas ja travadas pela 1a, em vez de esperar.
-- ============================================================
CREATE OR REPLACE FUNCTION claim_pending_messages(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  lead_id UUID,
  tipo mensagem_tipo,
  conteudo_custom TEXT,
  forcar_envio BOOLEAN,
  tentativas INT,
  lead_nome TEXT,
  lead_whatsapp TEXT,
  lead_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT ma.id
    FROM mensagens_agendadas ma
    WHERE ma.status = 'pendente'
      AND ma.data_agendada <= NOW()
    ORDER BY ma.data_agendada ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ),
  updated AS (
    UPDATE mensagens_agendadas ma
    SET status = 'enviada',
        tentativas = ma.tentativas + 1,
        enviada_em = NULL  -- sentinela: claimed mas envio ainda nao confirmado
    FROM claimed c
    WHERE ma.id = c.id
    RETURNING ma.*
  )
  SELECT
    u.id,
    u.lead_id,
    u.tipo,
    u.conteudo_custom,
    u.forcar_envio,
    u.tentativas,
    l.nome::TEXT,
    l.whatsapp::TEXT,
    l.status::TEXT
  FROM updated u
  INNER JOIN leads l ON l.id = u.lead_id;
END;
$$;

-- ============================================================
-- claim_pending_drip: mesma logica para drip_queue
-- ============================================================
CREATE OR REPLACE FUNCTION claim_pending_drip(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  lead_id UUID,
  drip_step_id UUID,
  campaign_id UUID,
  attempts INT,
  max_attempts INT,
  message_template TEXT,
  lead_nome TEXT,
  lead_whatsapp TEXT,
  lead_origem TEXT,
  lead_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT dq.id
    FROM drip_queue dq
    WHERE dq.status = 'pending'
      AND dq.scheduled_at <= NOW()
    ORDER BY dq.scheduled_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ),
  updated AS (
    UPDATE drip_queue dq
    SET status = 'sent',
        attempts = dq.attempts + 1,
        sent_at = NULL  -- sentinela: claimed mas envio ainda nao confirmado
    FROM claimed c
    WHERE dq.id = c.id
    RETURNING dq.*
  )
  SELECT
    u.id,
    u.lead_id,
    u.drip_step_id,
    u.campaign_id,
    u.attempts,
    u.max_attempts,
    ds.message_template::TEXT,
    l.nome::TEXT,
    l.whatsapp::TEXT,
    l.origem::TEXT,
    l.status::TEXT
  FROM updated u
  INNER JOIN drip_steps ds ON ds.id = u.drip_step_id
  INNER JOIN leads l ON l.id = u.lead_id;
END;
$$;

-- ============================================================
-- Permissoes: service_role precisa acessar
-- ============================================================
GRANT EXECUTE ON FUNCTION claim_pending_messages(INT) TO service_role;
GRANT EXECUTE ON FUNCTION claim_pending_drip(INT) TO service_role;
