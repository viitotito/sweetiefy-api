import { Router } from "express";
import { pool } from "../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { writeFile, unlink } from "node:fs/promises";
import { recaptchaMiddleware } from "../middlewares/recaptcha.js";

const router = Router();

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
  } catch {
  }
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

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, descricao, usuario_id, imagem_url, preco, data_criacao, data_atualizacao
       FROM receitas
       ORDER BY nome ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error("Erro ao listar receitas (GET):", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível listar receitas." });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID da receita inválido." });

  try {
    const receita = await obterReceitaPorId(id);
    if (!receita) return res.status(404).json({ erro: "Receita não encontrada." });

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
    console.error("Erro ao buscar receita e ingredientes (GET:id):", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível buscar receita." });
  }
});

router.post("/", upload.single("imagem"), recaptchaMiddleware, async (req, res) => {
  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid } = auth;

  const { nome, descricao, preco } = req.body ?? {};

  const temNomeValido = typeof nome === "string" && nome.trim().length > 0;
  const precoNum = preco !== undefined ? Number(preco) : NaN;
  const temPrecoValido = typeof precoNum === "number" && !Number.isNaN(precoNum) && precoNum >= 0;

  if (!temNomeValido || !temPrecoValido) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome (string não vazia) e preco (número >= 0).",
    });
  }

  let imagemUrl = null;
  try {
    if (req.file) {
      imagemUrl = await salvarUploadEmDisco(req, req.file);
    }

    const { rows } = await pool.query(
      `INSERT INTO receitas (nome, descricao, usuario_id, imagem_url, preco)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, descricao, usuario_id, imagem_url, preco, data_criacao, data_atualizacao`,
      [nome.trim(), descricao?.trim() ?? null, uid, imagemUrl, precoNum]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Erro ao criar receita (POST):", e);
    if (imagemUrl) {
      await removerArquivoPorUrl(imagemUrl);
    }
    res.status(500).json({ erro: "Erro ao criar receita. Verifique se os campos são válidos." });
  }
});

router.put("/:id", upload.single("imagem"), recaptchaMiddleware, async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID da receita inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  const { nome, descricao, preco } = req.body ?? {};
  const temNomeValido = typeof nome === "string" && nome.trim().length > 0;
  const precoNum = preco !== undefined ? Number(preco) : NaN;
  const temPrecoValido = typeof precoNum === "number" && !Number.isNaN(precoNum) && precoNum >= 0;

  if (!temNomeValido || !temPrecoValido) {
    return res.status(400).json({
      erro: "Para PUT, envie nome (string não vazia) e preco (número >= 0).",
    });
  }

  let imagemNovaUrl = null;
  let imagemAntigaUrl = null;

  try {
    const receita = await obterReceitaPorId(id);
    if (!receita) return res.status(404).json({ erro: "Receita não encontrada." });

    if (!isAdmin && receita.usuario_id !== uid) {
      return res.status(404).json({ erro: "Receita não encontrada." }); // não revelar existência
    }

    imagemAntigaUrl = receita.imagem_url ?? null;

    if (req.file) {
      imagemNovaUrl = await salvarUploadEmDisco(req, req.file);
    } else {
      imagemNovaUrl = imagemAntigaUrl; 
    }

    const { rows } = await pool.query(
      `UPDATE receitas
       SET nome = $1,
           descricao = $2,
           usuario_id = $3,
           imagem_url = $4,
           preco = $5,
           data_atualizacao = now()
       WHERE id = $6
       RETURNING id, nome, descricao, usuario_id, imagem_url, preco, data_atualizacao`,
      [nome.trim(), descricao?.trim() ?? null, receita.usuario_id, imagemNovaUrl, precoNum, id]
    );

    if (!rows[0]) {
      if (req.file && imagemNovaUrl) await removerArquivoPorUrl(imagemNovaUrl);
      return res.status(404).json({ erro: "Receita não encontrada." });
    }

    if (req.file && imagemAntigaUrl && imagemAntigaUrl !== imagemNovaUrl) {
      await removerArquivoPorUrl(imagemAntigaUrl);
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao atualizar receita (PUT):", e);
    if (req.file && imagemNovaUrl) await removerArquivoPorUrl(imagemNovaUrl);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível atualizar receita." });
  }
});

