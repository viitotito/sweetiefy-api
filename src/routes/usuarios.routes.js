import { Router } from "express";
import { pool } from "../database/db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, email, senha_hash, perfil, data_criacao, data_atualizacao 
             FROM usuarios 
             ORDER BY nome ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error("Erro ao listar usuários (GET):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível listar usuários.",
    });
  }
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID do usuário inválido." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, nome, email, senha_hash, perfil, data_criacao, data_atualizacao 
             FROM usuarios
             WHERE id = $1`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao buscar usuário (GET:id):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível buscar usuário.",
    });
  }
});

router.post("/", async (req, res) => {
  const { nome, email, senha_hash, perfil } = req.body ?? {};
  const temNomeValido = typeof nome === "string" && nome.trim().length > 0;
  const temEmailValido = typeof email === "string" && email.trim().length > 0;
  const temSenhaValida =
    typeof senha_hash === "string" && senha_hash.trim().length > 0;
  const temPerfilValido =
    typeof perfil === "number" && perfil >= 0 && perfil <= 1;

  if (!temNomeValido || !temEmailValido || !temSenhaValida || !temPerfilValido) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome (string), email (string), senha_hash (string) e perfil (number (0,1)).",
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nome, email, senha_hash, perfil, data_criacao, data_atualizacao`,
      [nome.trim(), email.trim(), senha_hash.trim(), perfil]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Erro ao criar usuário (POST):", e);
    res.status(500).json({
      erro: "Erro ao criar usuário. Verifique se os campos são válidos.",
    });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, email, senha_hash, perfil } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID do usuário inválido." });
  }
  
  const temNomeValido = typeof nome === "string" && nome.trim().length > 0;
  const temEmailValido = typeof email === "string" && email.trim().length > 0;
  const temSenhaValida =
    typeof senha_hash === "string" && senha_hash.trim().length > 0;
  const temPerfilValido =
    typeof perfil === "number" && perfil >= 0 && perfil <= 1;

  if (!temNomeValido || !temEmailValido || !temSenhaValida || !temPerfilValido) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome (string), email (string), senha_hash (string) e perfil (number (0,1)).",
    });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE usuarios
                 SET nome = $1,
                     email = $2,
                     senha_hash = $3,
                     perfil = $4,
                     data_atualizacao = now()
             WHERE id = $5
             RETURNING id, nome, email, perfil, perfil, data_atualizacao`,
      [nome.trim(), email.trim(), senha_hash.trim(), perfil, id]
    );

    if (!rows[0]) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao atualizar usuário (PUT):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível atualizar usuário.",
    });
  }
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, email, senha_hash, perfil } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID do usuário inválido." });
  }

  if (
    nome === undefined &&
    email === undefined &&
    senha_hash === undefined &&
    perfil === undefined
  ) {
    return res
      .status(400)
      .json({ erro: "Envie ao menos um campo para atualizar." });
  }

  const updates = [];
  const values = [id];
  let paramIndex = 2;

  if (nome !== undefined) {
    if (typeof nome !== "string" || nome.trim() === "") {
      return res
        .status(400)
        .json({ erro: "Campo 'nome' deve ser string não vazia." });
    }
    updates.push(`nome = $${paramIndex++}`);
    values.push(nome.trim());
  }

  
  if (email !== undefined) {
    if (typeof email !== "string" || nome.trim() === "") {
      return res
        .status(400)
        .json({ erro: "Campo 'email' deve ser string não vazia." });
    }
    updates.push(`nome = $${paramIndex++}`);
    values.push(nome.trim());
  }

  
  if (senha_hash !== undefined) {
    if (typeof senha_hash !== "string" || nome.trim() === "") {
      return res
        .status(400)
        .json({ erro: "Campo 'senha_hash' deve ser string não vazia." });
    }
    updates.push(`nome = $${paramIndex++}`);
    values.push(nome.trim());
  }

  if (perfil !== undefined) {
    const p = Number(perfil);
    if (typeof perfil !== "number" || p < 0 && p > 1) {
      return res
        .status(400)
        .json({ erro: "Campo 'perfil' deve ser 1 ou 0." });
    }
    updates.push(`perfil = $${paramIndex++}`);
    values.push(p);
  }
  updates.push(`data_atualizacao = now()`);

  try {
    const query = `
            UPDATE usuarios
            SET ${updates.join(", ")}
            WHERE id = $1
            RETURNING id, nome, email, senha_hash perfil, data_atualizacao`;

    const { rows } = await pool.query(query, values);

    if (!rows[0]) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao atualizar usuário (PATCH):", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível atualizar parcialmente o usuário." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID do usuário inválido." });
  }

  try {
    const r = await pool.query(
      `DELETE FROM usuarios WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!r.rowCount) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.status(204).end();
  } catch (e) {
    console.error("Erro ao deletar usuário (DELETE):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível deletar usuário.",
    });
  }
});

export default router;
