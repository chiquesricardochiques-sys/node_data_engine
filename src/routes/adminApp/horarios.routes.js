import express from 'express';
import goDataEngine from '../../services/goDataEngine.service.js';
import imgService from '../api/routsImg.js';

const router = express.Router();

// 📌 Função auxiliar para extrair e validar os IDs enviados dinamicamente pelo app
function getTenantIds(req) {
    const project_id = Number(req.body.project_id || req.query.project_id || process.env.PROJECT_ID) || 1;
    const id_instancia = Number(req.body.instance_id || req.body.id_instancia || req.query.instance_id || req.query.id_instancia || process.env.ID_INSTANCIA) || 1;
    
    return { project_id, id_instancia };
}

router.post('/horarios/list', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { profissional_id, data } = req.body;

        if (!profissional_id || !data) {
            return res.status(400).json({ success: false, message: 'profissional_id e data são obrigatórios' });
        }

        const result = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'horarios',
            select: ['*'],
            where: { profissional_id: Number(profissional_id), data },
            order_by: 'hora ASC'
        });

        return res.json({ success: true, data: { horarios: result.data || [] } });

    } catch (error) {
        console.error('Erro ao listar horários:', error);
        return res.status(500).json({ success: false, message: 'Erro ao listar horários' });
    }
});

router.post('/horarios/create', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { profissional_id, data, hora } = req.body;

        if (!profissional_id || !data || !hora) {
            return res.status(400).json({ success: false, message: 'profissional_id, data e hora são obrigatórios' });
        }

        await goDataEngine.insert(project_id, id_instancia, 'horarios', {
            profissional_id: Number(profissional_id),
            data,
            hora,
            status: 'livre'
        });

        return res.json({ success: true, message: 'Horário criado com sucesso!' });

    } catch (error) {
        console.error('Erro ao criar horário:', error);
        return res.status(500).json({ success: false, message: 'Erro ao criar horário' });
    }
});

router.post('/horarios/delete', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'id é obrigatório' });
        }

        await goDataEngine.delete(project_id, id_instancia, 'horarios', { id: Number(id) });

        return res.json({ success: true, message: 'Horário removido com sucesso!' });

    } catch (error) {
        console.error('Erro ao remover horário:', error);
        return res.status(500).json({ success: false, message: 'Erro ao remover horário' });
    }
});

export default router;