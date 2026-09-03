import express from 'express';
import goDataEngine from '../../services/goDataEngine.service.js';

const router = express.Router();

// 📌 Função auxiliar para extrair e validar os IDs enviados dinamicamente pelo app
function getTenantIds(req) {
    const project_id = Number(req.body.project_id || req.query.project_id || process.env.PROJECT_ID) || 1;
    const id_instancia = Number(req.body.instance_id || req.body.id_instancia || req.query.instance_id || req.query.id_instancia || process.env.ID_INSTANCIA) || 1;
    
    return { project_id, id_instancia };
}

function hojeSQL() {
    return new Date().toISOString().split('T')[0];
}

router.post('/blocks/list', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { profissional_id, data } = req.body;
        const hoje = hojeSQL();
        const dataSelecionada = data || hoje;

        if (!profissional_id) {
            return res.status(400).json({ success: false, message: 'profissional_id é obrigatório' });
        }

        const diasResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'dia_null',
            select: ['*'],
            where: { profissional_id: Number(profissional_id) },
            order_by: 'data ASC'
        });
        const diasBloqueados = (diasResult.data || []).filter(d => d.data >= hoje);

        const horasResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'orarios_null',
            select: ['*'],
            where: { profissional_id: Number(profissional_id), data: dataSelecionada },
            order_by: 'hora ASC'
        });

        return res.json({
            success: true,
            data: {
                diasBloqueados,
                horasBloqueadas: horasResult.data || [],
                data: dataSelecionada
            }
        });

    } catch (error) {
        console.error('Erro ao listar bloqueios:', error);
        return res.status(500).json({ success: false, message: 'Erro ao listar bloqueios' });
    }
});

router.post('/blocks/day/add', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { profissional_id, data, motivo } = req.body;
        const hoje = hojeSQL();

        if (!profissional_id || !data) {
            return res.status(400).json({ success: false, message: 'profissional_id e data são obrigatórios' });
        }

        if (data < hoje) {
            return res.status(400).json({ success: false, message: 'Não é possível bloquear datas passadas' });
        }

        await goDataEngine.insert(project_id, id_instancia, 'dia_null', {
            profissional_id: Number(profissional_id),
            data,
            motivo: motivo || null
        });

        return res.json({ success: true, message: 'Dia bloqueado com sucesso!' });

    } catch (error) {
        console.error('Erro ao bloquear dia:', error);
        return res.status(500).json({ success: false, message: 'Erro ao bloquear dia' });
    }
});

router.post('/blocks/hour/add', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { profissional_id, data, hora, motivo } = req.body;
        const hoje = hojeSQL();

        if (!profissional_id || !data || !hora) {
            return res.status(400).json({ success: false, message: 'profissional_id, data e hora são obrigatórios' });
        }

        if (data < hoje) {
            return res.status(400).json({ success: false, message: 'Não é possível bloquear horários passados' });
        }

        await goDataEngine.insert(project_id, id_instancia, 'orarios_null', {
            profissional_id: Number(profissional_id),
            data,
            hora,
            motivo: motivo || null
        });

        return res.json({ success: true, message: 'Horário bloqueado com sucesso!' });

    } catch (error) {
        console.error('Erro ao bloquear horário:', error);
        return res.status(500).json({ success: false, message: 'Erro ao bloquear horário' });
    }
});

router.post('/blocks/day/remove', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'id é obrigatório' });
        }

        await goDataEngine.delete(project_id, id_instancia, 'dia_null', { id: Number(id) });

        return res.json({ success: true, message: 'Bloqueio de dia removido!' });

    } catch (error) {
        console.error('Erro ao remover bloqueio de dia:', error);
        return res.status(500).json({ success: false, message: 'Erro ao remover bloqueio de dia' });
    }
});

router.post('/blocks/hour/remove', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'id é obrigatório' });
        }

        await goDataEngine.delete(project_id, id_instancia, 'orarios_null', { id: Number(id) });

        return res.json({ success: true, message: 'Bloqueio de horário removido!' });

    } catch (error) {
        console.error('Erro ao remover bloqueio de horário:', error);
        return res.status(500).json({ success: false, message: 'Erro ao remover bloqueio de horário' });
    }
});

export default router;