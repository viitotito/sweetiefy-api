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
    res.status(401).json({ erro: "Usuário não está autenticado." });
    return null;
  }

  return { uid, isAdmin };
}

async function obterIngredientePorId(id) {
  const { rows } = await pool.query(
    `SELECT id, nome, preco, metrica, usuario_id, data_criacao, data_atualizacao
     FROM ingredientes
     WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

function validarNome(nome) {
  if (typeof nome !== "string" || nome.trim().length === 0) return "Nome é obrigatório.";
  if (nome.trim().length < 3) return "Nome deve ter pelo menos 3 caracteres.";
  if (nome.trim().length > 150) return "Nome deve ter no máximo 150 caracteres.";
  const nomeRegex = /^[\p{L}0-9\s]+$/u;
  if (!nomeRegex.test(nome.trim())) return "Nome deve conter apenas letras e números.";
  return null;
}

function validarPreco(preco) {
  const precoNum = Number(preco);
  if (typeof precoNum !== "number" || Number.isNaN(precoNum) || precoNum < 0)
    return "Preço inválido. Deve ser >= 0.";
  if (precoNum >= 1000) return "Preço deve ser menor que 1000.";
  return null;
}

function validarMetrica(metrica) {
  if (typeof metrica !== "string" || metrica.trim().length === 0) return "Métrica é obrigatória.";
  return null;
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
    console.error("Erro ao listar ingredientes (GET):", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível listar ingredientes." });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de ingrediente inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  try {
    const ingrediente = await obterIngredientePorId(id);
    if (!ingrediente || (!isAdmin && ingrediente.usuario_id !== uid)) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    res.json(ingrediente);
  } catch (e) {
    console.error("Erro ao buscar ingrediente (GET/:id):", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível encontrar ingrediente." });
  }
});

router.post("/", async (req, res) => {
  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid } = auth;

  const { nome, preco, metrica } = req.body ?? {};

  const erro = validarNome(nome) || validarPreco(preco) || validarMetrica(metrica);
  if (erro) return res.status(400).json({ erro });

  try {
    const { rows } = await pool.query(
      `INSERT INTO ingredientes (nome, preco, metrica, usuario_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, preco, metrica, usuario_id, data_criacao, data_atualizacao`,
      [nome.trim(), Number(preco), metrica.trim(), uid]
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

  const erro = validarNome(nome) || validarPreco(preco) || validarMetrica(metrica);
  if (erro) return res.status(400).json({ erro });

  try {
    const ingrediente = await obterIngredientePorId(id);
    if (!ingrediente || (!isAdmin && ingrediente.usuario_id !== uid)) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    const { rows } = await pool.query(
      `UPDATE ingredientes
       SET nome = $1, preco = $2, metrica = $3, data_atualizacao = now()
       WHERE id = $4
       RETURNING id, nome, preco, metrica, usuario_id, data_atualizacao`,
      [nome.trim(), Number(preco), metrica.trim(), id]
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
    return res.status(400).json({ erro: "Envie ao menos um campo para atualizar." });
  }

  const erro =
    (nome !== undefined && validarNome(nome)) ||
    (preco !== undefined && validarPreco(preco)) ||
    (metrica !== undefined && validarMetrica(metrica));

  if (erro) return res.status(400).json({ erro });

  try {
    const ingrediente = await obterIngredientePorId(id);
    if (!ingrediente || (!isAdmin && ingrediente.usuario_id !== uid)) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (nome !== undefined) {
      updates.push(`nome = $${idx++}`);
      params.push(nome.trim());
    }
    if (preco !== undefined) {
      updates.push(`preco = $${idx++}`);
      params.push(Number(preco));
    }
    if (metrica !== undefined) {
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
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível atualizar ingrediente parcialmente." });
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
    if (!ingrediente || (!isAdmin && ingrediente.usuario_id !== uid)) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    await pool.query(`DELETE FROM ingredientes WHERE id = $1`, [id]);
    res.status(200).json({ mensagem: "Ingrediente excluído com sucesso!" });
  } catch (e) {
    console.error("Erro ao excluir ingrediente (DELETE):", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível excluir ingrediente." });
  }
});

export default router;
