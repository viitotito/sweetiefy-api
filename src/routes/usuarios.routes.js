import { Router } from "express";         
import jwt from "jsonwebtoken";           
import bcrypt from "bcryptjs";            
import dotenv from "dotenv";              
import { pool } from "../database/db.js"; 
import { recaptchaMiddleware } from "../middlewares/recaptcha.js";

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

function signAccessToken(u) {
    return jwt.sign({ sub: u.id, papel: u.papel, nome: u.nome }, JWT_ACCESS_SECRET, {
        expiresIn: JWT_ACCESS_EXPIRES,
    });
}
function signRefreshToken(u) {
    return jwt.sign({ sub: u.id, tipo: "refresh" }, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES,
    });
}

function cookieOpts(req) {
    return {
        httpOnly: true,
        sameSite: "Lax",
        secure: isProduction,            
        path: req.baseUrl || "/",
        maxAge: REFRESH_MAX_AGE,
    };
}
function setRefreshCookie(res, req, token) {
    res.cookie(REFRESH_COOKIE, token, cookieOpts(req));
}
function clearRefreshCookie(res, req) {
    res.clearCookie(REFRESH_COOKIE, cookieOpts(req));
}

router.post("/register", recaptchaMiddleware, async (req, res) => {
    const { nome, email, senha } = req.body ?? {};
    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: "nome, email e senha são obrigatórios" });
    }
    if (String(senha).length < 6) {
        return res.status(400).json({ erro: "senha deve ter pelo menos 6 caracteres" });
    }

    try {
        const senha_hash = await bcrypt.hash(senha, 12); 
        const papel = 0;

        const r = await pool.query(
            `INSERT INTO "Usuarios" ("nome","email","senha_hash","papel")
             VALUES ($1,$2,$3,$4)
             RETURNING "id","nome","email","papel"`,
            [String(nome).trim(), String(email).trim().toLowerCase(), senha_hash, papel]
        );
        const user = r.rows[0];

        const access_token = signAccessToken(user);
        const refresh_token = signRefreshToken(user);
        setRefreshCookie(res, req, refresh_token);

        return res.status(201).json({
            token_type: "Bearer",
            access_token,
            expires_in: JWT_ACCESS_EXPIRES,
            user: { id: user.id, nome: user.nome, email: user.email, papel: user.papel },
        });
    } catch (err) {
        if (err?.code === "23505") return res.status(409).json({ erro: "email já cadastrado" });
        return res.status(500).json({ erro: "erro interno" });
    }
});

router.post("/login", recaptchaMiddleware, async (req, res) => {
    const { email, senha } = req.body ?? {};
    if (!email || !senha) return res.status(400).json({ erro: "email e senha são obrigatórios" });

    try {
        const r = await pool.query(
            `SELECT "id","nome","email","senha_hash","papel" FROM "Usuarios" WHERE "email" = $1`,
            [email]
        );
        if (!r.rowCount) return res.status(401).json({ erro: "credenciais inválidas" });

        const user = r.rows[0];
        const ok = await bcrypt.compare(senha, user.senha_hash); 
        if (!ok) return res.status(401).json({ erro: "credenciais inválidas" });

        const access_token = signAccessToken(user);    
        const refresh_token = signRefreshToken(user);  
        setRefreshCookie(res, req, refresh_token);  

        return res.json({
            token_type: "Bearer",
            access_token,
            expires_in: JWT_ACCESS_EXPIRES,
            user: { id: user.id, nome: user.nome, email: user.email, papel: user.papel },
        });
    } catch {
        return res.status(500).json({ erro: "erro interno" });
    }
});

router.post("/refresh", async (req, res) => {
    const refresh = req.cookies?.[REFRESH_COOKIE];
    if (!refresh) return res.status(401).json({ erro: "refresh ausente" });

    try {
        const payload = jwt.verify(refresh, JWT_REFRESH_SECRET);
        if (payload.tipo !== "refresh") return res.status(400).json({ erro: "refresh inválido" });

        const r = await pool.query(
            `SELECT "id","nome","email","papel" FROM "Usuarios" WHERE "id" = $1`,
            [payload.sub]
        );
        if (!r.rowCount) return res.status(401).json({ erro: "usuário não existe mais" });

        const user = r.rows[0];
        const new_access = signAccessToken(user);     

        return res.json({
            token_type: "Bearer",
            access_token: new_access,
            expires_in: JWT_ACCESS_EXPIRES,
        });
    } catch {
        clearRefreshCookie(res, req);
        return res.status(401).json({ erro: "refresh inválido ou expirado" });
    }
});

router.post("/logout", async (req, res) => {
    clearRefreshCookie(res, req);
    return res.status(204).end();
});

export default router;              
