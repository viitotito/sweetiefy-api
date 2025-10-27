import { Router } from "express";
import { pool } from "../database/db.js"; 

const router = Router();

router.get("/", async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, nome, preco, metrica, usuario_id, data_criacao, data_atualizacao 
             FROM ingredientes 
             ORDER BY nome ASC`
        );
        res.json(rows);
    } catch (e) {
        console.error("Erro ao listar ingredientes:", e);
        res.status(500).json({ erro: "Erro interno do servidor." });
    }
});

router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID do ingrediente inválido" });
    }

    try {
        const { rows } = await pool.query(
            `SELECT id, nome, preco, metrica, usuario_id, data_criacao, data_atualizacao 
             FROM ingredientes 
             WHERE id = $1`,
            [id]
        );
        
        if (!rows[0]) {
            return res.status(404).json({ erro: "Ingrediente não encontrado" });
        }
        
        res.json(rows[0]);
    } catch (e) {
        console.error("Erro ao buscar ingrediente:", e);
        res.status(500).json({ erro: "Erro interno do servidor." });
    }
});

router.post("/", async (req, res) => {
    const { nome, preco, metrica, usuario_id } = req.body ?? {};

    const uid = Number(usuario_id);
    const temUidValido = Number.isInteger(uid) && uid > 0;
    const temNomeValido = typeof nome === "string" && nome.trim().length > 0;
    const precoValido = typeof preco === 'number' && preco >= 0;
    const temMetricaValida = typeof metrica === "string" && metrica.trim().length > 0; 

    if (!temNomeValido || !precoValido || !temMetricaValida || !temUidValido) {
        return res.status(400).json({
            erro: "Campos obrigatórios: nome (string), preco (numero), metrica (string) e usuario_id (inteiro>0)",
        });
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO ingredientes (nome, preco, metrica, usuario_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nome, preco, metrica, usuario_id, data_criacao, data_atualizacao`,
            [nome.trim(), preco, metrica.trim(), uid]
        );
        res.status(201).json(rows[0]);
    } catch (e) {
        console.error("Erro ao criar ingrediente:", e);
        res.status(500).json({ erro: "Erro ao criar ingrediente. Verifique se o usuário existe e a métrica é válida." });
    }
});

router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { nome, preco, metrica, usuario_id } = req.body ?? {};

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID do ingrediente inválido" });
    }

    const uid = Number(usuario_id);
    const temUidValido = Number.isInteger(uid) && uid > 0;
    const temNomeValido = typeof nome === "string" && nome.trim().length > 0;
    const precoValido = typeof preco === 'number' && preco >= 0;
    const temMetricaValida = typeof metrica === "string" && metrica.trim().length > 0;

    if (!temNomeValido || !precoValido || !temMetricaValida || !temUidValido) {
        return res.status(400).json({
            erro: "Para PUT, envie todos os campos: nome (string), preco (numero), metrica (string) e usuario_id (inteiro>0)",
        });
    }

    try {
        const { rows } = await pool.query(
            `UPDATE ingredientes
                 SET nome = $1,
                     preco = $2,
                     metrica = $3,
                     usuario_id = $4,
                     data_atualizacao = now()
             WHERE id = $5
             RETURNING id, nome, preco, metrica, usuario_id, data_atualizacao`,
            [nome.trim(), preco, metrica.trim(), uid, id]
        );
        
        if (!rows[0]) {
            return res.status(404).json({ erro: "Ingrediente não encontrado" });
        }
        
        res.json(rows[0]);
    } catch (e) {
        console.error("Erro ao atualizar ingrediente (PUT):", e);
        res.status(500).json({ erro: "Erro interno do servidor." });
    }
});

router.patch("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { nome, preco, metrica, usuario_id } = req.body ?? {};

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID do ingrediente inválido" });
    }

    if (nome === undefined && preco === undefined && metrica === undefined && usuario_id === undefined) {
        return res.status(400).json({ erro: "Envie ao menos um campo para atualizar" });
    }

    const updates = [];
    const values = [id]; 
    let paramIndex = 2; 

    if (nome !== undefined) {
        if (typeof nome !== "string" || nome.trim() === "") {
            return res.status(400).json({ erro: "nome deve ser string não vazia" });
        }
        updates.push(`nome = $${paramIndex++}`);
        values.push(nome.trim());
    }

    if (preco !== undefined) {
        const p = Number(preco);
        if (typeof preco !== 'number' || p < 0) {
            return res.status(400).json({ erro: "preco deve ser um número não negativo" });
        }
        updates.push(`preco = $${paramIndex++}`);
        values.push(p);
    }

    if (metrica !== undefined) {
        if (typeof metrica !== "string" || metrica.trim() === "") {
            return res.status(400).json({ erro: "metrica deve ser string não vazia" });
        }
        updates.push(`metrica = $${paramIndex++}`);
        values.push(metrica.trim());
    }

    if (usuario_id !== undefined) {
        const uid = Number(usuario_id);
        if (!Number.isInteger(uid) || uid <= 0) {
            return res.status(400).json({ erro: "usuario_id deve ser inteiro > 0" });
        }
        updates.push(`usuario_id = $${paramIndex++}`);
        values.push(uid);
    }

    updates.push(`data_atualizacao = now()`);

    try {
        const query = `
            UPDATE ingredientes
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING id, nome, preco, metrica, usuario_id, data_atualizacao`;
            
        const { rows } = await pool.query(query, values);
        
        if (!rows[0]) {
            return res.status(404).json({ erro: "Ingrediente não encontrado" });
        }
        
        res.json(rows[0]);
    } catch (e) {
        console.error("Erro ao atualizar ingrediente (PATCH):", e);
        res.status(500).json({ erro: "Erro interno do servidor." });
    }
});

router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID do ingrediente inválido" });
    }

    try {
        const r = await pool.query(
            `DELETE FROM ingredientes WHERE id = $1 RETURNING id`,
            [id]
        );
        
        if (!r.rowCount) {
            return res.status(404).json({ erro: "Ingrediente não encontrado" });
        }
        
        res.status(204).end(); 
    } catch (e) {
        console.error("Erro ao deletar ingrediente:", e);
        res.status(500).json({ erro: "Erro interno do servidor." });
    }
});

export default router;