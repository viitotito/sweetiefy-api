import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import ingredientesRouter from "./routes/ingredientes.routes.js";
import receitasRouter from "./routes/receitas.routes.js";
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.get("/", (_req, res) => {
  res.json({
    LISTAR_INGREDIENTES: "GET /api/ingredientes",
    MOSTRAR_INGREDIENTES: "GET /api/ingredientes/:id",
    CRIAR_INGREDIENTES: "POST /api/ingredientes  BODY: { Usuarios_id: number, texto: 'string', estado?: 'a'|'f', urlImagem?: 'string' }",
    SUBSTITUIR_INGREDIENTES: "PUT /api/ingredientes/:id  BODY: { Usuarios_id: number, texto: 'string', estado: 'a'|'f', urlImagem?: 'string' }",
    ATUALIZAR_INGREDIENTES: "PATCH /api/ingredientes/:id  BODY: { Usuarios_id?: number, texto?: 'string', estado?: 'a'|'f', urlImagem?: 'string' }",
    DELETAR_INGREDIENTES: "DELETE /api/ingredientes/:id",

    LISTAR_RECEITAS: "GET /api/receitas",
    MOSTRAR_RECEITAS: "GET /api/receitas/:id",
    CRIAR_RECEITAS: "POST /api/receitas  BODY: { Usuarios_id: number, texto: 'string', estado?: 'a'|'f', urlImagem?: 'string' }",
    SUBSTITUIR_RECEITAS: "PUT /api/receitas/:id  BODY: { Usuarios_id: number, texto: 'string', estado: 'a'|'f', urlImagem?: 'string' }",
    ATUALIZAR_RECEITAS: "PATCH /api/receitas/:id  BODY: { Usuarios_id?: number, texto?: 'string', estado?: 'a'|'f', urlImagem?: 'string' }",
    DELETAR_RECEITAS: "DELETE /api/receitas/:id"
  });
});

app.use("/api/ingredientes", ingredientesRouter);
app.use("/api/receitas", receitasRouter);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
  console.log('Cors configurado para estado permissivo');
});
