import { Router } from "express";
import { pool } from "../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { writeFile, unlink } from "node:fs/promises";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir, { recursive: true });

function parseIdParam(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
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

async function obterReceitaPorId(id) {
  const { rows } = await pool.query(
    `SELECT id, nome, descricao, usuario_id, imagem_url, preco, data_criacao, data_atualizacao
     FROM receitas WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/", async (req, res) => {
  const uid = req.user.id;
  const isAdmin = Number(req.user.perfil) === 1;
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
    console.error("Erro ao listar receitas:", e);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});
router.get("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const uid = req.user.id;
  const isAdmin = Number(req.user.perfil) === 1;

  try {
    const receita = await obterReceitaPorId(id);
    if (!receita) return res.status(404).json({ erro: "Receita não encontrada." });
    if (!isAdmin && receita.usuario_id !== uid)
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
    console.error("Erro ao buscar receita:", e);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

router.patch("/:id", upload.single("imagem"), async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const uid = req.user.id;
  const isAdmin = Number(req.user.perfil) === 1;

  const { nome, descricao, preco } = req.body;

  let ingredientes = [];
  try {
    ingredientes = req.body.ingredientes ? JSON.parse(req.body.ingredientes) : [];
  } catch {
    return res.status(400).json({ erro: "Formato de ingredientes inválido." });
  }

  if (!nome || nome.trim() === "" || preco === undefined || preco < 0) {
    return res.status(400).json({ erro: "Campos inválidos: nome e preco." });
  }

  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ erro: "É obrigatório passar pelo menos um ingrediente." });
  }

  for (const ing of ingredientes) {
    if (!ing.id || !ing.quantidade || ing.quantidade <= 0) {
      return res.status(400).json({ erro: "Todos os ingredientes devem ter id válido e quantidade > 0." });
    }
  }

  try {
    const receitaExistente = await obterReceitaPorId(id);
    if (!receitaExistente) return res.status(404).json({ erro: "Receita não encontrada." });
    if (!isAdmin && receitaExistente.usuario_id !== uid) {
      return res.status(403).json({ erro: "Sem permissão para atualizar esta receita." });
    }

    await pool.query(
      `UPDATE receitas SET nome=$1, descricao=$2, preco=$3, data_atualizacao=now() WHERE id=$4`,
      [nome.trim(), descricao?.trim() ?? null, Number(preco), id]
    );

    if (req.file) {
      const imagemUrl = await salvarUploadEmDisco(req.file);

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

router.post("/", upload.single("imagem"), async (req, res) => {
  const uid = req.user.id;
  const { nome, descricao, preco } = req.body;

  let ingredientes = [];
  try {
    ingredientes = req.body.ingredientes ? JSON.parse(req.body.ingredientes) : [];
  } catch {
    return res.status(400).json({ erro: "Formato de ingredientes inválido." });
  }

  if (!nome || nome.trim() === "" || preco === undefined || preco < 0) {
    return res.status(400).json({ erro: "Campos inválidos: nome e preco." });
  }

  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ erro: "É obrigatório passar pelo menos um ingrediente." });
  }

  for (const ing of ingredientes) {
    if (!ing.id || !ing.quantidade || ing.quantidade <= 0) {
      return res.status(400).json({ erro: "Todos os ingredientes devem ter id válido e quantidade > 0." });
    }
  }

  let imagemUrl = null;

  try {
    if (req.file) imagemUrl = await salvarUploadEmDisco(req.file ? req.file : null, req.file);

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
    console.error("Erro ao criar receita:", e);
    if (imagemUrl) await removerArquivoPorUrl(imagemUrl);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

export default router;
