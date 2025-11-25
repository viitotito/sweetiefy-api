import { Router } from "express";
import { pool } from "../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { writeFile, unlink } from "node:fs/promises";

const router = Router();

const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

async function obterReceitaPorId(id) {
  const { rows } = await pool.query(
    `SELECT id, nome, descricao, usuario_id, imagem_url, preco, data_criacao, data_atualizacao
     FROM receitas WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

function gerarNomeArquivo(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

function montarUrlCompleta(req, filename) {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/uploads/${filename}`;
}

async function salvarUploadEmDisco(req, file) {
  if (!file) return null;
  const filename = gerarNomeArquivo(file.originalname);
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, file.buffer);
  return montarUrlCompleta(req, filename);
}

async function removerArquivoPorUrl(url_imagem) {
  if (!url_imagem) return;
  try {
    const { pathname } = new URL(url_imagem);
    const filename = path.basename(pathname);
    const filePath = path.join(uploadDir, filename);
    await unlink(filePath);
  } catch { }
}

router.get("/", async (req, res) => {
  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  try {
    let query = `SELECT id, nome, descricao, usuario_id, imagem_url, preco, data_criacao, data_atualizacao FROM receitas`;
    const params = [];

    if (!isAdmin) {
      query += ` WHERE usuario_id = $1`;
      params.push(uid);
    }

    query += ` ORDER BY nome ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) {
    console.error("Erro ao listar receitas (GET):", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível listar receitas." });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID da receita inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  try {
    const receita = await obterReceitaPorId(id);

    if (!receita || (!isAdmin && receita.usuario_id !== uid))
      return res.status(404).json({ erro: "Receita não encontrada." });

    const ingredientesResult = await pool.query(
      `SELECT ri.quantidade,
              i.id AS ingrediente_id,
              i.nome,
              i.preco,
              i.metrica
       FROM receitas_ingredientes ri
       JOIN ingredientes i ON ri.ingrediente_id = i.id
       WHERE ri.receita_id = $1`,
      [id]
    );

    receita.ingredientes = ingredientesResult.rows;
    res.json(receita);
  } catch (e) {
    console.error("Erro ao buscar receita (GET:id):", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível encontrar receita." });
  }
});

router.post("/", upload.single("imagem"), async (req, res) => {
  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid } = auth;

  const { nome, descricao, preco } = req.body ?? {};

  const temNome = typeof nome === "string" && nome.trim().length > 0;
  const precoNum = Number(preco);
  const temPreco = typeof precoNum === "number" && !Number.isNaN(precoNum) && precoNum >= 0;

  let ingredientes = [];
  try {
    ingredientes = req.body.ingredientes ? JSON.parse(req.body.ingredientes) : [];
  } catch {
    return res.status(400).json({ erro: "Formato de ingredientes inválido." });
  }

  if (!temNome || !temPreco) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome (string não vazia), preco (número >= 0 e < 1000) e metrica (string não vazia).",
    });
  }

  if (precoNum >= 1000) {
    return res.status(422).json({ erro: "Campo preço deve ser menor que 1000." });
  }

  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ erro: "É obrigatório passar pelo menos um ingrediente." });
  }

  for (const ing of ingredientes) {
    if (!ing.id || !ing.quantidade || ing.quantidade <= 0) {
      return res.status(400).json({
        erro: "Todos os ingredientes devem ter id válido e quantidade > 0.",
      });
    }
  }

  let imagemUrl = null;
  try {
    if (req.file) imagemUrl = await salvarUploadEmDisco(req, req.file);

    const { rows } = await pool.query(
      `INSERT INTO receitas (nome, descricao, usuario_id, imagem_url, preco)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nome.trim(), descricao?.trim() ?? null, uid, imagemUrl, Number(preco)]
    );

    const receitaCriada = rows[0];

    for (const ing of ingredientes) {
      await pool.query(
        `INSERT INTO receitas_ingredientes (receita_id, ingrediente_id, quantidade)
         VALUES ($1, $2, $3)`,
        [receitaCriada.id, Number(ing.id), Number(ing.quantidade)]
      );
    }

    res.status(201).json(receitaCriada);
  } catch (e) {
    console.error("Erro ao criar receita (POST):", e);
    if (imagemUrl) await removerArquivoPorUrl(imagemUrl);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível criar receita." });
  }
});

