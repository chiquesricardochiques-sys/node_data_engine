/**
 * Middleware para validar chave de acesso
 */

export default function validateApiKey(req, res, next) {
  // Lê as chaves DENTRO da função, quando ela é executada
  const validKeys = process.env.API_KEYS ? process.env.API_KEYS.split(",") : [];
  const key = req.headers["x-api-key"];
  
  console.log("🔑 Chave recebida:", key);
  console.log("🔑 Chaves válidas:", validKeys);
  console.log("🔑 process.env.API_KEYS:", process.env.API_KEYS);
  console.log("✅ Chave válida?", validKeys.includes(key));
  
  if (!key || !validKeys.includes(key)) {
    return res.status(401).json({ success: false, message: "Chave de API inválida ou ausente" });
  }
  next();
}