router.patch("/:id", upload.single("imagem"), async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID da receita inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { uid, isAdmin } = auth;

  const body = req.body ?? {};
  const { nome, descricao, usuario_id, imagem_url, preco } = body;

  const querAtualizarNome = nome !== undefined;
  const querAtualizarPreco = preco !== undefined;
  const querAtualizarUsuarioId = usuario_id !== undefined;
  const querAtualizarImagem = !!req.file || imagem_url === null;

  if (!querAtualizarNome && !querAtualizarPreco && !querAtualizarUsuarioId && !querAtualizarImagem && descricao === undefined) {
    return res.status(400).json({ erro: "Envie ao menos um campo para atualizar." });
  }

  let novoNome;
  if (querAtualizarNome) {
    if (typeof nome !== "string" || nome.trim() === "") {
      return res.status(400).json({ erro: "Campo 'nome' deve ser string não vazia." });
    }
    novoNome = nome.trim();
  }

  let novoPreco;
  if (querAtualizarPreco) {
    const pnum = Number(preco);
    if (typeof preco !== "number" || Number.isNaN(pnum) || pnum < 0) {
      return res.status(400).json({ erro: "Campo 'preco' deve ser um número não negativo." });
    }
    novoPreco = pnum;
  }

  if (usuario_id !== undefined) {
    const uidCandidate = Number(usuario_id);
    if (!Number.isInteger(uidCandidate) || uidCandidate <= 0) {
      return res.status(400).json({ erro: "Campo 'usuario_id' deve ser inteiro > 0." });
    }
    if (!isAdmin) {
      return res.status(403).json({ erro: "Somente administradores podem alterar o usuário dono da receita." });
    }
  }

  if (imagem_url !== undefined && imagem_url !== null && imagem_url !== "null") {
    return res.status(400).json({
      erro: "Para alterar imagem via PATCH, envie um arquivo em 'imagem' ou imagem_url = null para remover.",
    });
  }

  let imagemAntigaUrl = null;
  let imagemNovaUrl = null;
  let criouNovaImagem = false;

  try {
    const receita = await obterReceitaPorId(id);
    if (!receita) return res.status(404).json({ erro: "Receita não encontrada." });

    if (!isAdmin && receita.usuario_id !== uid) {
      return res.status(404).json({ erro: "Receita não encontrada." });
    }

    imagemAntigaUrl = receita.imagem_url ?? null;

    if (req.file) {
      imagemNovaUrl = await salvarUploadEmDisco(req, req.file);
      criouNovaImagem = true;
    } else if (imagem_url === null) {
      imagemNovaUrl = null; 
    } else {
      imagemNovaUrl = imagemAntigaUrl;
    }

    const textoFinal = novoNome !== undefined ? novoNome : receita.nome;
    const precoFinal = novoPreco !== undefined ? novoPreco : receita.preco;
    const descricaoFinal = descricao !== undefined ? (typeof descricao === "string" ? descricao.trim() : null) : receita.descricao;
    const usuarioIdFinal = usuario_id !== undefined ? Number(usuario_id) : receita.usuario_id;

    const { rows } = await pool.query(
      `UPDATE receitas
       SET nome = $1,
           descricao = $2,
           usuario_id = $3,
           imagem_url = $4,
           preco = $5,
           data_atualizacao = now()
       WHERE id = $6
       RETURNING id, nome, descricao, usuario_id, imagem_url, preco, data_atualizacao`,
      [textoFinal, descricaoFinal, usuarioIdFinal, imagemNovaUrl, precoFinal, id]
    );

    if (!rows[0]) {
      if (criouNovaImagem && imagemNovaUrl) await removerArquivoPorUrl(imagemNovaUrl);
      return res.status(404).json({ erro: "Receita não encontrada." });
    }

    if (imagemAntigaUrl && imagemAntigaUrl !== imagemNovaUrl) {
      await removerArquivoPorUrl(imagemAntigaUrl);
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("Erro ao atualizar receita (PATCH):", e);
    if (criouNovaImagem && imagemNovaUrl) await removerArquivoPorUrl(imagemNovaUrl);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível atualizar parcialmente a receita." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = parseIdParam(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID da receita inválido." });

  const auth = getAuthInfo(req, res);
  if (!auth) return;
  const { isAdmin } = auth;

  try {
    const receita = await obterReceitaPorId(id);
    if (!receita) return res.status(404).json({ erro: "Receita não encontrada." });

    if (!isAdmin) {
      return res.status(403).json({ erro: "Somente administradores podem remover receitas." });
    }

    await pool.query(`DELETE FROM receitas WHERE id = $1`, [id]);

    if (receita.imagem_url) {
      await removerArquivoPorUrl(receita.imagem_url);
    }

    res.status(204).end();
  } catch (e) {
    console.error("Erro ao deletar receita:", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível deletar receita (verifique fk)." });
  }
});

router.post("/:receitaId/ingredientes", async (req, res) => {
  const id = parseIdParam(req.params.receitaId);
  const { ingrediente_id, quantidade } = req.body ?? {};

  const iid = Number(ingrediente_id);
  const qtd = Number(quantidade);
  const temIidValido = Number.isInteger(iid) && iid > 0;
  const temQuantidadeValida = Number.isInteger(qtd) && qtd >= 0;

  if (!id || !temIidValido || !temQuantidadeValida) {
    return res.status(400).json({
      erro: "Campos obrigatórios: receitaId (path), ingrediente_id (number > 0) e quantidade (number >= 0).",
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO receitas_ingredientes (receita_id, ingrediente_id, quantidade)
       VALUES ($1, $2, $3)
       RETURNING id, receita_id, ingrediente_id, quantidade`,
      [id, iid, qtd]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23503") {
      return res.status(404).json({ erro: "Receita ou Ingrediente não existe." });
    }
    console.error("Erro ao adicionar ingrediente à receita:", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível adicionar ingrediente à receita." });
  }
});

router.delete("/:receitaId/ingredientes/:ingredienteId", async (req, res) => {
  const receita_id = parseIdParam(req.params.receitaId);
  const ingrediente_id = parseIdParam(req.params.ingredienteId);

  if (!receita_id || !ingrediente_id) {
    return res.status(400).json({ erro: "IDs de Receita ou Ingrediente inválidos." });
  }

  try {
    const r = await pool.query(
      `DELETE FROM receitas_ingredientes
       WHERE receita_id = $1 AND ingrediente_id = $2
       RETURNING id`,
      [receita_id, ingrediente_id]
    );

    if (!r.rowCount) {
      return res.status(404).json({ erro: "Associação (ingrediente na receita) não encontrada." });
    }

    res.status(204).end();
  } catch (e) {
    console.error("Erro ao remover ingrediente da receita:", e);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível remover ingrediente da receita." });
  }
});

export default router;