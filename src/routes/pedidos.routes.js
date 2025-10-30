import { Router } from "express";
import { pool } from "../database/db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, descricao, cliente_id, usuario_id, preco_total, prioridade, margem_lucro, estado, data_limite, data_criacao, data_atualizacao
             FROM pedidos 
             ORDER BY id ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error("Erro ao listar pedidos (GET):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível listar pedidos.",
    });
  }
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID do pedido inválido." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, descricao, cliente_id, usuario_id, preco_total, prioridade, margem_lucro, estado,  data_limite, data_criacao, data_atualizacao
             FROM pedidos
             WHERE id = $1`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ erro: "Pedido não encontrado." });
    }

    const pedido = rows[0];

    const receitasResult = await pool.query(
      `SELECT 
                pr.quantidade, 
                pr.preco_unitario,
                r.id AS receita_id, 
                r.nome, 
                r.descricao, 
                r.imagem_url,
                r.preco
             FROM pedidos_receitas pr
             JOIN receitas r ON pr.receita_id = r.id
             WHERE pr.pedido_id = $1`,
      [id]
    );

    pedido.receitas = receitasResult.rows;

    res.json(pedido);
  } catch (e) {
    console.error("Erro ao buscar pedido e receitas (GET:id):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível buscar pedido.",
    });
  }
});

router.post("/", async (req, res) => {
  const {descricao, cliente_id, usuario_id, preco_total, prioridade, margem_lucro, estado, data_limite} = req.body ?? {};

  const cid = Number(cliente_id);
  const uid = Number(usuario_id);
  const temCidValido = Number.isInteger(cid) && cid > 0;
  const temUidValido = Number.isInteger(uid) && uid > 0;
  const temPrecoTotalValido = typeof preco_total === "number" && preco_total >= 0;
  const temPrioridadeValida = typeof prioridade === "string" && prioridade.trim().length > 0;
  const temMargemLucroValido = typeof margem_lucro === "number" && margem_lucro >= 0;
  const temEstadoValido = typeof estado === "string" && estado.trim().length > 0;
  const temDataLimiteValida = typeof data_limite === "string" && estado.trim().length > 0;

  if (!temCidValido || !temUidValido || !temPrecoTotalValido || !temPrioridadeValida || !temMargemLucroValido || !temEstadoValido || !temDataLimiteValida) {
    return res.status(400).json({
      erro: "Campos obrigatórios: cliente_id (number > 0), usuario_id (number > 0), preco_total (number), prioridade (string), margem_lucro (number), estado (string) e data_limite (string).",  
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO pedidos (descricao, cliente_id, usuario_id, preco_total, prioridade, margem_lucro, estado, data_limite, data_criacao, data_atualizacao)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, descricao, cliente_id, usuario_id, preco_total, prioridade, margem_lucro, estado, data_limite, data_criacao, data_atualizacao`,
      [descricao?.trim(), cid, uid, preco_total, prioridade.trim(), margem_lucro, estado.trim(), data_limite.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Erro ao criar pedido (POST):", e);
    res.status(500).json({
      erro: "Erro ao criar pedido. Verifique se o usuário existe e os campos são válidos.",
    });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const {cliente_id, usuario_id, preco_total, prioridade, margem_lucro, estado, data_limite} = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID do pedido inválido." });
  }

  const uid = Number(usuario_id);
  const temUidValido = Number.isInteger(uid) && uid > 0;
  const temNomeValido = typeof nome === "string" && nome.trim().length > 0;
  const precoValido = typeof preco === "number" && preco >= 0;

  if (!temNomeValido || !precoValido || !temUidValido) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome (string), preco (number), e usuario_id (number > 0)",
    });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE receitas
                 SET nome = $1,
                     descricao = $2,
                     usuario_id = $3,
                     imagem_url = $4,
                     preco = $5,
                     data_atualizacao = now()
             WHERE id = $6
             RETURNING id, nome, descricao, usuario_id, preco, data_atualizacao`,
      [nome.trim(), descricao?.trim(), uid, imagem_url?.trim(), preco, id]
    );

    if (!rows[0]) {
      return res.status(404).json({ erro: "Receita não encontrada." });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao atualizar receita (PUT):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível atualizar receita.",
    });
  }
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, descricao, usuario_id, imagem_url, preco } = req.body ?? {};

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID da receita inválido." });
  }

  if (
    nome === undefined &&
    descricao === undefined &&
    imagem_url === undefined &&
    preco === undefined &&
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

  if (preco !== undefined) {
    const p = Number(preco);
    if (typeof preco !== "number" || p < 0) {
      return res
        .status(400)
        .json({ erro: "Campo 'preco' deve ser um número não negativo." });
    }
    updates.push(`preco = $${paramIndex++}`);
    values.push(p);
  }

  if (usuario_id !== undefined) {
    const uid = Number(usuario_id);
    if (!Number.isInteger(uid) || uid <= 0) {
      return res
        .status(400)
        .json({ erro: "Campo 'usuario_id' deve ser inteiro > 0" });
    }
    updates.push(`usuario_id = $${paramIndex++}`);
    values.push(uid);
  }

  updates.push(`data_atualizacao = now()`);

  try {
    const query = `
            UPDATE receitas
            SET ${updates.join(", ")}
            WHERE id = $1
            RETURNING id, nome, descricao, usuario_id, preco, data_atualizacao`;

    const { rows } = await pool.query(query, values);

    if (!rows[0]) {
      return res.status(404).json({ erro: "Receita não encontrada" });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao atualizar receita (PATCH):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível atualizar parcialmente a receita.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: "ID da receita inválido." });
  }

  try {
    const r = await pool.query(
      `DELETE FROM receitas WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!r.rowCount) {
      return res.status(404).json({ erro: "Receita não encontrada." });
    }

    res.status(204).end();
  } catch (e) {
    console.error("Erro ao deletar receita:", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível deletar receita (verifique fk).",
    });
  }
});

