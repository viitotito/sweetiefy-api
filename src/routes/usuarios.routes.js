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
    return jwt.sign(
        { sub: u.id, perfil: u.perfil, nome: u.nome },
        JWT_ACCESS_SECRET,
        { expiresIn: JWT_ACCESS_EXPIRES }
    );
}

function signRefreshToken(u) {
    return jwt.sign(
        { sub: u.id, tipo: "refresh" },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES }
    );
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

router.post("/register", async (req, res) => {
    const { nome, email, senha } = req.body ?? {};

    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: "Nome, email e senha são obrigatórios." });
    }

    if (senha.length < 6) {
        return res.status(400).json({ erro: "Senha deve ter pelo menos 6 caracteres." });
    }

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
        if (err?.code === "23505") {
            return res.status(409).json({ erro: "Email já foi cadastrado." });
        }
        console.error("Erro ao registrar usuário (POST):", err);
        return res.status(500).json({ erro: "Erro interno do servidor. Não foi possível registrar usuário." });
    }
});

router.post("/login", async (req, res) => {
    const { email, senha } = req.body ?? {};
    if (!email || !senha) {
        return res.status(400).json({ erro: "Campos email e senha são obrigatórios." });
    }
    try {
        const r = await pool.query(
            `SELECT "id","nome","email","senha_hash","perfil" FROM "usuarios" WHERE "email" = $1`,
            [email]
        );
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

router.post("/refresh", async (req, res) => {
    const refresh = req.cookies?.[REFRESH_COOKIE];
    if (!refresh) return res.status(401).json({ erro: "Refresh token ausente." });

    try {
        const payload = jwt.verify(refresh, JWT_REFRESH_SECRET);
        if (payload.tipo !== "refresh") return res.status(400).json({ erro: "Refresh token inválido." });

        const r = await pool.query(`SELECT "id","nome","email","perfil" FROM "usuarios" WHERE "id" = $1`, [payload.sub]);
        if (!r.rowCount) return res.status(401).json({ erro: "O usuário não existe mais." });

        const new_access = signAccessToken(r.rows[0]);
        return res.json({ token_type: "Bearer", access_token: new_access, expires_in: JWT_ACCESS_EXPIRES });
    } catch (e) {
        console.error("Erro ao validar refresh token (POST):", e);
        clearRefreshCookie(res, req);
        return res.status(401).json({ erro: "Refresh token inválido ou expirado." });
    }
});

router.post("/logout", (req, res) => {
    clearRefreshCookie(res, req);
    return res.status(204).json({mensagem: "Logout realizado com sucesso!"})
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

router.get("/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ erro: "ID do usuário inválido." });

    try {
        const { rows } = await pool.query(
            `SELECT id, nome, email, perfil, data_criacao, data_atualizacao
             FROM usuarios WHERE id = $1`,
            [id]
        );
        if (!rows.length) return res.status(404).json({ erro: "Usuário não encontrado." });
        res.json(rows[0]);
    } catch (err) {
        console.error("Erro ao buscar usuário (GET/:id):", err);
        res.status(500).json({ erro: "Erro interno do servidor. Não foi possível encontrar usuário." });
    }
});

router.patch("/:id", authMiddleware, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ erro: "ID do usuário inválido." });

    const { nome, email, perfil, senha } = req.body ?? {};

    if (!nome && !email && perfil === undefined && !senha) {
        return res.status(400).json({ erro: "Nenhum campo para atualizar." });
    }

    try {
        const updates = [];
        const params = [];
        let idx = 1;

        if (nome) {
            updates.push(`nome = $${idx++}`);
            params.push(nome);
        }
        if (email) {
            updates.push(`email = $${idx++}`);
            params.push(email.toLowerCase());
        }
        if (perfil !== undefined) {
            updates.push(`perfil = $${idx++}`);
            params.push(perfil);
        }
        if (senha) {
            if (senha.length < 6) return res.status(400).json({ erro: "Senha deve ter pelo menos 6 caracteres." });
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

        const { rows } = await pool.query(query, params);
        if (!rows.length) return res.status(404).json({ erro: "Usuário não encontrado." });

        res.json(rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar usuário:", err);
        res.status(500).json({ erro: "Erro interno do servidor." });
    }
});

router.delete("/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ erro: "ID do usuário inválido." });

    try {
        const { rowCount } = await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
        if (!rowCount) return res.status(404).json({ erro: "Usuário não encontrado." });
        res.status(204).end();
    } catch (err) {
        console.error("Erro ao deletar usuário (DELETE):", err);
        res.status(500).json({ erro: "Erro interno do servidor. Não foi possível excluir usuário." });
    }
});

export default router;
