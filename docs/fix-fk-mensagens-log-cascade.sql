-- ============================================================
-- Fix: ao excluir um lead, o CASCADE tenta deletar mensagens_agendadas,
-- mas mensagens_log referencia mensagens_agendadas com ON DELETE NO ACTION
-- (default), bloqueando a exclusao com erro 23503.
--
-- Solucao: recriar a FK com ON DELETE SET NULL (preserva o log historico,
-- so desvincula da mensagem agendada deletada).
-- ============================================================

ALTER TABLE mensagens_log
  DROP CONSTRAINT IF EXISTS mensagens_log_mensagem_agendada_id_fkey;

ALTER TABLE mensagens_log
  ADD CONSTRAINT mensagens_log_mensagem_agendada_id_fkey
  FOREIGN KEY (mensagem_agendada_id)
  REFERENCES mensagens_agendadas(id)
  ON DELETE SET NULL;
