import { Router } from "express";
import { pool } from "../database/db.js";
import { recaptchaMiddleware } from "../middlewares/recaptcha.js";

const router = Router();

function parseIdParam(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getAuthInfo(req, res) {
  const uid = req.user?.id;
  const isAdmin = req.user?.papel === 1;

  if (!uid) {
    res.status(401).json({ erro: "não autenticado" });
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

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, preco, metrica, usuario_id, data_criacao, data_atualizacao
       FROM ingredientes
       ORDER BY nome ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error("Erro ao listar ingredientes:", e);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  try {
    const ingrediente = await obterIngredientePorId(id);
    if (!ingrediente) return res.status(404).json({ erro: "Ingrediente não encontrado." });

    res.json(ingrediente);
  } catch (e) {
    console.error("Erro ao buscar ingrediente:", e);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

router.post("/", recaptchaMiddleware, async (req, res) => {
  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid } = auth;

  const { nome, preco, metrica } = req.body ?? {};

  const temNome = typeof nome === "string" && nome.trim() !== "";
  const temPreco = typeof Number(preco) === "number" && Number(preco) >= 0;
  const temMetrica = typeof metrica === "string" && metrica.trim() !== "";

  if (!temNome || !temPreco || !temMetrica) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome (string), preco (>=0), metrica (string)."
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO ingredientes (nome, preco, metrica, usuario_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, preco, metrica, usuario_id, data_criacao, data_atualizacao`,
      [nome.trim(), Number(preco), metrica.trim(), uid]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Erro ao criar ingrediente:", e);
    res.status(500).json({ erro: "Erro interno ao criar ingrediente." });
  }
});

router.put("/:id", recaptchaMiddleware, async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  const { nome, preco, metrica } = req.body ?? {};

  const temNome = typeof nome === "string" && nome.trim() !== "";
  const temPreco = typeof Number(preco) === "number" && Number(preco) >= 0;
  const temMetrica = typeof metrica === "string" && metrica.trim() !== "";

  if (!temNome || !temPreco || !temMetrica) {
    return res.status(400).json({
      erro: "Para PUT envie: nome, preco e metrica."
    });
  }

  try {
    const ingrediente = await obterIngredientePorId(id);
    if (!ingrediente) return res.status(404).json({ erro: "Ingrediente não encontrado." });

    if (!isAdmin && ingrediente.usuario_id !== uid) {
      return res.status(403).json({ erro: "Sem permissão." });
    }

    const { rows } = await pool.query(
      `UPDATE ingredientes
       SET nome=$1, preco=$2, metrica=$3, data_atualizacao = now()
       WHERE id = $4
       RETURNING id, nome, preco, metrica, usuario_id, data_atualizacao`,
      [nome.trim(), Number(preco), metrica.trim(), id]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao atualizar ingrediente:", e);
    res.status(500).json({ erro: "Erro interno." });
  }
});

router.patch("/:id", recaptchaMiddleware, async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  const { nome, preco, metrica } = req.body ?? {};

  if (nome === undefined && preco === undefined && metrica === undefined) {
    return res.status(400).json({ erro: "Envie ao menos um campo." });
  }

  try {
    const ingrediente = await obterIngredientePorId(id);
    if (!ingrediente) return res.status(404).json({ erro: "Ingrediente não encontrado." });

    if (!isAdmin && ingrediente.usuario_id !== uid) {
      return res.status(403).json({ erro: "Sem permissão." });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (nome !== undefined) {
      if (typeof nome !== "string" || nome.trim() === "")
        return res.status(400).json({ erro: "'nome' inválido." });
      updates.push(`nome = $${idx++}`);
      params.push(nome.trim());
    }

    if (preco !== undefined) {
      const p = Number(preco);
      if (isNaN(p) || p < 0)
        return res.status(400).json({ erro: "'preco' inválido." });
      updates.push(`preco = $${idx++}`);
      params.push(p);
    }

    if (metrica !== undefined) {
      if (typeof metrica !== "string" || metrica.trim() === "")
        return res.status(400).json({ erro: "'metrica' inválida." });
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
    res.status(500).json({ erro: "Erro interno." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;

  const { isAdmin } = auth;

  if (!isAdmin) {
    return res.status(403).json({ erro: "Somente administradores podem remover ingredientes." });
  }

  try {
    const result = await pool.query(
      `DELETE FROM ingredientes WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ erro: "Ingrediente não encontrado." });
    }

    res.status(204).end();
  } catch (e) {
    console.error("Erro ao deletar ingrediente:", e);
    res.status(500).json({ erro: "Erro interno (verifique fk)." });
  }
});

export default router;
