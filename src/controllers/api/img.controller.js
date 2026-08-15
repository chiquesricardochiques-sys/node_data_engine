import * as servicesImg from "../../services/img/servicesImg.js";

/**
 * POST /upload
 * Recebe a imagem (multer -> req.file) + dados de organização da pasta.
 * Sobe pro Cloudinary e retorna a url/public_id. Não mexe em banco.
 *
 * Body esperado (multipart/form-data):
 *  - imagem (arquivo)
 *  - project_code, id_instancia, table
 */
export async function uploadImagem(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }

    const { project_code, id_instancia, table } = req.body;

    if (!project_code || !id_instancia || !table) {
      return res.status(400).json({ error: "project_code, id_instancia e table são obrigatórios." });
    }

    const resultado = await servicesImg.uploadImagem({
      filePath: req.file.path,
      project_code,
      id_instancia,
      table,
    });

    return res.status(201).json(resultado);
  } catch (error) {
    console.error("[img.controller] uploadImagem:", error.message);
    return res.status(500).json({ error: "Erro ao enviar imagem." });
  }
}

/**
 * PUT /update
 * Substitui uma imagem existente (sobe a nova, apaga a antiga do Cloudinary).
 * Retorna a nova url/public_id — quem chamou decide o que fazer com o registro antigo.
 *
 * Body esperado (multipart/form-data):
 *  - imagem (arquivo)
 *  - project_code, id_instancia, table
 *  - public_id_antigo
 */
export async function atualizarImagem(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }

    const { project_code, id_instancia, table, public_id_antigo } = req.body;

    if (!project_code || !id_instancia || !table) {
      return res.status(400).json({ error: "project_code, id_instancia e table são obrigatórios." });
    }

    const resultado = await servicesImg.atualizarImagem({
      filePath: req.file.path,
      public_id_antigo,
      project_code,
      id_instancia,
      table,
    });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("[img.controller] atualizarImagem:", error.message);
    return res.status(500).json({ error: "Erro ao atualizar imagem." });
  }
}

/**
 * DELETE /delete
 * Remove a imagem do Cloudinary pelo public_id. Não mexe em banco.
 *
 * Body esperado (JSON):
 *  - public_id
 */
export async function deletarImagem(req, res) {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({ error: "public_id é obrigatório." });
    }

    await servicesImg.deletarImagem(public_id);

    return res.status(200).json({ message: "Imagem removida com sucesso." });
  } catch (error) {
    console.error("[img.controller] deletarImagem:", error.message);
    return res.status(500).json({ error: "Erro ao deletar imagem." });
  }
}

/**
 * GET /url?public_id=...&width=...&height=...&crop=...
 * Gera uma url otimizada/transformada em cima do public_id.
 */
export function urlOtimizada(req, res) {
  try {
    const { public_id, width, height, crop } = req.query;

    if (!public_id) {
      return res.status(400).json({ error: "public_id é obrigatório." });
    }

    const url = servicesImg.urlOtimizada(public_id, {
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      crop,
    });

    return res.status(200).json({ url });
  } catch (error) {
    console.error("[img.controller] urlOtimizada:", error.message);
    return res.status(500).json({ error: "Erro ao gerar url." });
  }
}