router.put("/:id", upload.single("imagem"), async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID da receita inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  const { nome, descricao, preco } = req.body ?? {};

  const temNome = typeof nome === "string" && nome.trim().length > 0;
  const precoNum = Number(preco);
  const temPreco = typeof precoNum === "number" && !Number.isNaN(precoNum) && precoNum >= 0;

  if (!temNome || !temPreco) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome (string não vazia), preco (número >= 0 e < 1000) e metrica (string não vazia).",
    });
  }

  let ingredientes = [];
  try {
    ingredientes = req.body.ingredientes
      ? JSON.parse(req.body.ingredientes)
      : [];
  } catch {
    return res.status(400).json({ erro: "Formato de ingredientes inválido." });
  }

  if (preco >= 1000) {
    return res.status(422).json({ erro: "Campo preço deve ser menor que 1000." });
  }

  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ erro: "É obrigatório passar pelo menos um ingrediente." });
  }

  for (const ing of ingredientes) {
    if (!ing.id || !ing.quantidade || ing.quantidade <= 0) {
      return res.status(400).json({
        erro: "Todos os ingredientes devem ter id válido e quantidade > 0.",
      });
    }
  }

  try {
    const receitaExistente = await obterReceitaPorId(id);
    if (!receitaExistente || (!isAdmin && receitaExistente.usuario_id !== uid)) {
      return res.status(404).json({ erro: "Receita não encontrada." });
    }

    await pool.query(
      `UPDATE receitas
       SET nome=$1, descricao=$2, preco=$3, data_atualizacao=now()
       WHERE id=$4`,
      [nome.trim(), descricao?.trim() ?? null, Number(preco), id]
    );

    if (req.file) {
      const imagemUrl = await salvarUploadEmDisco(req, req.file);
      if (receitaExistente.imagem_url) await removerArquivoPorUrl(receitaExistente.imagem_url);
      await pool.query(`UPDATE receitas SET imagem_url=$1 WHERE id=$2`, [imagemUrl, id]);
    } else if (!descricao && !nome && !preco) {
    }

    await pool.query(`DELETE FROM receitas_ingredientes WHERE receita_id=$1`, [id]);
    for (const ing of ingredientes) {
      await pool.query(
        `INSERT INTO receitas_ingredientes (receita_id, ingrediente_id, quantidade)
         VALUES ($1, $2, $3)`,
        [id, Number(ing.id), Number(ing.quantidade)]
      );
    }

    const receitaAtualizada = await obterReceitaPorId(id);
    const ingredientesResult = await pool.query(
      `SELECT ri.quantidade, i.id AS ingrediente_id, i.nome, i.preco, i.metrica
       FROM receitas_ingredientes ri
       JOIN ingredientes i ON ri.ingrediente_id = i.id
       WHERE ri.receita_id = $1`,
      [id]
    );
    receitaAtualizada.ingredientes = ingredientesResult.rows;

    res.json(receitaAtualizada);
  } catch (e) {
    console.error("Erro ao atualizar receita (PUT):", e);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

router.patch("/:id", upload.single("imagem"), async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID da receita inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  const { nome, descricao, preco } = req.body ?? {};

  const temNome = typeof nome === "string" && nome.trim().length > 0;
  const precoNum = Number(preco);
  const temPreco = typeof precoNum === "number" && !Number.isNaN(precoNum) && precoNum >= 0;

  if (!temNome || !temPreco) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome (string não vazia), preco (número >= 0 e < 1000) e metrica (string não vazia).",
    });
  }

  let ingredientes = [];
  try {
    ingredientes = req.body.ingredientes
      ? JSON.parse(req.body.ingredientes)
      : [];
  } catch {
    return res.status(400).json({ erro: "Formato de ingredientes inválido." });
  }

  if (preco >= 1000) {
    return res.status(422).json({ erro: "Campo preço deve ser menor que 1000." });
  }
  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ erro: "É obrigatório passar pelo menos um ingrediente." });
  }

  for (const ing of ingredientes) {
    if (!ing.id || !ing.quantidade || ing.quantidade <= 0) {
      return res.status(400).json({
        erro: "Todos os ingredientes devem ter id válido e quantidade > 0.",
      });
    }
  }

  try {
    const receitaExistente = await obterReceitaPorId(id);
    if (!receitaExistente || (!isAdmin && receitaExistente.usuario_id !== uid))
      return res.status(404).json({ erro: "Receita não encontrada." });

    await pool.query(
      `UPDATE receitas SET nome=$1, descricao=$2, preco=$3, data_atualizacao=now() WHERE id=$4`,
      [nome.trim(), descricao?.trim() ?? null, Number(preco), id]
    );

    if (req.file) {
      const imagemUrl = await salvarUploadEmDisco(req, req.file);
      if (receitaExistente.imagem_url) await removerArquivoPorUrl(receitaExistente.imagem_url);
      await pool.query(`UPDATE receitas SET imagem_url=$1 WHERE id=$2`, [imagemUrl, id]);
    }

    await pool.query(`DELETE FROM receitas_ingredientes WHERE receita_id=$1`, [id]);

    for (const ing of ingredientes) {
      await pool.query(
        `INSERT INTO receitas_ingredientes (receita_id, ingrediente_id, quantidade)
         VALUES ($1, $2, $3)`,
        [id, Number(ing.id), Number(ing.quantidade)]
      );
    }

    const receitaAtualizada = await obterReceitaPorId(id);
    const ingredientesResult = await pool.query(
      `SELECT ri.quantidade, i.id AS ingrediente_id, i.nome, i.preco, i.metrica
       FROM receitas_ingredientes ri
       JOIN ingredientes i ON ri.ingrediente_id = i.id
       WHERE ri.receita_id = $1`,
      [id]
    );
    receitaAtualizada.ingredientes = ingredientesResult.rows;

    res.json(receitaAtualizada);
  } catch (e) {
    console.error("Erro ao atualizar receita:", e);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID da receita inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  try {
    const receita = await obterReceitaPorId(id);

    if (!receita || (!isAdmin && receita.usuario_id !== uid))
      return res.status(404).json({ erro: "Receita não encontrada." });

    await pool.query(`DELETE FROM receitas_ingredientes WHERE receita_id=$1`, [id]);

    if (receita.imagem_url) {
      await removerArquivoPorUrl(receita.imagem_url);
    }

    await pool.query(`DELETE FROM receitas WHERE id=$1`, [id]);

    res.status(200).json({ mensagem: "Receita excluída com sucesso!" });

  } catch (e) {
    console.error("Erro ao excluir receita (DELETE):", e);
    res.status(500).json({
      erro: "Erro interno do servidor. Não foi possível excluir receita."
    });
  }
});

export default router;
