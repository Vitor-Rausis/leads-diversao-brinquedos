-- ============================================================
-- Leads Diversao Brinquedos - Schema do Banco de Dados
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS (autenticacao JWT customizada)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'operator',
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- API_KEYS (para endpoint publico)
-- ============================================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_value VARCHAR(64) UNIQUE NOT NULL,
    descricao VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_key_value ON api_keys(key_value);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TYPE lead_status AS ENUM (
    'Novo',
    'Em Contato',
    'Respondeu',
    'Convertido',
    'Perdido'
);

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    data_cadastro TIMESTAMPTZ DEFAULT NOW(),
    status lead_status DEFAULT 'Novo',
    origem VARCHAR(100) NOT NULL,
    observacoes TEXT,
    criado_por UUID REFERENCES users(id),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_origem ON leads(origem);
CREATE INDEX idx_leads_data_cadastro ON leads(data_cadastro);
CREATE INDEX idx_leads_whatsapp ON leads(whatsapp);

-- ============================================================
-- MENSAGENS_AGENDADAS (automacao WhatsApp)
-- ============================================================
CREATE TYPE mensagem_tipo AS ENUM ('dia_3', 'dia_7', 'mes_10');
CREATE TYPE mensagem_status AS ENUM ('pendente', 'enviada', 'falha', 'cancelada');

CREATE TABLE mensagens_agendadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tipo mensagem_tipo NOT NULL,
    conteudo_custom TEXT,
    forcar_envio BOOLEAN DEFAULT FALSE,
    data_agendada TIMESTAMPTZ NOT NULL,
    status mensagem_status DEFAULT 'pendente',
    tentativas INT DEFAULT 0,
    erro_detalhe TEXT,
    enviada_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_msg_agendadas_status ON mensagens_agendadas(status);
CREATE INDEX idx_msg_agendadas_data ON mensagens_agendadas(data_agendada);
CREATE INDEX idx_msg_agendadas_lead ON mensagens_agendadas(lead_id);

-- ============================================================
-- MENSAGENS_LOG (historico completo de mensagens)
-- ============================================================
CREATE TYPE direcao_mensagem AS ENUM ('enviada', 'recebida');

CREATE TABLE mensagens_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    whatsapp VARCHAR(20) NOT NULL,
    direcao direcao_mensagem NOT NULL,
    conteudo TEXT NOT NULL,
    mensagem_agendada_id UUID REFERENCES mensagens_agendadas(id),
    metadata JSONB,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_msg_log_lead ON mensagens_log(lead_id);
CREATE INDEX idx_msg_log_whatsapp ON mensagens_log(whatsapp);
CREATE INDEX idx_msg_log_direcao ON mensagens_log(direcao);
CREATE INDEX idx_msg_log_criado_em ON mensagens_log(criado_em);

-- ============================================================
-- TEMPLATES_MENSAGEM
-- ============================================================
CREATE TABLE templates_mensagem (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo mensagem_tipo UNIQUE NOT NULL,
    conteudo TEXT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Seed templates padrao
INSERT INTO templates_mensagem (tipo, conteudo) VALUES
('dia_3',  'Ola {{nome}}, voce tem alguma duvida sobre os brinquedos, ou tem interesse em fazer a reserva?'),
('dia_7',  'Ola {{nome}}, como vai? Voce ja fez a locacao dos brinquedos, ou tem interesse em fazer a locacao?'),
('mes_10', E'Ola {{nome}}, sou o Fernando da Diversao Brinquedos, como vai?\nHa um tempo atras voce fez a cotacao de brinquedos com nossa empresa.\nGostaria de saber se tem interesse em receber o catalogo atualizado para uma nova locacao?');

-- ============================================================
-- RELATORIOS (relatorios gerados)
-- ============================================================
CREATE TABLE relatorios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    total_leads INT DEFAULT 0,
    leads_novos INT DEFAULT 0,
    leads_convertidos INT DEFAULT 0,
    leads_perdidos INT DEFAULT 0,
    mensagens_enviadas INT DEFAULT 0,
    mensagens_recebidas INT DEFAULT 0,
    dados_json JSONB,
    gerado_por UUID REFERENCES users(id),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONFIGURACOES_MENSAGEM (agendamento customizavel)
-- ============================================================
CREATE TABLE configuracoes_mensagem (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo mensagem_tipo UNIQUE NOT NULL,
    dias INT NOT NULL,
    hora TIME NOT NULL DEFAULT '09:00',
    ativo BOOLEAN DEFAULT TRUE,
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Seed configuracoes padrao
INSERT INTO configuracoes_mensagem (tipo, dias, hora) VALUES
('dia_3', 3, '09:00'),
('dia_7', 7, '09:00'),
('mes_10', 300, '09:00');

CREATE TRIGGER trg_config_msg_atualizar_timestamp
    BEFORE UPDATE ON configuracoes_mensagem
    FOR EACH ROW
    EXECUTE FUNCTION fn_atualizar_timestamp();

-- ============================================================
-- TRIGGER: Criar mensagens agendadas automaticamente
-- ============================================================
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

CREATE TRIGGER trg_lead_criar_mensagens
    AFTER INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION fn_criar_mensagens_agendadas();

-- ============================================================
-- TRIGGER: Atualizar timestamp automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION fn_atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_atualizar_timestamp
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION fn_atualizar_timestamp();

CREATE TRIGGER trg_users_atualizar_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_atualizar_timestamp();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_agendadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates_mensagem ENABLE ROW LEVEL SECURITY;

-- Service role bypass (backend usa service_role key)
CREATE POLICY "Service role full access" ON leads FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON mensagens_log FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON mensagens_agendadas FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON users FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON api_keys FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON relatorios FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON templates_mensagem FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON configuracoes_mensagem FOR ALL USING (TRUE) WITH CHECK (TRUE);
