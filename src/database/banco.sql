\echo '--- Resetando banco sweetiefy_api_db ---'

\encoding UTF8 

SET client_encoding = 'UTF8'; 

\set ON_ERROR_STOP on

DROP DATABASE IF EXISTS sweetiefy_api_db;

CREATE DATABASE sweetiefy_api_db;

\connect sweetiefy_api_db

--Enum para prioridades
CREATE TYPE prioridade_enum AS ENUM ('Baixa', 'Media', 'Alta');

--Enum para estados
CREATE TYPE estado_enum AS ENUM ('Aberto', 'Pendente', 'Cancelado', 'Finalizado');

--Enum para métricas
CREATE TYPE metrica_enum AS ENUM ('Kg', 'g', 'L', 'ml', 'unidade', 'mg');

--Comandos DDL:

--Criação da tabela usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil SMALLINT NOT NULL CHECK (perfil IN (0,1)), -- Usuario, Admin
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP NOT NULL
);

--Criação da tabela ingredientes
CREATE TABLE IF NOT EXISTS ingredientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    metrica metrica_enum NOT NULL,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP NOT NULL
);

--Criação da tabela receitas
CREATE TABLE IF NOT EXISTS receitas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    imagem_url VARCHAR(255),
    preco NUMERIC(10,2) NOT NULL,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP NOT NULL
);

--Criação da tabela auxiliar receitas_ingredientes
CREATE TABLE IF NOT EXISTS receitas_ingredientes (
    id SERIAL PRIMARY KEY,
    receita_id INT NOT NULL REFERENCES receitas(id),
    ingrediente_id INT NOT NULL REFERENCES ingredientes(id),
    quantidade DECIMAL(10,2) NOT NULL
);

--Criação da tabela clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    endereco VARCHAR(255),
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP NOT NULL
);

--Criação da tabela pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id),
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    preco_total DECIMAL(10,2) NOT NULL,
    prioridade prioridade_enum NOT NULL,
    margem_lucro DECIMAL(5,2) NOT NULL,
    estado estado_enum NOT NULL,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP NOT NULL,
    data_limite TIMESTAMP NOT NULL
);

--Criação da tabela pedidos_receitas
CREATE TABLE IF NOT EXISTS pedidos_receitas (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id),
    receita_id INT NOT NULL REFERENCES receitas(id),
    quantidade DECIMAL(10,2) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL
);

--Comandos DML:

--Inserção usuários
INSERT INTO usuarios (nome, email, senha_hash, perfil, data_criacao, data_atualizacao)
VALUES
('Ana Souza', 'ana@exemplo.com', '$2a$10$abcdef...', 0, NOW(), NOW()),
('João Silva', 'joao@exemplo.com', '$2a$10$ghijkl...', 1, NOW(), NOW()),
('Carlos Pereira', 'carlos@exemplo.com', '$2a$10$mnopqr...', 1, NOW(), NOW()),
('Mariana Lima', 'mariana@exemplo.com', '$2a$10$stuvwx...', 0, NOW(), NOW()),
('Patrícia Ramos', 'patricia@exemplo.com', '$2a$10$qrstuv...', 0, NOW(), NOW());

--Inserção ingredientes
INSERT INTO ingredientes (nome, preco, metrica, usuario_id, data_criacao, data_atualizacao)
VALUES
('Chocolate Granulado', 4.99, 'Kg', 1, NOW(), NOW()),
('Leite Condensado', 7.50, 'L', 2, NOW(), NOW()),
('Farinha de Trigo', 3.20, 'Kg', 1, NOW(), NOW()),
('Manteiga', 6.80, 'Kg', 2, NOW(), NOW()),
('Açúcar Refinado', 2.90, 'Kg', 1, NOW(), NOW());

--Inserção receitas
INSERT INTO receitas (nome, descricao, usuario_id, imagem_url, preco, data_criacao, data_atualizacao)
VALUES
('Casadinho', '2 caixas de leite condensado e 200g de chocolate', 1, '/imagens/casadinho.png', 4.99, NOW(), NOW()),
('Brigadeiro', 'Leite condensado, chocolate em pó e manteiga', 2, '/imagens/brigadeiro.png', 3.50, NOW(), NOW()),
('Beijinho', 'Leite condensado, coco ralado e açúcar cristal para enrolar', 1, '/imagens/beijinho.png', 3.80, NOW(), NOW()),
('Cajuzinho', 'Amendoim moído, chocolate em pó e leite condensado', 2, '/imagens/cajuzinho.png', 4.20, NOW(), NOW()),
('Palha Italiana', 'Bolacha maisena triturada com brigadeiro', 1, '/imagens/palha_italiana.png', 5.50, NOW(), NOW());

--Inserção receitas_ingredientes
INSERT INTO receitas_ingredientes (receita_id, ingrediente_id, quantidade)
VALUES
(1, 1, 200),
(2, 2, 1.5),
(3, 3, 100),
(4, 4, 150),
(5, 5, 120); 

--Inserção clientes
INSERT INTO clientes (nome, email, telefone, endereco, usuario_id, data_criacao, data_atualizacao)
VALUES
('Carlos Mendes', 'carlos@gmail.com', '(49) 9192-7122', 'Av. Papa João XXIII', 1, NOW(), NOW()),
('Mariana Lima', 'mariana@gmail.com', '(49) 9181-3344', 'Rua Blumenau, 123', 2, NOW(), NOW()),
('Lucas Carvalho', 'lucas.carvalho@gmail.com', '(49) 9155-1122', 'Rua Independência, 100', 1, NOW(), NOW()),
('Aline Santos', 'aline.santos@gmail.com', '(49) 9177-3344', 'Rua das Hortênsias, 12', 2, NOW(), NOW()),
('Rafael Torres', 'rafael.torres@gmail.com', '(49) 9133-5566', 'Av. Brasil, 999', 1, NOW(), NOW());

--Inserção pedidos
INSERT INTO pedidos (cliente_id, usuario_id, preco_total, prioridade, margem_lucro, estado, data_criacao, data_atualizacao, data_limite)
VALUES
(1, 1, 4.99, 'Alta', 0.1, 'Aberto', NOW(), NOW(),NOW()),
(2, 2, 7.50, 'Media', 0.15, 'Aberto', NOW(), NOW(),NOW()),
(5, 1, 7.60, 'Media', 0.18, 'Aberto', NOW(), NOW(), NOW()),
(3, 2, 10.50, 'Alta', 0.22, 'Aberto', NOW(), NOW(), NOW()),
(4, 1, 8.25, 'Baixa', 0.15, 'Aberto', NOW(), NOW(), NOW());

--Inserção pedidos_receitas
INSERT INTO pedidos_receitas (pedido_id, receita_id, quantidade, preco_unitario)
VALUES
(1, 1, 10, 4.99),
(2, 2, 20, 3.50),
(5, 4, 2, 4.20),  
(3, 3, 2, 3.80),  
(4, 5, 1, 5.50);  

\echo '--- Finalizando Reset banco sweetiefy_api_db ---'