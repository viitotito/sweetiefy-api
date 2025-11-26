import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "../database/db.js";
import { authMiddleware } from "../middlewares/auth.js";

dotenv.config();
const router = Router();

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES = "15m",
  JWT_REFRESH_EXPIRES = "7d",
} = process.env;

const isProduction = process.env.NODE_ENV === "production";
const REFRESH_COOKIE = "refresh_token";
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function requireAdmin(req, res, next) {
  if (Number(req.user.perfil) !== 1) {
    return res.status(403).json({ erro: "Acesso negado. Apenas admins." });
  }
  next();
}

function signAccessToken(u) {
  return jwt.sign({ sub: u.id, perfil: u.perfil, nome: u.nome }, JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
}

function signRefreshToken(u) {
  return jwt.sign({ sub: u.id, tipo: "refresh" }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
}

function cookieOpts() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  };
}

function setRefreshCookie(res, req, token) {
  res.cookie(REFRESH_COOKIE, token, cookieOpts(req));
}

function clearRefreshCookie(res, req) {
  res.clearCookie(REFRESH_COOKIE, cookieOpts(req));
}

function validarNome(nome) {
  if (!nome || typeof nome !== "string") return "Nome é obrigatório.";
  if (nome.trim().length < 3) return "Nome deve ter pelo menos 3 caracteres.";
  if (nome.trim().length > 255) return "Nome deve ter no máximo 255 caracteres.";
  if (!/^[a-zA-Z0-9]+$/.test(nome.trim())) return "Nome deve conter apenas letras e números.";
  return null;
}

function validarEmail(email) {
  if (!email || typeof email !== "string") return "Email é obrigatório.";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Email inválido.";
  return null;
}

function validarSenha(senha) {
  if (!senha || typeof senha !== "string") return "Senha é obrigatória.";
  if (senha.length < 6) return "Senha deve ter pelo menos 6 caracteres.";
  return null;
}

function validarPerfil(perfil) {
  if (perfil !== undefined && ![0, 1].includes(Number(perfil))) return "Perfil inválido.";
  return null;
}

router.post("/register", async (req, res) => {
  const { nome, email, senha } = req.body ?? {};

  const erro = validarNome(nome) || validarEmail(email) || validarSenha(senha);
  if (erro) return res.status(400).json({ erro });

  try {
    const senha_hash = await bcrypt.hash(senha, 12);
    const perfil = 0;

    const r = await pool.query(
      `INSERT INTO "usuarios" ("nome","email","senha_hash","perfil")
       VALUES ($1,$2,$3,$4)
       RETURNING "id","nome","email","perfil"`,
      [nome.trim(), email.trim().toLowerCase(), senha_hash, perfil]
    );

    const user = r.rows[0];
    const access_token = signAccessToken(user);
    const refresh_token = signRefreshToken(user);
    setRefreshCookie(res, req, refresh_token);

    return res.status(201).json({
      token_type: "Bearer",
      access_token,
      expires_in: JWT_ACCESS_EXPIRES,
      user,
    });
  } catch (err) {
    if (err?.code === "23505") return res.status(409).json({ erro: "Email já foi cadastrado." });
    console.error("Erro ao registrar usuário (POST):", err);
    return res.status(500).json({ erro: "Erro interno do servidor. Não foi possível registrar usuário." });
  }
});

router.post("/login", async (req, res) => {
  const { email, senha } = req.body ?? {};
  if (!email || !senha) return res.status(400).json({ erro: "Campos email e senha são obrigatórios." });

  const erroEmail = validarEmail(email);
  if (erroEmail) return res.status(400).json({ erro: erroEmail });

  try {
    const r = await pool.query(`SELECT "id","nome","email","senha_hash","perfil" FROM "usuarios" WHERE "email" = $1`, [email]);
    if (!r.rowCount) return res.status(401).json({ erro: "Credenciais inválidas." });

    const user = r.rows[0];
    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) return res.status(401).json({ erro: "Credenciais inválidas." });

    const access_token = signAccessToken(user);
    const refresh_token = signRefreshToken(user);
    setRefreshCookie(res, req, refresh_token);

    return res.json({ token_type: "Bearer", access_token, expires_in: JWT_ACCESS_EXPIRES, user });
  } catch (e) {
    console.error("Erro ao fazer login (POST):", e);
    return res.status(500).json({ erro: "Erro interno do servidor. Não foi possível fazer login." });
  }
});

router.use(authMiddleware);

router.get("/", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nome, email, perfil, data_criacao, data_atualizacao
       FROM usuarios ORDER BY nome ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar usuários (GET):", err);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível listar usuários." });
  }
});

router.patch("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ erro: "ID do usuário inválido." });

  const { nome, email, perfil, senha } = req.body ?? {};

  if (!nome && !email && perfil === undefined && !senha)
    return res.status(400).json({ erro: "Nenhum campo para atualizar." });

  const erro = validarNome(nome) || validarEmail(email) || validarPerfil(perfil) || validarSenha(senha);
  if (erro) return res.status(400).json({ erro });

  try {
    const updates = [];
    const params = [];
    let idx = 1;

    if (nome) { updates.push(`nome = $${idx++}`); params.push(nome); }
    if (email) { updates.push(`email = $${idx++}`); params.push(email.toLowerCase()); }
    if (perfil !== undefined) { updates.push(`perfil = $${idx++}`); params.push(perfil); }
    if (senha) { 
      const senha_hash = await bcrypt.hash(senha, 12);
      updates.push(`senha_hash = $${idx++}`);
      params.push(senha_hash);
    }

    updates.push(`data_atualizacao = NOW()`);

    const query = `
      UPDATE usuarios
      SET ${updates.join(", ")}
      WHERE id = $${idx}
      RETURNING id, nome, email, perfil, data_criacao, data_atualizacao
    `;
    params.push(id);

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao atualizar usuário parcialmente (PATCH):", err);
    res.status(500).json({ erro: "Erro interno do servidor. Não foi possível atualizar parcialmente o usuário." });
  }
});

export default router;
