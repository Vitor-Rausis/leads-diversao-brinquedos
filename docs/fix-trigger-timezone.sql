-- ============================================================
-- Fix: trigger fn_criar_mensagens_agendadas usa timezone BRT
-- Execute no Supabase SQL Editor
-- ============================================================

-- Problema: o trigger anterior tratava 'hora' como UTC,
-- fazendo com que 09:30 BRT fosse armazenado como 09:30 UTC
-- e exibido como 06:30 BRT no frontend.
--
-- Solução: usar TIMEZONE('America/Sao_Paulo', ...) para
-- interpretar a hora configurada como horário de Brasília
-- e converter corretamente para UTC no armazenamento.

CREATE OR REPLACE FUNCTION fn_criar_mensagens_agendadas()
RETURNS TRIGGER AS $$
DECLARE
    config RECORD;
    data_envio TIMESTAMPTZ;
BEGIN
    FOR config IN
        SELECT tipo, dias, hora FROM configuracoes_mensagem WHERE ativo = TRUE
    LOOP
        data_envio := TIMEZONE(
            'America/Sao_Paulo',
            (NEW.data_cadastro::DATE + config.dias * INTERVAL '1 day')::TIMESTAMP + config.hora
        );

        INSERT INTO mensagens_agendadas (lead_id, tipo, data_agendada)
        VALUES (NEW.id, config.tipo, data_envio);
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
