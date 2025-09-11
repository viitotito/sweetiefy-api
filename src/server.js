import express from "express";
import dotenv from "dotenv";
import ingredientesRouter from "./routes/ingredientes.routes.js";
dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    LISTAR:     "GET /api/ingredientes",
    MOSTRAR:    "GET /api/ingredientes/:id",
    CRIAR:      "POST /api/ingredientes  BODY: { Usuarios_id: number, texto: 'string', estado?: 'a'|'f', urlImagem?: 'string' }",
    SUBSTITUIR: "PUT /api/ingredientes/:id  BODY: { Usuarios_id: number, texto: 'string', estado: 'a'|'f', urlImagem?: 'string' }",
    ATUALIZAR:  "PATCH /api/ingredientes/:id  BODY: { Usuarios_id?: number, texto?: 'string', estado?: 'a'|'f', urlImagem?: 'string' }",
    DELETAR:    "DELETE /api/ingredientes/:id",
  });
});

app.use("/api/ingredientes", ingredientesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
