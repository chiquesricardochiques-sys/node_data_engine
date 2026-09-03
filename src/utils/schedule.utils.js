import goDataEngine from '../services/goDataEngine.service.js';

export function obterDiaSemana(data) {
    const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
    return dias[new Date(data).getDay()];
}

export function gerarHorariosDisponiveis(grade, agendamentos, intervalo = 30) {
    const horarios = [];
    if (!grade || !grade.abre) return horarios;

    function horaParaMinutos(hora) {
        const [h, m] = hora.substring(0, 5).split(":").map(Number);
        return h * 60 + m;
    }
    function minutosParaHora(minutos) {
        const h = Math.floor(minutos / 60).toString().padStart(2, "0");
        const m = (minutos % 60).toString().padStart(2, "0");
        return `${h}:${m}`;
    }

    const abertura = horaParaMinutos(grade.abertura);
    const fechamento = horaParaMinutos(grade.fechamento);
    const pausaInicio = grade.pausa_inicio ? horaParaMinutos(grade.pausa_inicio) : null;
    const pausaFim = grade.pausa_fim ? horaParaMinutos(grade.pausa_fim) : null;

    for (let minuto = abertura; minuto < fechamento; minuto += intervalo) {
        if (pausaInicio !== null && pausaFim !== null && minuto >= pausaInicio && minuto < pausaFim) continue;
        horarios.push({ hora: minutosParaHora(minuto), disponivel: true, agendamento: null, servicos: null });
    }

    for (const agendamento of agendamentos) {
        const inicio = horaParaMinutos(agendamento.hora);
        const fim = inicio + Number(agendamento.duracao_total);

        for (const horario of horarios) {
            const atual = horaParaMinutos(horario.hora);
            if (atual >= inicio && atual < fim) {
                horario.disponivel = false;
                horario.agendamento = agendamento.id;
                horario.servicos = agendamento.servicos;
            }
        }
    }

    return horarios;
}

function agruparPorAgendamento(linhas) {
    const mapa = new Map();

    for (const linha of linhas) {
        if (!mapa.has(linha.id)) {
            mapa.set(linha.id, {
                id: linha.id,
                hora: linha.hora,
                duracao_total: 0,
                servicos: []
            });
        }
        const item = mapa.get(linha.id);
        item.duracao_total += Number(linha.duracao_min);
        item.servicos.push(linha.servico_nome);
    }

    return Array.from(mapa.values());
}

export async function buscarGradeEHorarios(project_id, id_instancia, profissional_id, data) {
    // 1. Busca os dados do profissional para checar se ele usa horários
    const profResult = await goDataEngine.advancedSelect({
        project_id,
        id_instancia,
        table: 'profissionais',
        select: ['id', 'usa_horarios'],
        where: { id: Number(profissional_id) },
        limit: 1
    });

    const profissional = (profResult.data && profResult.data[0]) || null;

    // 🔧 SE USA_HORARIOS FOR 0: Retornamos um objeto/sinalizador especial
    if (profissional && Number(profissional.usa_horarios) === 0) {
        return {
            usa_horarios: 0,
            horarios: []
        };
    }

    // Caso contrário, segue o fluxo normal de grade de horários
    const diaSemana = obterDiaSemana(data);

    const gradeResult = await goDataEngine.advancedSelect({
        project_id,
        id_instancia,
        table: 'professional_schedule',
        select: ['abre', 'abertura', 'pausa_inicio', 'pausa_fim', 'fechamento'],
        where: { profissional_id: Number(profissional_id), dia_semana: diaSemana },
        limit: 1
    });

    const grade = (gradeResult.data && gradeResult.data[0]) || null;
    if (!grade) return { usa_horarios: 1, horarios: [] };

    const linhasResult = await goDataEngine.advancedSelect({
        project_id,
        id_instancia,
        table: 'agendamentos',
        alias: 'a',
        select: ['a.id', 'a.hora', 's.nome AS servico_nome', 's.duracao_min'],
        joins: [
            { type: 'INNER', table: 'agendamento_servicos', alias: 'ags', on: 'a.id = ags.agendamento_id' },
            { type: 'INNER', table: 'servicos', alias: 's', on: 'ags.servico_id = s.id' }
        ],
        where: {
            'a.profissional_id': Number(profissional_id),
            'a.data': data,
            'a.status': 'agendado'
        },
        order_by: 'a.hora ASC'
    });

    const linhas = linhasResult.data || [];
    const agendamentos = agruparPorAgendamento(linhas);

    let horarios = gerarHorariosDisponiveis(grade, agendamentos);

    const hoje = new Date().toISOString().split('T')[0];
    if (data === hoje) {
        const agora = new Date();
        const horaAtualMinutos = agora.getHours() * 60 + agora.getMinutes();

        horarios = horarios.filter(h => {
            const [hh, mm] = h.hora.split(':').map(Number);
            return (hh * 60 + mm) > horaAtualMinutos;
        });
    }

    return {
        usa_horarios: 1,
        horarios
    };
}