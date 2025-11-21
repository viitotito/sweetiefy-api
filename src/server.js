import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import usuariosRouter from "./routes/usuarios.routes.js";
import ingredientesRouter from "./routes/ingredientes.routes.js";
import receitasRouter from "./routes/receitas.routes.js";

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

app.get("/", (_req, res) => {
  res.json({
    USUARIOS: usuariosRoute,
    INGREDIENTE: ingredientesRoute,
    RECEITAS: receitasRoute,
  });
});

app.use("/api/usuarios", usuariosRouter);
app.use("/api/ingredientes", ingredientesRouter);
app.use("/api/receitas", receitasRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
  console.log("Cors configurado para estado permissivo");
});
