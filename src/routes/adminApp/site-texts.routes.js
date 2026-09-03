import express from 'express';
import multer from 'multer';
import goDataEngine from '../../services/goDataEngine.service.js';
import imgService from '../api/routsImg.js';

const router = express.Router();

const upload = multer({
    dest: 'src/uploads/tmp/',
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (tiposPermitidos.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG ou WEBP.'));
    },
});

// 📌 Função auxiliar para extrair dinamicamente os dados de tenant de cada request
function getTenantConfig(req) {
    const project_id = Number(req.body.project_id || req.query.project_id || process.env.PROJECT_ID) || 1;
    const id_instancia = Number(req.body.instance_id || req.body.id_instancia || req.query.instance_id || req.query.id_instancia || process.env.ID_INSTANCIA) || 1;
    const project_code = req.body.project_code || req.query.project_code || process.env.PROJECT_CODE || 'salao_beleza';
    
    return { project_id, id_instancia, project_code };
}

async function buscarTextoPorKey(req, key_name) {
    const { project_id, id_instancia } = getTenantConfig(req);
    const result = await goDataEngine.advancedSelect({
        project_id,
        id_instancia,
        table: 'site_texts',
        select: ['*'],
        where: { key_name },
        limit: 1
    });
    return (result.data || [])[0] || null;
}

async function atualizarOuCriarTexto(req, key_name, value) {
    const { project_id, id_instancia } = getTenantConfig(req);
    const existente = await buscarTextoPorKey(req, key_name);
    
    if (existente) {
        await goDataEngine.update(project_id, id_instancia, 'site_texts', { value }, { key_name });
    } else {
        await goDataEngine.insert({
            project_id,
            id_instancia,
            table: 'site_texts',
            data: { key_name, value }
        });
    }
}

// ----------------------------------------------------------------------------
// LISTAR TEXTOS DO SITE
// ----------------------------------------------------------------------------
router.post('/site-texts/list', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);

        const result = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'site_texts',
            select: ['*'],
            order_by: 'key_name ASC'
        });

        const textos = {};
        (result.data || []).forEach(t => { textos[t.key_name] = t.value; });

        return res.json({ success: true, data: { textos } });
    } catch (error) {
        console.error('Erro ao listar textos:', error);
        return res.status(500).json({ success: false, message: 'Erro ao listar textos' });
    }
});

// ----------------------------------------------------------------------------
// ATUALIZAR TEXTO DO SITE
// ----------------------------------------------------------------------------
router.post('/site-texts/update', async (req, res) => {
    try {
        const { key_name, value } = req.body;

        if (!key_name) {
            return res.status(400).json({ success: false, message: 'key_name é obrigatório' });
        }

        await atualizarOuCriarTexto(req, key_name, value);

        return res.json({ success: true, message: 'Texto atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar texto:', error);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar texto' });
    }
});

// ----------------------------------------------------------------------------
// UPLOAD DE IMAGEM PARA TEXTO/BANNER DO SITE
// ----------------------------------------------------------------------------
router.post('/site-texts/upload', upload.single('file'), async (req, res) => {
    try {
        const { project_code, id_instancia } = getTenantConfig(req);
        const { key_name } = req.body;

        if (!key_name || !req.file) {
            return res.status(400).json({ success: false, message: 'key_name e arquivo são obrigatórios' });
        }

        const publicIdKey = `${key_name}_public_id`;
        const antigo = await buscarTextoPorKey(req, publicIdKey);

        let imagem;
        if (antigo?.value) {
            imagem = await imgService.atualizarImagem({
                filePath: req.file.path,
                public_id_antigo: antigo.value,
                project_code,
                id_instancia,
                table: `site_texts_${key_name}`
            });
        } else {
            imagem = await imgService.uploadImagem({
                filePath: req.file.path,
                project_code,
                id_instancia,
                table: `site_texts_${key_name}`
            });
        }

        if (!imagem) {
            return res.status(500).json({ success: false, message: 'Erro ao subir imagem' });
        }

        const imageUrl = imagem.url || imagem.secure_url;
        const imagePublicId = imagem.public_id;

        await atualizarOuCriarTexto(req, key_name, imageUrl);
        await atualizarOuCriarTexto(req, publicIdKey, imagePublicId);

        return res.json({ success: true, message: 'Imagem atualizada com sucesso!', data: { url: imageUrl } });

    } catch (error) {
        console.error('Erro ao subir imagem de site-texts:', error);
        return res.status(500).json({ success: false, message: 'Erro ao subir imagem' });
    }
});

export default router;