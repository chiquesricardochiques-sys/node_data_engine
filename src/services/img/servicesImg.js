import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Monta o caminho da pasta no Cloudinary isolado por instância/tabela
 * ex: salao_beleza/4/clientes
 */
function montarPasta({ project_code, id_instancia, table }) {
  return `${project_code}/${id_instancia}/${table}`;
}

/**
 * Sobe uma imagem local (temp, vinda do multer) pro Cloudinary.
 */
export async function uploadImagem({ filePath, project_code, id_instancia, table }) {
  try {
    const pasta = montarPasta({ project_code, id_instancia, table });

    const result = await cloudinary.uploader.upload(filePath, {
      folder: pasta,
      resource_type: "image",
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    };
  } finally {
    fs.unlink(filePath, () => {});
  }
}

/**
 * Substitui uma imagem existente: sobe a nova, apaga a antiga.
 */
export async function atualizarImagem({ filePath, public_id_antigo, project_code, id_instancia, table }) {
  const nova = await uploadImagem({ filePath, project_code, id_instancia, table });

  if (public_id_antigo) {
    await cloudinary.uploader.destroy(public_id_antigo).catch(() => {});
  }

  return nova;
}

/**
 * Remove a imagem do Cloudinary pelo public_id.
 */
export async function deletarImagem(public_id) {
  if (!public_id) return null;
  return cloudinary.uploader.destroy(public_id);
}

/**
 * Gera URL otimizada/transformada a partir do public_id.
 */
export function urlOtimizada(public_id, { width, height, crop = "fill" } = {}) {
  return cloudinary.url(public_id, {
    width,
    height,
    crop,
    quality: "auto",
    fetch_format: "auto",
  });
}