import dotenv from "dotenv";

dotenv.config();

const { RECAPTCHA_SECRET_KEY } = process.env;

if (!RECAPTCHA_SECRET_KEY) {
    console.warn(
        "[WARN] RECAPTCHA_SECRET_KEY não definida. " +
        "A verificação de reCAPTCHA ficará DESATIVADA."
    );
}

export async function recaptchaMiddleware(req, res, next) {
    try {
        if (!RECAPTCHA_SECRET_KEY) {
            return next();
        }

        const recaptchaToken =
            req.body?.recaptchaToken ||
            req.body?.["g-recaptcha-response"];

        if (!recaptchaToken) {
            return res.status(400).json({
                erro: "reCAPTCHA é obrigatório.",
            });
        }

        const params = new URLSearchParams();
        params.append("secret", RECAPTCHA_SECRET_KEY);
        params.append("response", recaptchaToken);

        const googleRes = await fetch(
            "https://www.google.com/recaptcha/api/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
            }
        );

        if (!googleRes.ok) {
            console.error(
                "Falha HTTP ao verificar reCAPTCHA:",
                googleRes.status,
                googleRes.statusText
            );
            return res
                .status(502)
                .json({ erro: "falha ao verificar reCAPTCHA" });
        }

        const body = await googleRes.json();

        if (!body.success) {
            console.warn("reCAPTCHA inválido:", body);
            return res
                .status(403)
                .json({ erro: "verificação de reCAPTCHA falhou" });
        }

        req.recaptcha = body;

        return next();
    } catch (err) {
        console.error("Erro interno ao verificar reCAPTCHA:", err);
        return res
            .status(500)
            .json({ erro: "erro interno ao verificar reCAPTCHA" });
    }
}
