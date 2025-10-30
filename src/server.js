import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import ingredientesRouter from "./routes/ingredientes.routes.js";
import receitasRouter from "./routes/receitas.routes.js";
import clientesRouter from "./routes/clientes.routes.js";
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const ingredientesRoute = {
  LISTAR_INGREDIENTES: "GET /api/ingredientes",
  MOSTRAR_INGREDIENTES: "GET /api/ingredientes/:id",
  CRIAR_INGREDIENTES:
    "POST /api/ingredientes  BODY: { nome: 'string', preco: number, metrica: 'metrica_enum', usuario_id: number }",
  SUBSTITUIR_INGREDIENTES:
    "PUT /api/ingredientes/:id  BODY: { nome: 'string', preco: number, metrica: 'metrica_enum', usuario_id: number }",
  ATUALIZAR_INGREDIENTES:
    "PATCH /api/ingredientes/:id  BODY: { nome: 'string', preco: number, metrica: 'metrica_enum', usuario_id: number }",
  DELETAR_INGREDIENTES: "DELETE /api/ingredientes/:id",
};

const receitasRoute = {
  LISTAR_RECEITAS: "GET /api/receitas",
  MOSTRAR_RECEITAS: "GET /api/receitas/:id",
  CRIAR_RECEITAS:
    "POST /api/receitas  BODY: { nome: 'string', descricao?: 'string', usuario_id: number, imagem_url?: 'string', preco: number }",
  SUBSTITUIR_RECEITAS:
    "PUT /api/receitas/:id  BODY: {  nome: 'string', descricao?: 'string', usuario_id: number, imagem_url?: 'string', preco: number }",
  ATUALIZAR_RECEITAS:
    "PATCH /api/receitas/:id  BODY: {  nome: 'string', descricao?: 'string', usuario_id: number, imagem_url?: 'string', preco: number }",
  DELETAR_RECEITAS: "DELETE /api/receitas/:id",
};

const clientesRoute = {
  LISTAR_CLIENTES: "GET /api/clientes",
  MOSTRAR_CLIENTES: "GET /api/clientes/:id",
  CRIAR_CLIENTES:
    "POST /api/clientes  BODY: { nome: 'string', email: 'string', telefone: 'string', endereco?: 'string', usuario_id: number }",
  SUBSTITUIR_CLIENTES:
    "PUT /api/clientes/:id  BODY: { nome: 'string', email: 'string', telefone: 'string', endereco?: 'string', usuario_id: number }",
  ATUALIZAR_CLIENTES:
    "PATCH /api/clientes/:id  BODY: { nome: 'string', email: 'string', telefone: 'string', endereco?: 'string', usuario_id: number }",
  DELETAR_CLIENTES: "DELETE /api/clientes/:id",
};

app.get("/", (_req, res) => {
  res.json({
    INGREDIENTE: ingredientesRoute,
    RECEITAS: receitasRoute,
    CLIENTES: clientesRoute
  });
});

app.use("/api/ingredientes", ingredientesRouter);
app.use("/api/receitas", receitasRouter);
app.use("/api/clientes", clientesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
  console.log("Cors configurado para estado permissivo");
});
