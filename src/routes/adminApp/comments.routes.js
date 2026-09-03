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

// 📌 Função auxiliar para extrair e validar os dados de tenant enviados dinamicamente pelo app
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
        table: 'comments',
    });
}

async function processarAtualizacaoImagem(req, public_id_antigo) {
    if (!req.file) return null;
    const { project_code, id_instancia } = getTenantConfig(req);
    
    return await imgService.atualizarImagem({
        filePath: req.file.path,
        public_id_antigo,
        project_code,
        id_instancia,
        table: 'comments',
    });
}

router.post('/comments/list', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);

        const result = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'comments',
            select: ['*'],
            order_by: 'id DESC'
        });

        return res.json({ success: true, data: { comentarios: result.data || [] } });
    } catch (error) {
        console.error('Erro ao listar comentários:', error);
        return res.status(500).json({ success: false, message: 'Erro ao listar comentários' });
    }
});

router.post('/comments/create', upload.single('img'), async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { nome, comentario } = req.body;
        const imagem = await processarImagem(req);

        await goDataEngine.insert(project_id, id_instancia, 'comments', {
            nome,
            comentario,
            img: imagem?.url || '',
            img_public_id: imagem?.public_id || null,
            ativo: 1
        });

        return res.json({ success: true, message: 'Comentário criado com sucesso!' });

    } catch (error) {
        console.error('Erro ao criar comentário:', error);
        return res.status(500).json({ success: false, message: 'Erro ao criar comentário.' });
    }
});

router.post('/comments/update', upload.single('img'), async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { id, nome, comentario, ativo } = req.body;

        const atualResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'comments',
            select: ['*'],
            where: { id: Number(id) },
            limit: 1
        });
        const comentarioAtual = (atualResult.data || [])[0] || null;

        const imagem = await processarAtualizacaoImagem(req, comentarioAtual?.img_public_id);

        const data = {
            nome,
            comentario,
            ativo: (ativo === 'on' || ativo === true || ativo === '1' || ativo === 1) ? 1 : 0
        };
        if (imagem) {
            data.img = imagem.url;
            data.img_public_id = imagem.public_id;
        }

        await goDataEngine.update(project_id, id_instancia, 'comments', data, { id: Number(id) });

        return res.json({ success: true, message: 'Comentário atualizado com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar comentário:', error);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar comentário.' });
    }
});

router.post('/comments/delete', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { id } = req.body;

        const atualResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'comments',
            select: ['*'],
            where: { id: Number(id) },
            limit: 1
        });
        const comentario = (atualResult.data || [])[0] || null;

        if (comentario?.img_public_id) {
            await imgService.deletarImagem(comentario.img_public_id).catch(() => {});
        }

        await goDataEngine.delete(project_id, id_instancia, 'comments', { id: Number(id) });

        return res.json({ success: true, message: 'Comentário removido com sucesso!' });

    } catch (error) {
        console.error('Erro ao remover comentário:', error);
        return res.status(500).json({ success: false, message: 'Erro ao remover comentário.' });
    }
});

export default router;