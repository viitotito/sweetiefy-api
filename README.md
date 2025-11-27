# 🍬 Sweetiefy
> O espaço ideal para gerenciar seus quitutes.

[![Node.js](https://img.shields.io/badge/node-%3E%3D16-green)](#) [![License](https://img.shields.io/badge/license-MIT-blue)](#)

## Sumário

1. [Introdução](#introdução)
2. [Problema](#problema)
3. [Objetivo](#objetivo)
4. [Atores](#atores)
5. [Funcionalidades](#funcionalidades)
6. [Tecnologias](#tecnologias)
7. [Modelo de Dados](#modelo-de-dados)
8. [Rodando Localmente](#rodando-localmente)
9. [Endpoints](#endpoints)
10. [Comandos](#comandos)
11. [Erros](#erros)
12. [Licença](#licença)

---
## Introdução
`Sweetiefy-api` é uma API criada com [node.js](https://nodejs.org/pt) + [express](https://expressjs.com/) para gerenciar receitas pessoais.

---

## Problema 
Muitas vezes confeiteiros possuem problemas na hora de estipular preços para as vendas de seus produtos, seja por conta da inflação dos valores de ingredientes ou por estarem trabalhando com uma margem de lucro muito baixa, podendo consequentemente levar a prejuízos.

---
## Objetivo
O Sweetiefy tem como objetivo auxiliar os vendedores na gestão e precificação de receitas de doces. 

---
## Atores
* **Usuários gerais**: criar, editar, excluir e visualizar seus ingredientes e receitas.
* **Administradores**: criar, editar, excluir e visualizar todos os ingredientes, receitas e usuários.

---
## Funcionalidades
- **Autenticação (email/senha)**
- **Perfis (user/admin)**
- **Listagem, edição, criação e exclusão de ingredientes.**
- **Listagem, edição, criação e exclusão de receitas.**
- **Listagem, edição e exclusão de usuários (admin).**

Critérios de aceite: logar no sistema como usuário → criar ingrediente → ingrediente aparece com informações → logar no sistema como administrador → editar ingrediente → o ingrediente tem sua informação alterada.

---

## Tecnologias

### Front-end 
- **Front-end (servidor):** [React](https://react.dev/) + [Bootstrap](https://getbootstrap.com/)
- **Hospedagem:** [Vercel](https://vercel.com/)

---
### Back-end
- **Back-end (API):** [Node.js](https://nodejs.org/pt) + [Express](https://expressjs.com/)
- **Deploy do back-end:** [Render](https://render.com/)

---
### Banco de dados
- **Banco de Dados:** [Postgres](https://www.postgresql.org/)
- **Instância do provedor:** [Render](https://render.com/)

---

## Modelo de Dados
<details>
     <summary>Comandos DDL</summary>

```sql
--Enum para métricas
CREATE TYPE metrica_enum AS ENUM ('Kg', 'g', 'L', 'ml', 'unidade', 'mg');

--Criação da tabela usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil SMALLINT NOT NULL CHECK (perfil IN (0,1)), 
    data_criacao TIMESTAMP NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMP NOT NULL DEFAULT now()
);

--Criação da tabela ingredientes
CREATE TABLE IF NOT EXISTS ingredientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    preco NUMERIC(5,2) NOT NULL,
    metrica metrica_enum NOT NULL,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    data_criacao TIMESTAMP NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT unique_usuario_ingrediente UNIQUE(usuario_id, nome)
);

--Criação da tabela receitas
CREATE TABLE IF NOT EXISTS receitas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL UNIQUE,
    descricao VARCHAR(255),
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    imagem_url VARCHAR(255),
    preco NUMERIC(5,2) NOT NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT unique_usuario_receita UNIQUE(usuario_id, nome)
);

--Criação da tabela auxiliar receitas_ingredientes
CREATE TABLE IF NOT EXISTS receitas_ingredientes (
    id SERIAL PRIMARY KEY,
    receita_id INT NOT NULL REFERENCES receitas(id),
    ingrediente_id INT NOT NULL REFERENCES ingredientes(id),
    quantidade INT NOT NULL
);
```
</details>

<details>
     <summary>Comandos DML</summary>
    
```sql

--Inserção usuários
INSERT INTO usuarios (nome, email, senha_hash, perfil)
VALUES
('User', 'user@user.com', '$2b$12$lrXlY35ejtBP...jVXu6iI17Fw...', 0),
('Admin', 'admin@admin.com', '$2b$12$nOa54B81W12o3d46D...9NDXzTyJ5nMWtkK...', 1);

--Inserção ingredientes
INSERT INTO ingredientes (nome, preco, metrica, usuario_id)
VALUES
('Chocolate Granulado', 4.99, 'Kg', 1),
('Leite Condensado', 7.50, 'L', 2),
('Farinha de Trigo', 3.20, 'Kg', 1),
('Manteiga', 6.80, 'Kg', 2),
('Açúcar Refinado', 2.90, 'Kg', 1);

--Inserção receitas
INSERT INTO receitas (nome, descricao, usuario_id, imagem_url, preco)
VALUES
('Casadinho', '2 caixas de leite condensado e 200g de chocolate', 1, '/uploads/1764215136287-531151868.png', 4.99),
('Brigadeiro', 'Leite condensado, chocolate em pó e manteiga', 2, '/uploads/17642315136287-531151868.png', 3.50),
('Beijinho', 'Leite condensado, coco ralado e açúcar cristal para enrolar', 1, '/uploads/1763235136287-531151868.png', 3.80),
('Cajuzinho', 'Amendoim moído, chocolate em pó e leite condensado', 2, '/uploads/1764215321287-531151868.png', 4.20),
('Palha Italiana', 'Bolacha maisena triturada com brigadeiro', 1, '/uploads/1761554236287-52351868.png', 5.50);


--Inserção receitas_ingredientes
INSERT INTO receitas_ingredientes (receita_id, ingrediente_id, quantidade)
VALUES
(1, 1, 2),
(2, 2, 1),
(3, 3, 4),
(4, 4, 3),
(5, 5, 4); 
```
</details>

<details>
     <summary>Comandos DQL</summary>

```sql
--Listando receita e usuário que cadastrou
SELECT r.id, r.nome AS receita, r.descricao, r.preco, u.nome AS usuario
FROM receitas r
JOIN usuarios u ON r.usuario_id = u.id;

--Listar por ingrediente específico
SELECT r.nome AS receita, r.descricao
FROM receitas r
JOIN receitas_ingredientes ri ON r.id = ri.receita_id
JOIN ingredientes i ON ri.ingrediente_id = i.id
WHERE i.nome = 'Leite Condensado';

--Usuários que cadastraram mais de uma receita
SELECT u.nome, COUNT(r.id) AS total_receitas
FROM usuarios u
JOIN receitas r ON u.id = r.usuario_id
GROUP BY u.nome
HAVING COUNT(r.id) > 1;
```
</details>

---
## Rodando Localmente
### Pré-requisitos
- [Node.Js Download](https://www.nodejs.tech/pt-br/download)
- [PostgreSQL Download](https://www.postgresql.org/download/)

---
1. Clone o repositório
```bash
git clone https://github.com/viitotito/sweetiefy-api.git
cd sweetiefy-api
```
---
2. Copie o `.env.example` para `.env` e ajuste as variáveis (ex.: DB_HOST, DB_USER, DB_PASSWORD, PORT).
```bash
copy .env.example .env
```
---
3. Instale dependências
```bash
npm install
```
---
4. Crie banco e tabelas
```bash
npm run reset-database
```
---
5. Rode em modo desenvolvimento
```bash
npm run dev
```
---

## Endpoints

> Rota base: `http://localhost:<PORT>/api`

### Usuários

* `POST /api/register` — registra usuário (body: `{ nome, email, senha }`)
* `POST /api/login` — autentica usuário (body: `{ email, senha }`) → retorna token de acesso
* `POST /api/refresh` — renova o token de acesso através do refresh token no cookie → retorna novo token de acesso
* `POST /api/logout` — encerra a sessão do usuário → limpa o refresh token no cookie

* `GET /api/usuarios` — lista usuários
* `GET /api/usuarios/:id` — visualiza usuário
* `PATCH /api/usuarios/:id` — atualiza parcialmente usuário (body: `{ nome, email, perfil, senha }`)
* `DELETE /api/usuarios` — deleta usuário 

### Ingredientes

* `GET /api/ingredientes` — lista ingredientes
* `GET /api/ingredientes/:id` — visualiza ingrediente
* `POST /api/ingredientes` — cria ingrediente (body: `{ nome, preco, metrica }`)
* `PUT /api/ingredientes/:id` — atualiza ingrediente (body: `{ nome, preco, metrica }`)
* `PATCH /api/ingredientes/:id` — atualiza parcialmente ingrediente (body: `{ nome, preco, metrica }`)
* `DELETE /api/ingredientes/:id` — deleta ingrediente

### Receitas

* `GET /api/receitas` — lista ingredientes
* `GET /api/receitas/:id` — visualiza receita
* `POST /api/receitas` — cria receita (body: `{ nome, descricao?, preco, imagem_url?, ingredientes}`)
* `PUT /api/receitas/:id` — atualiza receita (body: `{ nome, descricao?, preco, imagem_url?, ingredientes}`)
* `PATCH /api/receitas/:id` — atualiza parcialmente receita (body: `{ nome, descricao?, preco, imagem_url?, ingredientes}`)
* `DELETE /api/receitas/:id` — deleta receita
  
**Resposta de erro padrão**:

```json
{ "erro": "problema explicado" }
```

---

## Comandos

* `npm run dev` — roda em modo desenvolvimento
* `npm run reset-database` — cria/zera banco

---

## Erros

* Conexão com banco → ver arquivo `.env` na raiz do projeto (host/port/user/senha).
* Arquivo `.env` não existe na raiz do projeto → criar arquivo `.env` na raiz do projeto com base no arquivo `.env.example`

---

## Licença

MIT — sinta-se à vontade para usar/estudar o projeto. Modifique conforme necessidade.
