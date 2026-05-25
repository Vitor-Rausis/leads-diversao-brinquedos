-- ============================================================
-- Trigger: ao mudar config de agendamento, recalcula data_agendada
-- das mensagens PENDENTES do mesmo tipo, usando a data_cadastro
-- do lead + os novos dias/hora.
--
-- Nao afeta mensagens enviadas, canceladas, falha ou com conteudo_custom
-- (essas sao manuais e tem data propria).
-- ============================================================

CREATE OR REPLACE FUNCTION fn_recalc_mensagens_on_config_change()
RETURNS TRIGGER AS $$
BEGIN
  -- So recalcula se mudou dias OU hora (nao precisa fazer nada quando so muda 'ativo')
  IF NEW.dias IS DISTINCT FROM OLD.dias OR NEW.hora IS DISTINCT FROM OLD.hora THEN
    UPDATE mensagens_agendadas ma
    SET data_agendada = TIMEZONE(
      'America/Sao_Paulo',
      (l.data_cadastro::DATE + NEW.dias * INTERVAL '1 day')::TIMESTAMP + NEW.hora
    )
    FROM leads l
    WHERE ma.lead_id = l.id
      AND ma.tipo = NEW.tipo
      AND ma.status = 'pendente'
      AND ma.conteudo_custom IS NULL;  -- preserva mensagens manuais
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_config_msg_recalc ON configuracoes_mensagem;

CREATE TRIGGER trg_config_msg_recalc
  AFTER UPDATE ON configuracoes_mensagem
  FOR EACH ROW
  EXECUTE FUNCTION fn_recalc_mensagens_on_config_change();
