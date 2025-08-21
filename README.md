
# Sweetiefy

## 💡 Problema 
Muitas vezes confeiteiros possuem problemas na hora de estipular preços para as vendas de seus produtos, seja por conta da inflação dos valores de ingredientes ou por estarem trabalhando com uma margem de lucro muito baixa, podendo consequentemente levar a prejuízos.

Diante disto, o Sweetiefy tem como objetivo auxiliar os vendedores na gestão e precificação de receitas de doces. 

O sistema deve permitir o usuário cadastrar e definir o preço de cada receita, sendo possível também estimar o lucro por cada venda. Seria interessante a implementação de um histórico de vendas, para estimar as vendas realizadas no mês.

O valor de custo por receita também deve ser visualizado e alterado, sendo atualizado ao selecionar os ingredientes para uma determinada receita.

A opção de uma margem de lucro manipulável também é uma possibilidade, ela poderia ajustar ou sugerir um preço ideal para a venda de um determinado doce, visando a margem de lucro escolhida pelo usuário.

## 👥 Atores / Decisores
* Atores: Usuários gerais, confeiteiros.
* Decisores/Apoiadores: Professores; Coordenação do Curso.

## 🛠 Casos de uso
* Usuário: Logar/deslogar, cadastrar, editar, remover usuários.
* Receita: Cadastrar, editar, remover receitas.
* Ingredientes: Cadastrar, editar, remover ingredientes.
* Vendas: Cadastrar, editar, remover, definir taxa, manipular histórico de vendas.
* Clientes: Cadastrar, editar, remover clientes.

## ⌛ Limites e suposições
### Limites
- Entrega até o final da disciplina (2025-11-30);
- Rodar no navegador;
- Sem serviços pagos.

### Suposições
- Internet no laboratório;
- Testes rápidos (10 min no máximo);
- Navegador atualizado;
- Acesso ao repositório no Github.

### Plano B
- Sem internet: Rodar localmente e salvar dados em LocalStorage ou arquivo;
- Sem tempo do professor: Realizar testes com outros 3 usuários.

## ✔️ Hipóteses e validação
H-Valor: Se [X], então [Y] melhora em [critério].
Validação (valor): [teste rápido/observação]; alvo: [meta simples].
H-Viabilidade: Com [tecnologia], [ação/tela] leva até [n] s.
Validação (viabilidade): [medição no protótipo]; meta: [n] s ou menos na maioria das
vezes (ex.: 9/10).

## 📈 Fluxo principal e primeira fatia
**Fluxo principal (curto):**
1) [entrada do usuário] → 2) [processo] → 3) [salvar algo] → 4) [mostrar resultado]
**Primeira fatia vertical (escopo mínimo):**
Inclui: [uma tela], [uma ação principal], [salvar], [mostrar algo]
Critérios de aceite:
- [Condição 1 bem objetiva]
- [Condição 2 bem objetiva]

## 💻 Esboços de algumas telas (wireframes)
[Links ou imagens dos seus rascunhos de telas aqui]

## ⚙️ Tecnologias

### 8.1 Navegador
**Navegador:** [HTML/CSS/JS | React/Vue/Bootstrap/etc., se houver]
**Armazenamento local (se usar):** [LocalStorage/IndexedDB/—]
**Hospedagem:** [GitHub Pages/—]
### 8.2 Front-end (servidor de aplicação, se existir)
**Front-end (servidor):** [ex.: Next.js/React/—]
**Hospedagem:** [ex.: Vercel/—]
### 8.3 Back-end (API/servidor, se existir)
**Back-end (API):** [ex.: FastAPI/Express/PHP/Laravel/Spring/—]
**Banco de dados:** [ex.: SQLite/Postgres/MySQL/MongoDB/—]
**Deploy do back-end:** [ex.: Render/Railway/—]

## 📋 Plano de Dados (Dia 0) — somente itens 1–3

### 9.1 Entidades
- [Entidade 1] — [o que representa em 1 linha]
- [Entidade 2] — [...]
- [Entidade 3] — [...]

### 9.2 Campos por entidade

### Usuario
| Campo | Tipo | Obrigatório | Exemplo |
|-----------------|-------------------------------|-------------|--------------------|
| id | número | sim | 1 |
| nome | texto | sim | "Ana Souza" |
| email | texto | sim (único) | "ana@exemplo.com" |
| senha_hash | texto | sim | "$2a$10$..." |
| papel | número (0=aluno, 1=professor) | sim | 0 |
| dataCriacao | data/hora | sim | 2025-08-20 14:30 |
| dataAtualizacao | data/hora | sim | 2025-08-20 15:10 |
### Chamado
| Campo | Tipo | Obrigatório | Exemplo |
|-----------------|--------------------|-------------|-------------------------|
| id | número | sim | 2 |
| Usuario_id | número (fk) | sim | 8f3a-... |
| texto | texto | sim | "Erro ao compilar" |
| estado | char | sim | 'a' \| 'f' |
| dataCriacao | data/hora | sim | 2025-08-20 14:35 |
| dataAtualizacao | data/hora | sim | 2025-08-20 14:50 |

### 9.3 Relações entre entidades
- Um [A] tem muitos [B]. (1→N)
- Um [B] pertence a um [A]. (N→1)

