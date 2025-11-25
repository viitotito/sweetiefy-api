import express from "express";           
import dotenv from "dotenv";             
import cors from "cors";                 
import cookieParser from "cookie-parser";
import ingredientesRouter from "./routes/ingredientes.routes.js";  
import receitasRouter from "./routes/receitas.routes.js";  
import usuariosRouter from "./routes/usuarios.routes.js";  
import { authMiddleware } from "./middlewares/auth.js";    
import { globalLimiter, authLimiter, userLimiter } from "./middlewares/rateLimiters.js";

dotenv.config();                         
const app = express();                   

app.set("trust proxy", 1);

app.use(express.json());

app.use(cookieParser());

app.use(cors({ origin: true, credentials: true }));
app.use("/api", globalLimiter);

app.use("/api/usuarios/login", authLimiter);
app.use("/api/usuarios/register", authLimiter);
app.use("/api/usuarios/refresh", authLimiter);

app.use('/uploads', express.static('./uploads'));

app.get("/", (_req, res) => {
    res.json({
        "status": "server online"
    });
});

app.use("/api/usuarios", userLimiter,usuariosRouter);

app.use("/api/ingredientes", authMiddleware, userLimiter, ingredientesRouter);
app.use("/api/receitas", authMiddleware, userLimiter, receitasRouter);

const PORT = process.env.PORT || 3000;

const externalUrl = process.env.RENDER_EXTERNAL_URL;

const server = app.listen(PORT, () => {
    const baseUrl = externalUrl || `http://localhost:${PORT}`;
    console.log(`Servidor rodando em ${baseUrl}`);
    console.log("CORS configurado: permissivo (aceita qualquer origem).");
});

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
