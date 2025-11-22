import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,     
  limit: 300,                  
  standardHeaders: "draft-7",  
  legacyHeaders: false,        
  message: { erro: "Muitas requisições. Tente novamente em instantes." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    
  limit: 10,                   
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de autenticação. Aguarde alguns minutos." },
});

export const userLimiter = rateLimit({
  windowMs: 60 * 1000,       
  limit: 60,                  
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?.uid) return `uid:${req.user.uid}`;
    return ipKeyGenerator(req.ip); 
  },
  message: { erro: "Você fez muitas requisições. Reduza o ritmo." },
});
