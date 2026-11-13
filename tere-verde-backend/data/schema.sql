
-- =========================================
-- BANCO DE DADOS: TERÊ VERDE
-- =========================================

-- 1. Administradores
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Parques
CREATE TABLE parks (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL UNIQUE,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    horarios_funcionamento TEXT,
    regras_conduta TEXT,
    areas_disponiveis JSONB DEFAULT '{}',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Atividades
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    park_id INTEGER NOT NULL REFERENCES parks(id),
    nome VARCHAR(200) NOT NULL,
    distancia VARCHAR(100),
    tempo VARCHAR(100),
    dificuldade VARCHAR(50),
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT,
    disponibilidade VARCHAR(20) NOT NULL DEFAULT 'Aberto',
    imagens TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Eventos
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    park_id INTEGER NOT NULL REFERENCES parks(id),
    nome VARCHAR(200) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    descricao TEXT,
    visivel BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
