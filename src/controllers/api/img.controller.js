import fs from "fs";
import * as servicesImg from "../../services/img/servicesImg.js";

function apagarArquivoTempSeExiste(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, () => {});
  }
}

export async function uploadImagem(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }

    const { project_code, id_instancia, table } = req.body;

    if (!project_code || !id_instancia || !table) {
      apagarArquivoTempSeExiste(req.file.path);
      return res.status(400).json({ error: "project_code, id_instancia e table são obrigatórios." });
    }

    // O próprio servicesImg.uploadImagem se encarrega de deletar o req.file.path no finally dele
    const resultado = await servicesImg.uploadImagem({
      filePath: req.file.path,
      project_code,
      id_instancia,
      table,
    });

    return res.status(201).json(resultado);
  } catch (error) {
    apagarArquivoTempSeExiste(req.file?.path);
    console.error("[img.controller] uploadImagem:", error.message);
    return res.status(500).json({ error: "Erro ao enviar imagem." });
  }
}

export async function atualizarImagem(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }

    const { project_code, id_instancia, table, public_id_antigo } = req.body;

    if (!project_code || !id_instancia || !table) {
      apagarArquivoTempSeExiste(req.file.path);
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
    apagarArquivoTempSeExiste(req.file?.path);
    console.error("[img.controller] atualizarImagem:", error.message);
    return res.status(500).json({ error: "Erro ao atualizar imagem." });
  }
}

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