router.post("/:receitaId/ingredientes", async (req, res) => {
  const id = Number(req.params.receitaId);
  const { ingrediente_id, quantidade } = req.body ?? {};

  const iid = Number(ingrediente_id);
  const temIidValido = Number.isInteger(iid) && iid > 0;
  const temQuantidadeValida = typeof quantidade === "number" && quantidade > 0;

  if (!temIidValido || !temQuantidadeValido) {
    return res.status(400).json({
      erro: "Campos obrigatórios: quantidade (number) e ingrediente_id (number > 0)",
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO receitas_ingredientes (receita_id, ingrediente_id, quantidade)
             VALUES ($1, $2, $3)
             RETURNING id, receita_id, ingrediente_id, quantidade`,
      [receita_id, iid, qtd]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23503") {
      return res
        .status(404)
        .json({ erro: "Receita ou Ingrediente não existe." });
    }
    console.error("Erro ao adicionar ingrediente à receita:", e);
    res
      .status(500)
      .json({
        erro: "Erro interno do servidor. Não foi possível adicionar ingrediente à receita.",
      });
  }
});

router.delete("/:receitaId/ingredientes/:ingredienteId", async (req, res) => {
  const receita_id = Number(req.params.receitaId);
  const ingrediente_id = Number(req.params.ingredienteId);

  if (
    !Number.isInteger(receita_id) ||
    receita_id <= 0 ||
    !Number.isInteger(ingrediente_id) ||
    ingrediente_id <= 0
  ) {
    return res
      .status(400)
      .json({ erro: "IDs de Receita ou Ingrediente inválidos." });
  }

  try {
    const r = await pool.query(
      `DELETE FROM receitas_ingredientes 
             WHERE receita_id = $1 AND ingrediente_id = $2
             RETURNING id`,
      [receita_id, ingrediente_id]
    );

    if (!r.rowCount) {
      return res
        .status(404)
        .json({ erro: "Associação (ingrediente na receita) não encontrada." });
    }

    res.status(204).end();
  } catch (e) {
    console.error("Erro ao remover ingrediente da receita:", e);
    res
      .status(500)
      .json({
        erro: "Erro interno do servidor. Não foi possível remover ingrediente da receita.",
      });
  }
});

export default router;
