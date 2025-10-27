import { Router } from "express";
import { pool } from "../database/db.js";

const router = Router(); 

const isEstadoValido = (s) => s === "a" || s === "f";

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM ingredientes ORDER BY id DESC"
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

router.get("/:id", async (req, res) => {

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "id inválido" });
  }
  try {
    const { rows } = await pool.query(
      "SELECT * FROM ingredientes WHERE id = $1",
      [id]
    );
    if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
    res.json(rows[0]); 
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

router.post("/", async (req, res) => {

  const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};

  const uid = Number(Usuarios_id);
  const temUidValido = Number.isInteger(uid) && uid > 0;
  const temTextoValido = typeof texto === "string" && texto.trim() !== "";
  const est = estado ?? "a";
  const temEstadoValido = isEstadoValido(est);
  
  if (!temUidValido || !temTextoValido || !temEstadoValido) {
    return res.status(400).json({
      erro:
        "Campos obrigatórios: Usuarios_id (inteiro>0), texto (string) e estado ('a' ou 'f' — se ausente, assume 'a')",
    });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO ingredientes (Usuarios_id, texto, estado, urlImagem)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [uid, texto.trim(), est, urlImagem ?? null]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    if (e?.code === "23503") {
      return res
        .status(400)
        .json({ erro: "Usuarios_id não existe (violação de chave estrangeira)" });
    }
    res.status(500).json({ erro: "erro interno" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "id inválido" });
  }
  const uid = Number(Usuarios_id);
  const temUidValido = Number.isInteger(uid) && uid > 0;
  const temTextoValido = typeof texto === "string" && texto.trim() !== "";
  const temEstadoValido = isEstadoValido(estado);
  if (!temUidValido || !temTextoValido || !temEstadoValido) {
    return res.status(400).json({
      erro:
        "Para PUT, envie todos os campos: Usuarios_id (inteiro>0), texto (string), estado ('a' | 'f') e urlImagem (opcional)",
    });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE ingredientes
         SET Usuarios_id = $1,
             texto       = $2,
             estado      = $3,
             urlImagem   = $4,
             data_atualizacao = now()
       WHERE id = $5
       RETURNING *`,
      [uid, texto.trim(), estado, urlImagem ?? null, id]
    );
    if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
    res.json(rows[0]); 
  } catch (e) {
    if (e?.code === "23503") {
      return res
        .status(400)
        .json({ erro: "Usuarios_id não existe (violação de chave estrangeira)" });
    }
    res.status(500).json({ erro: "erro interno" });
  }
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "id inválido" });
  }

  if (
    Usuarios_id === undefined &&
    texto === undefined &&
    estado === undefined &&
    urlImagem === undefined
  ) {
    return res.status(400).json({ erro: "envie ao menos um campo para atualizar" });
  }

  let uid = null;
  if (Usuarios_id !== undefined) {
    uid = Number(Usuarios_id);
    if (!Number.isInteger(uid) || uid <= 0) {
      return res.status(400).json({ erro: "Usuarios_id deve ser inteiro > 0" });
    }
  }
  let novoTexto = null;
  if (texto !== undefined) {
    if (typeof texto !== "string" || texto.trim() === "") {
      return res.status(400).json({ erro: "texto deve ser string não vazia" });
    }
    novoTexto = texto.trim();
  }
  let novoEstado = null;
  if (estado !== undefined) {
    if (!isEstadoValido(estado)) {
      return res.status(400).json({ erro: "estado deve ser 'a' ou 'f'" });
    }
    novoEstado = estado;
  }

  const novaUrl = urlImagem === undefined ? null : urlImagem;
  try {
    const { rows } = await pool.query(
      `UPDATE ingredientes
         SET Usuarios_id      = COALESCE($1, Usuarios_id),
             texto            = COALESCE($2, texto),
             estado           = COALESCE($3, estado),
             urlImagem        = COALESCE($4, urlImagem),
             data_atualizacao = now()
       WHERE id = $5
       RETURNING *`,
      [uid, novoTexto, novoEstado, novaUrl, id]
    );
    if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
    res.json(rows[0]); 
  } catch (e) {
    if (e?.code === "23503") {
      return res
        .status(400)
        .json({ erro: "Usuarios_id não existe (violação de chave estrangeira)" });
    }
    res.status(500).json({ erro: "erro interno" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "id inválido" });
  }
  try {
    const r = await pool.query(
      "DELETE FROM ingredientes WHERE id = $1 RETURNING id",
      [id]
    );
    if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });
    res.status(204).end(); 
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

router.patch("/:id/fechar", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "id inválido" });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE ingredientes
         SET estado = 'f',
             data_atualizacao = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ erro: "erro interno" });
  }
});

export default router;