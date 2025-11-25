import { Router } from "express";
import { pool } from "../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { writeFile, unlink } from "node:fs/promises";
import { authMiddleware } from "../middlewares/auth.js"; 

const router = Router();
router.use(authMiddleware); 
router.use((req, res, next) => {
  console.log("Usuário autenticado:", req.user);
  next();
});
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
  } catch {}
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

// LISTAR RECEITAS
router.get("/", async (req, res) => {
  const uid = req.user.id;
  const isAdmin = Number(req.user.perfil) === 1; // 1 = Admin
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

// OBTER RECEITA POR ID
router.get("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const uid = req.user.id;
  const isAdmin = Number(req.user.perfil) === 1; // 1 = Admin

  try {
    const receita = await obterReceitaPorId(id);
    if (!receita) return res.status(404).json({ erro: "Receita não encontrada." });
    if (!isAdmin && receita.usuario_id !== uid) return res.status(404).json({ erro: "Receita não encontrada." });

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

// CRIAR RECEITA
router.post("/", upload.single("imagem"), async (req, res) => {
  const uid = req.user.id;
  const { nome, descricao, preco } = req.body ?? {};

  if (!nome || nome.trim() === "" || preco === undefined || preco < 0) {
    return res.status(400).json({ erro: "Campos inválidos: nome e preco." });
  }

  let imagemUrl = null;
  try {
    if (req.file) imagemUrl = await salvarUploadEmDisco(req, req.file);

    const { rows } = await pool.query(
      `INSERT INTO receitas (nome, descricao, usuario_id, imagem_url, preco)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nome.trim(), descricao?.trim() ?? null, uid, imagemUrl, Number(preco)]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Erro ao criar receita:", e);
    if (imagemUrl) await removerArquivoPorUrl(imagemUrl);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

// DELETAR RECEITA
router.delete("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const uid = req.user.id;
  const isAdmin = Number(req.user.perfil) === 1; // 1 = Admin

  try {
    const receita = await obterReceitaPorId(id);
    if (!receita) return res.status(404).json({ erro: "Receita não encontrada." });
    if (!isAdmin && receita.usuario_id !== uid) return res.status(403).json({ erro: "Sem permissão." });

    // Deletar ingredientes associados
    await pool.query(`DELETE FROM receitas_ingredientes WHERE receita_id=$1`, [id]);

    // Deletar receita
    await pool.query(`DELETE FROM receitas WHERE id=$1`, [id]);

    // Remover imagem
    if (receita.imagem_url) await removerArquivoPorUrl(receita.imagem_url);

    res.status(200).json({ message: "Receita e ingredientes deletados com sucesso." });
  } catch (e) {
    console.error("Erro ao deletar receita:", e);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});


// ADICIONAR INGREDIENTE À RECEITA
router.post("/:receitaId/ingredientes", async (req, res) => {
  const receita_id = parseIdParam(req.params.receitaId);
  const { ingrediente_id, quantidade } = req.body ?? {};
  const iid = Number(ingrediente_id);
  const qtd = Number(quantidade);

  if (!receita_id || !iid || qtd < 0) return res.status(400).json({ erro: "Campos inválidos." });

  try {
    const { rows } = await pool.query(
      `INSERT INTO receitas_ingredientes (receita_id, ingrediente_id, quantidade)
       VALUES ($1, $2, $3) RETURNING *`,
      [receita_id, iid, qtd]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Erro ao adicionar ingrediente:", e);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

// REMOVER INGREDIENTE DA RECEITA
router.delete("/:receitaId/ingredientes/:ingredienteId", async (req, res) => {
  const receita_id = parseIdParam(req.params.receitaId);
  const ingrediente_id = parseIdParam(req.params.ingredienteId);

  if (!receita_id || !ingrediente_id) return res.status(400).json({ erro: "IDs inválidos." });

  try {
    const r = await pool.query(
      `DELETE FROM receitas_ingredientes WHERE receita_id=$1 AND ingrediente_id=$2 RETURNING id`,
      [receita_id, ingrediente_id]
    );
    if (!r.rowCount) return res.status(404).json({ erro: "Associação não encontrada." });
    res.status(204).end();
  } catch (e) {
    console.error("Erro ao remover ingrediente:", e);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
});

export default router;
