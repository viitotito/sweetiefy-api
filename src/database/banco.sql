SET client_encoding = 'UTF8'; 

CREATE TYPE metrica_enum AS ENUM ('Kg', 'g', 'L', 'ml', 'unidade', 'mg');

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil SMALLINT NOT NULL CHECK (perfil IN (0,1)), 
    data_criacao TIMESTAMP NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingredientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    preco NUMERIC(5,2) NOT NULL,
    metrica metrica_enum NOT NULL,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    data_criacao TIMESTAMP NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receitas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    imagem_url VARCHAR(255),
    preco NUMERIC(5,2) NOT NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receitas_ingredientes (
    id SERIAL PRIMARY KEY,
    receita_id INT NOT NULL REFERENCES receitas(id),
    ingrediente_id INT NOT NULL REFERENCES ingredientes(id),
    quantidade INT NOT NULL
);

INSERT INTO usuarios (nome, email, senha_hash, perfil, data_criacao, data_atualizacao)
VALUES
('Ana Souza', 'ana@exemplo.com', '$2a$10$abcdef...', 0, NOW(), NOW()),
('João Silva', 'joao@exemplo.com', '$2a$10$ghijkl...', 1, NOW(), NOW()),
('Carlos Pereira', 'carlos@exemplo.com', '$2a$10$mnopqr...', 1, NOW(), NOW()),
('Mariana Lima', 'mariana@exemplo.com', '$2a$10$stuvwx...', 0, NOW(), NOW()),
('Patrícia Ramos', 'patricia@exemplo.com', '$2a$10$qrstuv...', 0, NOW(), NOW());

INSERT INTO ingredientes (nome, preco, metrica, usuario_id, data_criacao, data_atualizacao)
VALUES
('Chocolate Granulado', 4.99, 'Kg', 1, NOW(), NOW()),
('Leite Condensado', 7.50, 'L', 2, NOW(), NOW()),
('Farinha de Trigo', 3.20, 'Kg', 1, NOW(), NOW()),
('Manteiga', 6.80, 'Kg', 2, NOW(), NOW()),
('Açúcar Refinado', 2.90, 'Kg', 1, NOW(), NOW());

INSERT INTO receitas (nome, descricao, usuario_id, imagem_url, preco, data_criacao, data_atualizacao)
VALUES
('Casadinho', '2 caixas de leite condensado e 200g de chocolate', 1, '/imagens/casadinho.png', 4.99, NOW(), NOW()),
('Brigadeiro', 'Leite condensado, chocolate em pó e manteiga', 2, '/imagens/brigadeiro.png', 3.50, NOW(), NOW()),
('Beijinho', 'Leite condensado, coco ralado e açúcar cristal para enrolar', 1, '/imagens/beijinho.png', 3.80, NOW(), NOW()),
('Cajuzinho', 'Amendoim moído, chocolate em pó e leite condensado', 2, '/imagens/cajuzinho.png', 4.20, NOW(), NOW()),
('Palha Italiana', 'Bolacha maisena triturada com brigadeiro', 1, '/imagens/palha_italiana.png', 5.50, NOW(), NOW());

INSERT INTO receitas_ingredientes (receita_id, ingrediente_id, quantidade)
VALUES
(1, 1, 200),
(2, 2, 20),
(3, 3, 100),
(4, 4, 150),
(5, 5, 120); 
