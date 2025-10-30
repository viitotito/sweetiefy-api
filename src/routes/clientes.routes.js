import { Router } from "express";
import { pool } from "../database/db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, email, telefone, endereco, usuario_id, data_criacao, data_atualizacao 
             FROM clientes 
             ORDER BY nome ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error("Erro ao listar clientes (GET):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível listar clientes.",
    });
  }
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID do cliente inválido." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, nome, email, telefone, endereco, usuario_id, data_criacao, data_atualizacao 
             FROM clientes 
             WHERE id = $1`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao buscar cliente (GET:id):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível buscar cliente.",
    });
  }
});

router.post("/", async (req, res) => {
  const { nome, email, telefone, endereco, usuario_id } = req.body ?? {};

  const uid = Number(usuario_id);
  const temUidValido = Number.isInteger(uid) && uid > 0;
  const temNomeValido = typeof nome === "string" && nome.trim().length > 0;
  const temEmailValido =
    typeof email === "string" && endereco.trim().length > 0;
  const temTelefoneValido =
    typeof telefone === "string" && endereco.trim().length > 0;
  const temEnderecoValido = typeof endereco === "string";

  if (
    !temNomeValido ||
    !temEmailValido ||
    !temTelefoneValido ||
    !temEnderecoValido ||
    !temUidValido
  ) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome (string), email (string), telefone (string) e usuario_id (number > 0).",
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO clientes (nome, email, telefone, endereco, usuario_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, nome, email, telefone, endereco, usuario_id, data_criacao, data_atualizacao`,
      [nome.trim(), email.trim(), telefone.trim(), endereco?.trim(), uid]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Erro ao criar cliente (POST):", e);
    res.status(500).json({
      erro: "Erro ao criar cliente. Verifique se o usuário existe e os campos são válidos.",
    });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, email, telefone, endereco, usuario_id } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID do cliente inválido." });
  }

  const uid = Number(usuario_id);
  const temUidValido = Number.isInteger(uid) && uid > 0;
  const temNomeValido = typeof nome === "string" && nome.trim().length > 0;
  const temEmailValido =
    typeof email === "string" && endereco.trim().length > 0;
  const temTelefoneValido =
    typeof telefone === "string" && endereco.trim().length > 0;
  const temEnderecoValido = typeof endereco === "string";

  if (
    !temNomeValido ||
    !temEmailValido ||
    !temTelefoneValido ||
    !temEnderecoValido ||
    !temUidValido
  ) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome (string), email (string), telefone (string) e usuario_id (number > 0).",
    });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE ingredientes
                 SET nome = $1,
                     preco = $2,
                     metrica = $3,
                     usuario_id = $4,
                     data_atualizacao = now()
             WHERE id = $5
             RETURNING id, nome, preco, metrica, usuario_id, data_atualizacao`,
      [nome.trim(), preco, metrica.trim(), uid, id]
    );

    if (!rows[0]) {
      return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao atualizar cliente (PUT):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível atualizar cliente.",
    });
  }
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, email, telefone, endereco, usuario_id } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID do cliente inválido." });
  }

  if (
    nome === undefined &&
    preco === undefined &&
    metrica === undefined &&
    usuario_id === undefined
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
    if (typeof nome !== "string" || nome.trim() === "") {
      return res
        .status(400)
        .json({ erro: "Campo 'email' deve ser string não vazia." });
    }
    updates.push(`email = $${paramIndex++}`);
    values.push(nome.trim());
  }

  if (telefone !== undefined) {
    if (typeof nome !== "string" || nome.trim() === "") {
      return res
        .status(400)
        .json({ erro: "Campo 'telefone' deve ser string não vazia." });
    }
    updates.push(`telefone = $${paramIndex++}`);
    values.push(nome.trim());
  }

  if (endereco !== undefined) {
    if (typeof endereco !== "string") {
      return res
        .status(400)
        .json({ erro: "Campo 'endereco' deve ser string." });
    }
    updates.push(`endereco = $${paramIndex++}`);
    values.push(nome.trim());
  }

  if (usuario_id !== undefined) {
    const uid = Number(usuario_id);
    if (!Number.isInteger(uid) || uid <= 0) {
      return res
        .status(400)
        .json({ erro: "Campo 'usuario_id' deve ser inteiro > 0." });
    }
    updates.push(`usuario_id = $${paramIndex++}`);
    values.push(uid);
  }

  updates.push(`data_atualizacao = now()`);

  try {
    const query = `
            UPDATE clientes
            SET ${updates.join(", ")}
            WHERE id = $1
            RETURNING id, nome, email, telefone, endereco, usuario_id, data_atualizacao`;

    const { rows } = await pool.query(query, values);

    if (!rows[0]) {
      return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao atualizar cliente (PATCH):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível atualizar cliente parcialmente.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID do cliente inválido." });
  }

  try {
    const r = await pool.query(
      `DELETE FROM clientes WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!r.rowCount) {
      return res.status(404).json({ erro: "Cliente não encontrado." });
    }

    res.status(204).end();
  } catch (e) {
    console.error("Erro ao deletar cliente (DELETE):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível deletar cliente (verifique fk).",
    });
  }
});

export default router;
