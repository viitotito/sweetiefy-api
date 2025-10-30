import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import usuariosRouter from "./routes/usuarios.routes.js";
import ingredientesRouter from "./routes/ingredientes.routes.js";
import receitasRouter from "./routes/receitas.routes.js";
import clientesRouter from "./routes/clientes.routes.js";
import pedidosRouter from "./routes/pedidos.routes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const usuariosRoute = {
  LISTAR_USUARIOS: "GET /api/usuarios",
  MOSTRAR_USUARIOS: "GET /api/usuarios/:id",
  CRIAR_USUARIOS:
    "POST /api/usuarios  BODY: { nome: 'string', email: 'string', senha: 'string', perfil: number(0,1) }",
  SUBSTITUIR_USUARIOS:
    "PUT /api/usuarios/:id  BODY: { nome: 'string', email: 'string', senha: 'string', perfil: number(0,1) }",
  ATUALIZAR_USUARIOS:
    "PATCH /api/usuarios/:id  BODY: { nome: 'string', email: 'string', senha: 'string', perfil: number(0,1) }",
  DELETAR_USUARIOS: "DELETE /api/usuarios/:id",
};

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

const pedidosRoute = {
  LISTAR_PEDIDOS: "GET /api/pedidos",
  MOSTRAR_PEDIDOS: "GET /api/pedidos/:id",
  CRIAR_PEDIDOS:
    "POST /api/pedidos  BODY: { nome: 'string', email: 'string', telefone: 'string', endereco?: 'string', usuario_id: number }",
  SUBSTITUIR_PEDIDOS:
    "PUT /api/pedidos/:id  BODY: { nome: 'string', email: 'string', telefone: 'string', endereco?: 'string', usuario_id: number }",
  ATUALIZAR_PEDIDOS:
    "PATCH /api/pedidos/:id  BODY: { nome: 'string', email: 'string', telefone: 'string', endereco?: 'string', usuario_id: number }",
  DELETAR_PEDIDOS: "DELETE /api/pedidos/:id",
};

app.get("/", (_req, res) => {
  res.json({
    USUARIOS: usuariosRoute,
    INGREDIENTE: ingredientesRoute,
    RECEITAS: receitasRoute,
    CLIENTES: clientesRoute,
    PEDIDOS: pedidosRoute
  });
});

app.use("/api/usuarios", usuariosRouter);
app.use("/api/ingredientes", ingredientesRouter);
app.use("/api/receitas", receitasRouter);
app.use("/api/clientes", clientesRouter);
app.use("/api/pedidos", pedidosRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
  console.log("Cors configurado para estado permissivo");
});
