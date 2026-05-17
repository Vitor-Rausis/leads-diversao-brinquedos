-- ============================================================
-- pg_cron + pg_net: dispara Edge Functions a cada 1 minuto
-- Substitui o cron interno do backend (que nao funciona no Render free tier).
--
-- TEMPLATE: copie este arquivo para 'pg-cron-migration.sql' (ja no .gitignore),
-- preencha as 2 constantes e execute no Supabase SQL Editor.
--
-- COMO USAR:
-- 1. No Supabase Dashboard: Database -> Extensions -> habilitar 'pg_cron' e 'pg_net'.
-- 2. Substitua os 2 valores no bloco DO:
--    - project_ref:      Settings -> General -> Reference ID
--    - service_role_key: Settings -> API Keys -> Secret keys -> default (Reveal)
-- 3. Execute este arquivo INTEIRO no Supabase SQL Editor.
-- 4. Inspecionar execucoes:
--    SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- ============================================================

-- ============================================================
-- 1. Habilita extensoes (idempotente)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verifica que ambas estao instaladas. Aborta com mensagem clara se faltar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron nao esta habilitado. Ative em Database -> Extensions no Dashboard.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE EXCEPTION 'pg_net nao esta habilitado. Ative em Database -> Extensions no Dashboard.';
  END IF;
END
$$;

-- ============================================================
-- 2. Tabela cron_state: estado persistente entre execucoes.
-- Usada pelo poll-messages para guardar lastProcessedTimestamp
-- (Edge Functions sao stateless e nao podem usar variavel em memoria).
-- ============================================================
CREATE TABLE IF NOT EXISTS cron_state (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. Agenda os 3 jobs.
--    Edite as 2 constantes no bloco abaixo antes de executar.
-- ============================================================
DO $$
DECLARE
  project_ref      TEXT := 'PROJECT_REF';        -- <<< AJUSTE
  service_role_key TEXT := 'SERVICE_ROLE_KEY';   -- <<< AJUSTE
  base_url         TEXT;
  auth_header      TEXT;
BEGIN
  IF project_ref = 'PROJECT_REF' OR service_role_key = 'SERVICE_ROLE_KEY' THEN
    RAISE EXCEPTION 'Edite project_ref e service_role_key no script antes de executar.';
  END IF;

  base_url    := format('https://%s.supabase.co/functions/v1', project_ref);
  auth_header := format('Bearer %s', service_role_key);

  -- Remove jobs antigos com mesmos nomes (permite re-rodar este script)
  PERFORM cron.unschedule(jobid)
    FROM cron.job
   WHERE jobname IN (
     'process_scheduled_messages',
     'poll_incoming_messages',
     'process_drip_queue'
   );

  -- Job 1: process-scheduled (mensagens agendadas)
  PERFORM cron.schedule(
    'process_scheduled_messages',
    '* * * * *',
    format($cmd$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization', %L),
        body    := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
    $cmd$, base_url || '/process-scheduled', auth_header)
  );

  -- Job 2: poll-messages (respostas recebidas)
  PERFORM cron.schedule(
    'poll_incoming_messages',
    '* * * * *',
    format($cmd$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization', %L),
        body    := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
    $cmd$, base_url || '/poll-messages', auth_header)
  );

  -- Job 3: process-drip (fila drip_queue)
  PERFORM cron.schedule(
    'process_drip_queue',
    '* * * * *',
    format($cmd$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization', %L),
        body    := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
    $cmd$, base_url || '/process-drip', auth_header)
  );

  RAISE NOTICE 'Jobs agendados com sucesso. Verifique com: SELECT * FROM cron.job;';
END
$$;

-- ============================================================
-- 4. Verificacao
-- ============================================================
-- SELECT jobid, jobname, schedule, active FROM cron.job;
--
-- SELECT j.jobname, d.start_time, d.status, d.return_message
--   FROM cron.job_run_details d
--   JOIN cron.job j ON j.jobid = d.jobid
--   ORDER BY d.start_time DESC
--   LIMIT 10;
