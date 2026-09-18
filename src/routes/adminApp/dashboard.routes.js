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
// HELPERS DE DATA — sempre no fuso de Brasília, nunca no fuso do servidor
// ============================================================================

// 🔧 "Hoje" calculado direto no fuso America/Sao_Paulo, não em UTC
function hojeSQL() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date()); // já sai como 'YYYY-MM-DD'
}

// Soma/subtrai dias em cima de uma data SQL (string), usando UTC só como
// calculadora de calendário — não tem instante real nem fuso envolvido aqui
function somarDias(dataSQL, dias) {
    const [y, m, d] = dataSQL.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + dias);
    return dt.toISOString().split('T')[0];
}

// Últimos 7 dias terminando hoje (hoje - 6 dias até hoje)
function ultimos7Dias(hoje) {
    return { inicio: somarDias(hoje, -6), fim: hoje };
}

// Mês calendário inteiro que contém "hoje"
function mesAtual(hoje) {
    const [y, m] = hoje.split('-').map(Number);
    const inicio = `${y}-${String(m).padStart(2, '0')}-01`;
    const ultimoDia = new Date(Date.UTC(y, m, 0)).getUTCDate(); // dia 0 do mês seguinte = último dia deste mês
    const fim = `${y}-${String(m).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    return { inicio, fim };
}

// ============================================================================
// CONTAGEM — AGENDAMENTOS NÃO CANCELADOS (agendado + andamento + concluido)
// ============================================================================
async function contarNaoCancelados(project_id, id_instancia, { dataExata = null, intervalo = null, profissional_id = null } = {}) {
    const where = {};

    if (profissional_id) {
        where.profissional_id = Number(profissional_id);
    }

    if (dataExata) {
        where.data = dataExata;
    }

    const result = await goDataEngine.advancedSelect({
        project_id,
        id_instancia,
        table: 'agendamentos',
        select: ['id', 'data', 'status'],
        where
    });

    let linhas = (result.data || []).filter(a => a.status !== 'cancelado');

    if (intervalo) {
        linhas = linhas.filter(a => a.data >= intervalo.inicio && a.data <= intervalo.fim);
    }

    return linhas.length;
}

// ============================================================================
// CONTAGEM — SÓ CANCELADOS
// ============================================================================
async function contarCancelados(project_id, id_instancia, { dataExata = null, intervalo = null } = {}) {
    const where = { status: 'cancelado' };

    if (dataExata) {
        where.data = dataExata;
    }

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
// POR PROFISSIONAL — agendamentos de hoje e da semana
// ============================================================================
async function contarPorProfissional(project_id, id_instancia, hoje, ultimos7) {
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
        const totalHoje = await contarNaoCancelados(project_id, id_instancia, { dataExata: hoje, profissional_id: prof.id });
        const totalSemana = await contarNaoCancelados(project_id, id_instancia, { intervalo: ultimos7, profissional_id: prof.id });

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
        const ultimos7 = ultimos7Dias(hoje);
        const mes = mesAtual(hoje);

        const [
            totalHoje,
            totalSemana,
            totalMes,
            canceladosHoje,
            canceladosSemana,
            porProfissional
        ] = await Promise.all([
            contarNaoCancelados(project_id, id_instancia, { dataExata: hoje }),
            contarNaoCancelados(project_id, id_instancia, { intervalo: ultimos7 }),
            contarNaoCancelados(project_id, id_instancia, { intervalo: mes }),
            contarCancelados(project_id, id_instancia, { dataExata: hoje }),
            contarCancelados(project_id, id_instancia, { intervalo: ultimos7 }),
            contarPorProfissional(project_id, id_instancia, hoje, ultimos7)
        ]);

        return res.json({
            success: true,
            data: {
                totalHoje,
                totalSemana,
                totalMes,
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