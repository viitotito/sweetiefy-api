import { Router } from "express";
import { pool } from "../database/db.js";

const router = Router();

function parseIdParam(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getAuthInfo(req, res) {
  const uid = req.user?.id;
  const isAdmin = Number(req.user?.perfil) === 1;

  if (!uid) {
    res.status(401).json({ erro: "Usuário não autenticado." });
    return null;
  }

  return { uid, isAdmin };
}

async function obterIngredientePorId(id) {
  console.log("ID recebido:", id);
  const { rows } = await pool.query(
    `SELECT id, nome, preco, metrica, usuario_id, data_criacao, data_atualizacao
     FROM ingredientes
     WHERE id = $1`,
    [id]
  );
  console.log("Resultado da query:", rows);
  return rows[0] ?? null;
}

router.get("/", async (req, res) => {
  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  try {
    let query = `
      SELECT id, nome, preco, metrica, usuario_id, data_criacao, data_atualizacao
      FROM ingredientes
    `;

    const params = [];

    if (!isAdmin) {
      query += ` WHERE usuario_id = $1`;
      params.push(uid);
    }

    query += ` ORDER BY nome ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);

  } catch (e) {
    console.error("Erro ao listar ingredientes:", e);
    res.status(500).json({ erro: "Erro ao listar ingredientes." });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  try {
    const ingrediente = await obterIngredientePorId(id);

    if (!ingrediente) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    if (!isAdmin && ingrediente.usuario_id !== uid) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    res.json(ingrediente);

  } catch (e) {
    console.error("Erro ao buscar ingrediente:", e);
    res.status(500).json({ erro: "Erro ao buscar ingrediente." });
  }
});

router.post("/", async (req, res) => {
  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid } = auth;

  const { nome, preco, metrica } = req.body ?? {};

  const temNome = typeof nome === "string" && nome.trim().length > 0;
  const precoNum = Number(preco);
  const temPreco = typeof precoNum === "number" && !Number.isNaN(precoNum) && precoNum >= 0;
  const temMetrica = typeof metrica === "string" && metrica.trim().length > 0;

  if (!temNome || !temPreco || !temMetrica) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome (string não vazia), preco (número >= 0) e metrica (string não vazia).",
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO ingredientes (nome, preco, metrica, usuario_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, preco, metrica, usuario_id, data_criacao, data_atualizacao`,
      [nome.trim(), precoNum, metrica.trim(), uid]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Erro ao criar ingrediente (POST):", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível criar ingrediente." });
  }
});

router.put("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID do ingrediente inválido." });
  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  const { nome, preco, metrica } = req.body ?? {};

  const temNome = typeof nome === "string" && nome.trim().length > 0;
  const precoNum = Number(preco);
  const temPreco = typeof precoNum === "number" && !Number.isNaN(precoNum) && precoNum >= 0;
  const temMetrica = typeof metrica === "string" && metrica.trim().length > 0;

  if (!temNome || !temPreco || !temMetrica) {
    return res.status(400).json({
      erro: "Para PUT, envie nome (string não vazia), preco (número >= 0) e metrica (string não vazia).",
    });
  }

  try {
    const ingrediente = await obterIngredientePorId(id);
    if (!ingrediente) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    if (!isAdmin && ingrediente.usuario_id !== uid) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    const { rows } = await pool.query(
      `UPDATE ingredientes
       SET nome = $1, preco = $2, metrica = $3, data_atualizacao = now()
       WHERE id = $4
       RETURNING id, nome, preco, metrica, usuario_id, data_atualizacao`,
      [nome.trim(), precoNum, metrica.trim(), id]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao atualizar ingrediente (PUT):", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível atualizar ingrediente." });
  }
});

router.patch("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID do ingrediente inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  const { nome, preco, metrica } = req.body ?? {};

  if (nome === undefined && preco === undefined && metrica === undefined) {
    return res.status(400).json({
      erro: "Envie ao menos um campo para atualizar.",
    });
  }

  try {
    const ingrediente = await obterIngredientePorId(id);
    if (!ingrediente) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    if (!isAdmin && ingrediente.usuario_id !== uid) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (nome !== undefined) {
      if (typeof nome !== "string" || nome.trim() === "") {
        return res.status(400).json({ erro: "Campo 'nome' deve ser string não vazia." });
      }
      updates.push(`nome = $${idx++}`);
      params.push(nome.trim());
    }

    if (preco !== undefined) {
      const pnum = Number(preco);
      if (Number.isNaN(pnum) || pnum < 0) {
        return res.status(400).json({ erro: "Campo 'preco' deve ser número >= 0." });
      }
      updates.push(`preco = $${idx++}`);
      params.push(pnum);
    }

    if (metrica !== undefined) {
      if (typeof metrica !== "string" || metrica.trim() === "") {
        return res.status(400).json({ erro: "Campo 'metrica' deve ser string não vazia." });
      }
      updates.push(`metrica = $${idx++}`);
      params.push(metrica.trim());
    }

    updates.push(`data_atualizacao = now()`);

    const sql = `
      UPDATE ingredientes
      SET ${updates.join(", ")}
      WHERE id = $${idx}
      RETURNING id, nome, preco, metrica, usuario_id, data_atualizacao
    `;

    params.push(id);

    const { rows } = await pool.query(sql, params);

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao atualizar ingrediente (PATCH):", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível atualizar ingrediente." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID do ingrediente inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  try {
    const ingrediente = await obterIngredientePorId(id);
    if (!ingrediente) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    if (!isAdmin && ingrediente.usuario_id !== uid) {
      return res.status(403).json({ erro: "Você não tem permissão para excluir este ingrediente." });
    }

    await pool.query(
      `DELETE FROM ingredientes WHERE id = $1`,
      [id]
    );

    res.status(204).end();

  } catch (e) {
    console.error("Erro ao deletar ingrediente:", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível remover ingrediente."
    });
  }
});

export default router;
