import express from 'express';
import goDataEngine from '../../services/goDataEngine.service.js';

const router = express.Router();

// 📌 Função auxiliar para extrair e validar os IDs enviados dinamicamente pelo app
function getTenantIds(req) {
    const project_id = Number(req.body.project_id || req.query.project_id || process.env.PROJECT_ID) || 1;
    const id_instancia = Number(req.body.instance_id || req.body.id_instancia || req.query.instance_id || req.query.id_instancia || process.env.ID_INSTANCIA) || 1;
    
    return { project_id, id_instancia };
}

// ============================================================================
// HELPERS DE DATA
// ============================================================================
function hojeSQL() {
    return new Date().toISOString().split('T')[0];
}

function toSQL(date) {
    return date.toISOString().split('T')[0];
}

// Retorna { inicio, fim } da semana (segunda a domingo) que contém a data passada
function semanaDe(dataBase) {
    const diaSemana = dataBase.getDay() || 7; // domingo = 7
    const inicio = new Date(dataBase);
    inicio.setDate(dataBase.getDate() - diaSemana + 1);

    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);

    return { inicio: toSQL(inicio), fim: toSQL(fim) };
}

function mesAtual() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { inicio: toSQL(inicio), fim: toSQL(fim) };
}

// ============================================================================
// CONTAGENS BÁSICAS
// ============================================================================
async function contarPorStatusEData(project_id, id_instancia, status, dataExata = null, intervalo = null, profissional_id = null) {
    const where = { status };

    if (profissional_id) {
        where.profissional_id = Number(profissional_id);
    }

    if (dataExata) {
        where.data = dataExata;
    }

    // 🔧 SEMPRE via advancedSelect agora — nunca mais chama aggregate()
    const result = await goDataEngine.advancedSelect({
        project_id,
        id_instancia,
        table: 'agendamentos',
        select: ['id', 'data'],
        where
    });

    const linhas = result.data || [];

    if (intervalo) {
        return linhas.filter(a => a.data >= intervalo.inicio && a.data <= intervalo.fim).length;
    }

    return linhas.length;
}

// ============================================================================
// POR PROFISSIONAL
// ============================================================================
async function contarPorProfissional(project_id, id_instancia, hoje, semanaAtual) {
    const profResult = await goDataEngine.advancedSelect({
        project_id,
        id_instancia,
        table: 'profissionais',
        select: ['id', 'nome'],
        where: { ativo: 1 },
        order_by: 'nome ASC'
    });

    const profissionais = profResult.data || [];

    const resultado = [];

    for (const prof of profissionais) {
        const totalHoje = await contarPorStatusEData(project_id, id_instancia, 'agendado', hoje, null, prof.id);
        const totalSemana = await contarPorStatusEData(project_id, id_instancia, 'agendado', null, semanaAtual, prof.id);

        resultado.push({
            profissional_id: prof.id,
            nome: prof.nome,
            totalHoje,
            totalSemana
        });
    }

    return resultado;
}

// ============================================================================
// ENDPOINT PRINCIPAL
// ============================================================================
router.post('/dashboard/summary', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        
        const hoje = hojeSQL();
        const dataBase = new Date();

        const semanaAtual = semanaDe(dataBase);

        const semanaPassadaBase = new Date(dataBase);
        semanaPassadaBase.setDate(dataBase.getDate() - 7);
        const semanaAnterior = semanaDe(semanaPassadaBase);

        const mes = mesAtual();

        const [
            totalHoje,
            totalSemana,
            totalMes,
            totalSemanaAnterior,
            canceladosHoje,
            canceladosSemana,
            porProfissional
        ] = await Promise.all([
            contarPorStatusEData(project_id, id_instancia, 'agendado', hoje),
            contarPorStatusEData(project_id, id_instancia, 'agendado', null, semanaAtual),
            contarPorStatusEData(project_id, id_instancia, 'agendado', null, mes),
            contarPorStatusEData(project_id, id_instancia, 'agendado', null, semanaAnterior),
            contarPorStatusEData(project_id, id_instancia, 'cancelado', hoje),
            contarPorStatusEData(project_id, id_instancia, 'cancelado', null, semanaAtual),
            contarPorProfissional(project_id, id_instancia, hoje, semanaAtual)
        ]);

        const variacaoPercentual = totalSemanaAnterior > 0
            ? Number((((totalSemana - totalSemanaAnterior) / totalSemanaAnterior) * 100).toFixed(1))
            : (totalSemana > 0 ? 100 : 0);

        return res.json({
            success: true,
            data: {
                totalHoje,
                totalSemana,
                totalMes,
                comparativo: {
                    semanaAnterior: totalSemanaAnterior,
                    variacaoPercentual
                },
                canceladosHoje,
                canceladosSemana,
                porProfissional
            }
        });

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        return res.status(500).json({ success: false, message: 'Erro ao carregar dashboard' });
    }
});

export default router;