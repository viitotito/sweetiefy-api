import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const { JWT_ACCESS_SECRET } = process.env;

export function authMiddleware(req, res, next) {
    try {

        const authorization_header = req.headers["authorization"];

        if (!authorization_header || !authorization_header.startsWith("Bearer ")) {
            return res.status(401).json({ erro: "token ausente" });
        }

        const token = authorization_header.slice(7);

        const payload = jwt.verify(token, JWT_ACCESS_SECRET);

        req.user = { id: payload.sub, perfil: payload.perfil, nome: payload.nome };

        next();
    } catch {
        return res.status(401).json({ erro: "token inválido" });
    }
}
