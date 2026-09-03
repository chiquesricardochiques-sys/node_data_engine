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

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const ORDEM_DIAS = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 7 };

async function listarGrade(project_id, id_instancia, profissional_id) {
    const result = await goDataEngine.advancedSelect({
        project_id,
        id_instancia,
        table: 'professional_schedule',
        select: ['*'],
        where: { profissional_id: Number(profissional_id) }
    });

    const grade = result.data || [];
    return grade.sort((a, b) => ORDEM_DIAS[a.dia_semana] - ORDEM_DIAS[b.dia_semana]);
}

router.post('/professional-schedule/get', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { profissional_id } = req.body;

        if (!profissional_id) {
            return res.status(400).json({ success: false, message: 'profissional_id é obrigatório' });
        }

        const profResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: ['*'],
            where: { id: Number(profissional_id) },
            limit: 1
        });
        const profissional = (profResult.data || [])[0] || null;

        if (!profissional) {
            return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
        }

        let schedule = await listarGrade(project_id, id_instancia, profissional_id);

        // preenche dias que ainda não têm grade com padrão
        for (const dia of DIAS) {
            if (!schedule.find(s => s.dia_semana === dia)) {
                schedule.push({
                    dia_semana: dia,
                    abre: 1,
                    abertura: '09:00:00',
                    pausa_inicio: '12:00:00',
                    pausa_fim: '13:00:00',
                    fechamento: '18:00:00'
                });
            }
        }
        schedule.sort((a, b) => ORDEM_DIAS[a.dia_semana] - ORDEM_DIAS[b.dia_semana]);

        return res.json({ success: true, data: { profissional, schedule } });

    } catch (error) {
        console.error('Erro ao buscar grade do profissional:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar grade do profissional' });
    }
});

router.post('/professional-schedule/update', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { profissional_id, dados } = req.body;

        if (!profissional_id || !dados) {
            return res.status(400).json({ success: false, message: 'profissional_id e dados são obrigatórios' });
        }

        for (const dia of DIAS) {
            const abre = dados[`${dia}_abre`] === 'on' || dados[`${dia}_abre`] === true ? 1 : 0;
            const abertura = dados[`${dia}_abertura`] || '09:00:00';
            const pausa_inicio = dados[`${dia}_pausa_inicio`] || null;
            const pausa_fim = dados[`${dia}_pausa_fim`] || null;
            const fechamento = dados[`${dia}_fechamento`] || '18:00:00';

            const existenteResult = await goDataEngine.advancedSelect({
                project_id,
                id_instancia,
                table: 'professional_schedule',
                select: ['*'],
                where: { profissional_id: Number(profissional_id), dia_semana: dia },
                limit: 1
            });
            const existente = (existenteResult.data || [])[0] || null;

            const data = { abre, abertura, pausa_inicio, pausa_fim, fechamento };

            if (existente) {
                await goDataEngine.update(project_id, id_instancia, 'professional_schedule', data, {
                    profissional_id: Number(profissional_id),
                    dia_semana: dia
                });
            } else {
                await goDataEngine.insert(project_id, id_instancia, 'professional_schedule', {
                    profissional_id: Number(profissional_id),
                    dia_semana: dia,
                    ...data
                });
            }
        }

        return res.json({ success: true, message: 'Grade semanal atualizada com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar grade do profissional:', error);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar grade do profissional' });
    }
});

export default router;