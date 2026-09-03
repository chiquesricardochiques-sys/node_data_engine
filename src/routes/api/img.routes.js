import express from "express";
import multer from "multer";
import validateApiKey from "../../middlewares/apiKey.middleware.js";
import * as controller from "../../controllers/api/img.controller.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_TMP_DIR = path.join(__dirname, "..", "..", "services", "img", "arquivos");
fs.mkdirSync(UPLOAD_TMP_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_TMP_DIR,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite 5MB
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
    if (tiposPermitidos.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error("Formato inválido. Envie apenas JPEG, PNG ou WebP."));
  },
});

router.post("/upload", validateApiKey, upload.single("imagem"), controller.uploadImagem);
router.put("/update", validateApiKey, upload.single("imagem"), controller.atualizarImagem);
router.delete("/delete", validateApiKey, controller.deletarImagem);
router.get("/url", validateApiKey, controller.urlOtimizada);

// Tratamento de erros do multer
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || "Erro no upload da imagem." });
  }
  next();
});

export default router;