-- ============================================================
-- Drip Campaign System - Migration
-- Execute este SQL no Supabase SQL Editor
-- IMPORTANTE: Executar DEPOIS do database-schema.sql principal
-- ============================================================

-- ============================================
-- TABELA: drip_campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS drip_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  trigger_event VARCHAR(50) DEFAULT 'lead_created'
    CHECK (trigger_event IN ('lead_created', 'lead_qualified', 'manual')),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: drip_steps
-- ============================================
CREATE TABLE IF NOT EXISTS drip_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  delay_minutes INT NOT NULL DEFAULT 0,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drip_steps_campaign ON drip_steps(campaign_id, step_order);

-- ============================================
-- TABELA: drip_queue
-- ============================================
CREATE TABLE IF NOT EXISTS drip_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  drip_step_id UUID NOT NULL REFERENCES drip_steps(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled', 'opted_out')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  message_id VARCHAR(255),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drip_queue_pending ON drip_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_drip_queue_lead ON drip_queue(lead_id);

-- ============================================
-- TRIGGER: auto-enfileirar campanha ao criar lead
-- ============================================
CREATE OR REPLACE FUNCTION fn_enqueue_drip_on_lead_created()
RETURNS TRIGGER AS $$
DECLARE
  campaign RECORD;
  step RECORD;
  scheduled TIMESTAMPTZ;
BEGIN
  -- Para cada campanha ativa com trigger 'lead_created'
  FOR campaign IN
    SELECT id FROM drip_campaigns
    WHERE is_active = TRUE AND trigger_event = 'lead_created'
  LOOP
    scheduled := NOW();

    -- Para cada step da campanha, em ordem
    FOR step IN
      SELECT id, delay_minutes FROM drip_steps
      WHERE campaign_id = campaign.id AND is_active = TRUE
      ORDER BY step_order ASC
    LOOP
      scheduled := scheduled + (step.delay_minutes || ' minutes')::INTERVAL;

      INSERT INTO drip_queue (lead_id, drip_step_id, campaign_id, status, scheduled_at)
      VALUES (NEW.id, step.id, campaign.id, 'pending', scheduled);
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_created_enqueue_drip
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION fn_enqueue_drip_on_lead_created();

-- ============================================
-- TRIGGERS: auto updated_at para novas tabelas
-- ============================================
CREATE TRIGGER trg_drip_campaigns_updated
  BEFORE UPDATE ON drip_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION fn_atualizar_timestamp();

CREATE TRIGGER trg_drip_steps_updated
  BEFORE UPDATE ON drip_steps
  FOR EACH ROW
  EXECUTE FUNCTION fn_atualizar_timestamp();

CREATE TRIGGER trg_drip_queue_updated
  BEFORE UPDATE ON drip_queue
  FOR EACH ROW
  EXECUTE FUNCTION fn_atualizar_timestamp();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE drip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drip_campaigns_full_access" ON drip_campaigns FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "drip_steps_full_access" ON drip_steps FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "drip_queue_full_access" ON drip_queue FOR ALL USING (TRUE) WITH CHECK (TRUE);
