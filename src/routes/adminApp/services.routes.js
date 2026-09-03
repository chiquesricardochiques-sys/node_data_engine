import express from 'express';
import multer from 'multer';
import goDataEngine from '../../services/goDataEngine.service.js';
import * as imgService from '../../services/img/servicesImg.js';

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

async function processarImagem(req) {
    if (!req.file) return null;
    const { project_code, id_instancia } = getTenantConfig(req);
    
    return await imgService.uploadImagem({
        filePath: req.file.path,
        project_code,
        id_instancia,
        table: 'servicos',
    });
}

// ----------------------------------------------------------------------------
// LISTAR SERVIÇOS
// ----------------------------------------------------------------------------
router.post('/services/list', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);

        const result = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'servicos',
            select: ['*'],
            order_by: 'criado_em DESC'
        });

        return res.json({ success: true, data: { servicos: result.data || [] } });
    } catch (error) {
        console.error('Erro ao listar serviços:', error);
        return res.status(500).json({ success: false, message: 'Erro ao listar serviços' });
    }
});

// ----------------------------------------------------------------------------
// CRIAR SERVIÇO
// ----------------------------------------------------------------------------
router.post('/services/create', upload.single('img'), async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { nome, duracao_min, preco } = req.body;

        if (!nome || !duracao_min || !preco) {
            return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
        }

        const imagem = await processarImagem(req);

        // 🔧 Estrutura de inserção unificada suportada pelo goDataEngine
        await goDataEngine.insert({
            project_id,
            id_instancia,
            table: 'servicos',
            data: {
                nome,
                duracao_min,
                preco,
                img: imagem?.url || imagem?.secure_url || null
            }
        });

        return res.json({ success: true, message: 'Serviço criado com sucesso!' });

    } catch (error) {
        console.error('Erro ao criar serviço:', error);
        return res.status(500).json({ success: false, message: 'Erro ao criar serviço.' });
    }
});

// ----------------------------------------------------------------------------
// ATUALIZAR SERVIÇO
// ----------------------------------------------------------------------------
router.post('/services/update', upload.single('img'), async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { id, nome, duracao_min, preco } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID do serviço é obrigatório.' });
        }

        const imagem = await processarImagem(req);

        const data = { nome, duracao_min, preco };
        if (imagem) {
            data.img = imagem.url || imagem.secure_url;
        }

        await goDataEngine.update(project_id, id_instancia, 'servicos', data, { id: Number(id) });

        return res.json({ success: true, message: 'Serviço atualizado com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar serviço.' });
    }
});

// ----------------------------------------------------------------------------
// REMOVER SERVIÇO
// ----------------------------------------------------------------------------
router.post('/services/delete', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID do serviço é obrigatório.' });
        }

        await goDataEngine.delete(project_id, id_instancia, 'servicos', { id: Number(id) });

        return res.json({ success: true, message: 'Serviço removido com sucesso!' });

    } catch (error) {
        console.error('Erro ao remover serviço:', error);
        return res.status(500).json({ success: false, message: 'Erro ao remover serviço.' });
    }
});

export default router;