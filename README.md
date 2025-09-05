
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
* Usuários: Logar/deslogar, cadastrar, editar, remover usuários.
* Receitas: Cadastrar, editar, remover receitas.
* Ingredientes: Cadastrar, editar, remover ingredientes.
* Pedidos: Cadastrar, editar, remover, definir taxa, manipular histórico de vendas.
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
Valor: Se o usuário visualiza os ingredientes cadastrados, consegue organizar melhor suas receitas.

Validação: Teste com 4 usuários distintos em máquinas diferentes. Sucesso caso 3≥ conseguem visualizar os registros corretamente.

Viabilidade: Medição no protótipo com 20 ações diferentes, atendendo no mínimo 17/20 (9/10)ações com no máximo 1s de resposta.

## 📈 Fluxo principal e primeira fatia
**Fluxo principal (curto):**
1) Usuário entra no site;
2) Usuário faz login ou cadastro;
3) Usuário clica em adicionar ingredientes;
4) Usuário salva os ingredientes;
5) Ingredientes são exibidos ao usuário.

## 💻 Esboços de algumas telas (wireframes)
[Links ou imagens dos seus rascunhos de telas aqui]

## ⚙️ Tecnologias

### 8.1 Navegador
**Navegador:** [HTML/CSS/JS/Bootstrap]

**Armazenamento local (se usar):** [LocalStorage]

**Hospedagem:** [GitHub Pages]

### 8.2 Front-end (servidor de aplicação, se existir)
**Front-end (servidor):** [React]

**Hospedagem:** [GitHub Pages]

### 8.3 Back-end (API/servidor, se existir)
**Back-end (API):** [Javascript + Express]

**Banco de dados:** [Postgres/MySQL]

**Deploy do back-end:** [Render] "Verificando possibilidades de uso"

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
| papel | número (0=comum, 1=administrador) | sim | 0 |
| dataCriacao | data/hora | sim | 2025-08-20 14:30 |
| dataAtualizacao | data/hora | sim | 2025-08-20 15:10

### Ingredientes
| Campo | Tipo | Obrigatório | Exemplo |
|-----------------|--------------------|-------------|-------------------------|
| id | número | sim | 2 |
| nome | texto | sim | "Granulado" |
| preco | número | sim | 4,99|
| metrica | char | sim | "kg" |
| quantidade | número | sim | 3 |

### Receitas
| Campo | Tipo | Obrigatório | Exemplo |
|-----------------|--------------------|-------------|-------------------------|
| id | número | sim | 2 |
| nome | texto | sim | "Casadinho" |
| descricao | texto | não | "2 caixas de leite condensado..." |
| Ingredientes_id | número (fk) | sim | 1,3,2 |
| urlImagem | texto | não | /imagem/doce.png |
| preco | número | sim | 4,99|
| tipo | char | sim | "kg" |

### Cliente
| Campo | Tipo | Obrigatório | Exemplo |
|-----------------|--------------------|-------------|-------------------------|
| id | número | sim | 4 |
| nome | texto | sim | "Ana" |
| email | texto | sim |  |
| telefone | número | sim | 4,99|

### Pedidos
| Campo | Tipo | Obrigatório | Exemplo |
|-----------------|--------------------|-------------|-------------------------|
| id | número | sim | 2 |
| Receitas_id | número (fk) | sim | 1,3,2 |
| preco_total | número | sim | 4,99 |
| prioridade | char | 'b','m','a' | 'a' |
| margem_lucro | número | sim | (10%) 0.1 |
| estado | char | sim | 0aberto, fechado |
| dataCriacao | data/hora | 

### 9.3 Relações entre entidades
- Um [A] tem muitos [B]. (1→N)
- Um [B] pertence a um [A]. (N→1)

