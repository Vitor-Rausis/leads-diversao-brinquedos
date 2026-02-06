-- ============================================================
-- SQL para adicionar tabela de configuracoes de mensagem
-- Execute no Supabase SQL Editor
-- ============================================================

-- Criar tabela de configuracoes (se nao existir)
CREATE TABLE IF NOT EXISTS configuracoes_mensagem (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo mensagem_tipo UNIQUE NOT NULL,
    dias INT NOT NULL,
    hora TIME NOT NULL DEFAULT '09:00',
    ativo BOOLEAN DEFAULT TRUE,
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuracoes padrao (ignorar se ja existir)
INSERT INTO configuracoes_mensagem (tipo, dias, hora) VALUES
('dia_3', 3, '09:00'),
('dia_7', 7, '09:00'),
('mes_10', 300, '09:00')
ON CONFLICT (tipo) DO NOTHING;

-- Habilitar RLS
ALTER TABLE configuracoes_mensagem ENABLE ROW LEVEL SECURITY;

-- Policy para service role
CREATE POLICY "Service role full access" ON configuracoes_mensagem
FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Atualizar funcao de trigger para usar configuracoes dinamicas
CREATE OR REPLACE FUNCTION fn_criar_mensagens_agendadas()
RETURNS TRIGGER AS $$
DECLARE
    config RECORD;
    data_envio TIMESTAMPTZ;
BEGIN
    -- Loop pelas configuracoes ativas
    FOR config IN
        SELECT tipo, dias, hora FROM configuracoes_mensagem WHERE ativo = TRUE
    LOOP
        -- Calcula a data de envio: data_cadastro + dias, no horario configurado
        data_envio := (NEW.data_cadastro::DATE + config.dias * INTERVAL '1 day') + config.hora;

        INSERT INTO mensagens_agendadas (lead_id, tipo, data_agendada)
        VALUES (NEW.id, config.tipo, data_envio);
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
