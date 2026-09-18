import express from 'express';
import bcrypt from 'bcrypt';
import goDataEngine from '../../services/goDataEngine.service.js';
import { buscarGradeEHorarios } from '../../utils/schedule.utils.js';

const router = express.Router();

// 📌 Função auxiliar para extrair dinamicamente os dados do tenant de cada request
function getTenantConfig(req) {
    const project_id = Number(req.body.project_id || req.query.project_id || process.env.PROJECT_ID) || 1;
    const id_instancia = Number(req.body.instance_id || req.body.id_instancia || req.query.instance_id || req.query.id_instancia || process.env.ID_INSTANCIA) || 1;
    
    return { project_id, id_instancia };
}

function hojeSQL() {
    return new Date().toISOString().split('T')[0];
}

// ============================================================================
// LOGIN PROFISSIONAL
// ============================================================================
router.post('/login-profissional', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const profResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: ['*'],
            where: { email: emailNormalizado },
            limit: 1
        });

        const profissional = (profResult.data || [])[0] || null;

        if (!profissional || !profissional.senha_hash) {
            return res.status(401).json({ success: false, message: 'Email ou senha incorretos!' });
        }

        if (profissional.ativo === 0) {
            return res.status(403).json({ success: false, message: 'Este profissional está inativo.' });
        }

        const senhaValida = await bcrypt.compare(senha.trim(), profissional.senha_hash);

        if (!senhaValida) {
            return res.status(401).json({ success: false, message: 'Email ou senha incorretos!' });
        }

        return res.json({
            success: true,
            data: {
                profissional: {
                    id: profissional.id,
                    nome: profissional.nome,
                    email: profissional.email,
                    especialidade: profissional.especialidade,
                    img: profissional.img
                }
            }
        });

    } catch (error) {
        console.error('Erro ao validar login do profissional:', error);
        return res.status(500).json({ success: false, message: 'Erro ao validar login' });
    }
});

// ============================================================================
// AGENDA DO PROFISSIONAL — Suporta filtro por status e regra de usa_horarios
// ============================================================================
router.post('/professional-app/agenda', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { profissional_id, data, status } = req.body;

        if (!profissional_id) {
            return res.status(400).json({ success: false, message: 'profissional_id é obrigatório' });
        }

        const dataConsulta = data || hojeSQL();

        // 1. Buscar se o profissional usa horários E o percentual de comissão dele
        const profResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: ['usa_horarios', 'percentual_comissao'], // <--- ADICIONADO percentual_comissao
            where: { id: Number(profissional_id) },
            limit: 1
        });

        const profData = (profResult.data || [])[0];
        const usaHorarios = profData && profData.usa_horarios !== undefined ? Number(profData.usa_horarios) : 1;
        // Pega a comissão do profissional (caso o nome da coluna no banco seja diferente, ajuste aqui, ex: comissao)
        const percentualComissaoProfissional = profData && profData.percentual_comissao !== undefined ? Number(profData.percentual_comissao) : 0;

        // 2. Buscar agendamentos
        const linhasResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'agendamentos',
            alias: 'a',
            select: [
                'a.id', 'a.hora', 'a.status', 'a.observacoes',
                'c.nome AS cliente_nome', 'c.telefone AS cliente_telefone',
                's.nome AS servico_nome', 's.duracao_min', 's.preco AS servico_preco'
            ],
            joins: [
                { type: 'INNER', table: 'clientes', alias: 'c', on: 'a.cliente_id = c.id' },
                { type: 'INNER', table: 'agendamento_servicos', alias: 'ags', on: 'a.id = ags.agendamento_id' },
                { type: 'INNER', table: 'servicos', alias: 's', on: 'ags.servico_id = s.id' }
            ],
            where: {
                'a.profissional_id': Number(profissional_id),
                'a.data': dataConsulta
            },
            order_by: 'a.data DESC, a.hora ASC'
        });

        const linhas = linhasResult.data || [];
        const mapa = new Map();

        for (const linha of linhas) {
            if (!mapa.has(linha.id)) {
                const telefone = linha.cliente_telefone || null;
                const nomeCliente = linha.cliente_nome || 'N/A';

                const gerarLinkWhatsApp = (tel, nome) => {
                    if (!tel) return null;
                    const numeros = tel.replace(/\D/g, '');
                    if (!numeros) return null;
                    let telFormatado = numeros;
                    if (telFormatado.length === 10 || telFormatado.length === 11) {
                        telFormatado = '55' + telFormatado;
                    }
                    const msg = encodeURIComponent(`Olá ${nome}, tudo bem?`);
                    return `https://wa.me/${telFormatado}?text=${msg}`;
                };

                mapa.set(linha.id, {
                    id: linha.id,
                    data: dataConsulta,
                    hora: linha.hora,
                    usa_horarios: usaHorarios,
                    status: String(linha.status || '').toLowerCase().trim(),
                    observacoes: linha.observacoes,
                    cliente: nomeCliente,
                    cliente_telefone: telefone,
                    whatsapp_link: gerarLinkWhatsApp(telefone, nomeCliente),
                    servicos: [],
                    duracao_total: 0,
                    preco_total: 0,
                    percentual_comissao: percentualComissaoProfissional // <--- ADICIONADO AQUI PARA ENVIAR AO APP
                });
            }
            const item = mapa.get(linha.id);
            item.servicos.push(linha.servico_nome);
            item.duracao_total += Number(linha.duracao_min);
            item.preco_total += Number(linha.servico_preco);
        }

        let agendamentos = Array.from(mapa.values());

        if (status && status !== 'todos') {
            const stFormatado = String(status).toLowerCase().trim();
            agendamentos = agendamentos.filter(item => item.status === stFormatado);
        }

        return res.json({ success: true, data: { agendamentos, data: dataConsulta } });

    } catch (error) {
        console.error('Erro ao buscar agenda do profissional:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar agenda' });
    }
});
// ============================================================================
// ATUALIZAR STATUS DO AGENDAMENTO (Salvando a porcentagem da comissão)
// ============================================================================
router.post('/professional-app/alterar-status', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { agendamento_id, profissional_id, novo_status } = req.body;

        const statusValidos = ['agendado', 'andamento', 'concluido', 'cancelado'];
        const statusFormatado = String(novo_status || '').toLowerCase().trim();

        if (!agendamento_id || !profissional_id || !statusFormatado) {
            return res.status(400).json({ success: false, message: 'Dados incompletos' });
        }

        if (!statusValidos.includes(statusFormatado)) {
            return res.status(400).json({ success: false, message: 'Status inválido' });
        }

        // Objeto base que será atualizado no banco
        let dadosAtualizacao = { status: statusFormatado };

        // Se o status for 'andamento', buscamos a comissão atual do profissional
        if (statusFormatado === 'andamento') {
            const profResult = await goDataEngine.advancedSelect({
                project_id,
                id_instancia,
                table: 'profissionais',
                select: ['tipo_remuneracao', 'percentual_comissao', 'salario_fixo'],
                where: { id: Number(profissional_id) },
                limit: 1
            });
            const prof = (profResult.data || [])[0];
            
            if (prof && prof.percentual_comissao !== undefined) {
                // Insere a porcentagem no objeto que vai para a tabela agendamentos
                // (Certifique-se de que a coluna se chama 'percentual_comissao' na sua tabela agendamentos)
                dadosAtualizacao.percentual_comissao = prof.percentual_comissao;
            }
        }

        // Executa o update com a assinatura correta do goDataEngine
        await goDataEngine.update(
            project_id,                     // 1º: project_id
            id_instancia,                   // 2º: id_instancia
            'agendamentos',                 // 3º: table
            dadosAtualizacao,               // 4º: data (agora contendo o status e a comissão)
            {                               // 5º: where
                id: Number(agendamento_id),
                profissional_id: Number(profissional_id)
            }
        );

        return res.json({ 
            success: true, 
            message: 'Status e comissão atualizados com sucesso!',
            data: { novo_status: statusFormatado }
        });

    } catch (error) {
        console.error('❌ Erro ao alterar status no banco:', error);
        return res.status(500).json({ success: false, message: error.message || 'Erro ao atualizar status' });
    }
});

// ============================================================================
// RESUMO — Totais de Hoje, Semana e Mês
// ============================================================================
router.post('/professional-app/resumo', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { profissional_id } = req.body;

        if (!profissional_id) {
            return res.status(400).json({ success: false, message: 'profissional_id é obrigatório' });
        }

        const agora = new Date();
        const hojeIso = agora.toISOString().split('T')[0];

        const diaSemana = agora.getDay();
        const diffSegunda = agora.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
        const inicioSemanaObj = new Date(agora);
        inicioSemanaObj.setDate(diffSegunda);
        const inicioSemana = inicioSemanaObj.toISOString().split('T')[0];

        const fimSemanaObj = new Date(inicioSemanaObj);
        fimSemanaObj.setDate(inicioSemanaObj.getDate() + 6);
        const fimSemana = fimSemanaObj.toISOString().split('T')[0];

        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const inicioMes = `${ano}-${mes}-01`;
        const ultimoDiaMes = new Date(ano, agora.getMonth() + 1, 0).getDate();
        const fimMes = `${ano}-${mes}-${String(ultimoDiaMes).padStart(2, '0')}`;

        const result = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'agendamentos',
            select: ['id', 'data', 'status'],
            where: { 
                profissional_id: Number(profissional_id)
            }
        });

        const linhas = (result.data || []).filter(a => a.status !== 'cancelado');

        const totalHoje = linhas.filter(a => a.data === hojeIso).length;
        const totalSemana = linhas.filter(a => a.data >= inicioSemana && a.data <= fimSemana).length;
        const totalMes = linhas.filter(a => a.data >= inicioMes && a.data <= fimMes).length;

        return res.json({
            success: true,
            data: { totalHoje, totalSemana, totalMes }
        });

    } catch (error) {
        console.error('Erro ao buscar resumo do profissional:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar resumo' });
    }
});

// ============================================================================
// HISTÓRICO DE AGENDAMENTOS
// ============================================================================
router.post('/professional-app/historico', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { profissional_id, periodo } = req.body;

        if (!profissional_id) {
            return res.status(400).json({ success: false, message: 'profissional_id é obrigatório' });
        }

        const agora = new Date();
        const hojeIso = agora.toISOString().split('T')[0];

        // 1. Buscar se o profissional usa horários ou não
        const profResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: ['usa_horarios'],
            where: { id: Number(profissional_id) },
            limit: 1
        });

        const profData = (profResult.data || [])[0];
        const usaHorarios = profData && profData.usa_horarios !== undefined ? Number(profData.usa_horarios) : 1;

        let dataInicio = null;
        if (periodo === 'dia') {
            dataInicio = hojeIso;
        } else if (periodo === 'semana') {
            const diaSemana = agora.getDay();
            const diffSegunda = agora.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
            const inicioSemanaObj = new Date(agora);
            inicioSemanaObj.setDate(diffSegunda);
            dataInicio = inicioSemanaObj.toISOString().split('T')[0];
        } else if (periodo === 'mes') {
            const ano = agora.getFullYear();
            const mes = String(agora.getMonth() + 1).padStart(2, '0');
            dataInicio = `${ano}-${mes}-01`;
        }

        const linhasResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'agendamentos',
            alias: 'a',
            select: [
                'a.id', 'a.data', 'a.hora', 'a.status', 'a.observacoes',
                'c.nome AS cliente_nome',
                's.nome AS servico_nome', 's.duracao_min', 's.preco AS servico_preco'
            ],
            joins: [
                { type: 'INNER', table: 'clientes', alias: 'c', on: 'a.cliente_id = c.id' },
                { type: 'INNER', table: 'agendamento_servicos', alias: 'ags', on: 'a.id = ags.agendamento_id' },
                { type: 'INNER', table: 'servicos', alias: 's', on: 'ags.servico_id = s.id' }
            ],
            where: { 'a.profissional_id': Number(profissional_id) },
            order_by: 'a.data DESC, a.hora DESC'
        });

        const linhas = linhasResult.data || [];
        const mapa = new Map();

        for (const linha of linhas) {
            if (!mapa.has(linha.id)) {
                mapa.set(linha.id, {
                    id: linha.id,
                    data: linha.data,
                    hora: linha.hora,
                    usa_horarios: usaHorarios,
                    status: String(linha.status || '').toLowerCase().trim(),
                    observacoes: linha.observacoes,
                    cliente: linha.cliente_nome || 'N/A',
                    servicos: [],
                    duracao_total: 0,
                    preco_total: 0
                });
            }
            const item = mapa.get(linha.id);
            item.servicos.push(linha.servico_nome);
            item.duracao_total += Number(linha.duracao_min);
            item.preco_total += Number(linha.servico_preco);
        }

        const todosAgendamentos = Array.from(mapa.values());

        const totalConcluidos = todosAgendamentos.filter(a => a.status === 'concluido' || (a.data < hojeIso && a.status !== 'cancelado')).length;
        const totalCancelados = todosAgendamentos.filter(a => a.status === 'cancelado').length;

        let historicoFiltrado = todosAgendamentos;
        if (dataInicio) {
            if (periodo === 'dia') {
                historicoFiltrado = historicoFiltrado.filter(a => a.data === hojeIso);
            } else {
                historicoFiltrado = historicoFiltrado.filter(a => a.data >= dataInicio);
            }
        }

        return res.json({
            success: true,
            data: {
                totalConcluidos,
                totalCancelados,
                historico: historicoFiltrado
            }
        });

    } catch (error) {
        console.error('Erro ao buscar histórico do profissional:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar histórico' });
    }
});

// ============================================================================
// HORÁRIOS DO DIA
// ============================================================================
router.post('/professional-app/horarios-dia', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { profissional_id, data } = req.body;

        if (!profissional_id || !data) {
            return res.status(400).json({ success: false, message: 'profissional_id e data são obrigatórios' });
        }

        // 1. Verificar se o profissional usa horários
        const profResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: ['usa_horarios'],
            where: { id: Number(profissional_id) },
            limit: 1
        });

        const profData = (profResult.data || [])[0];
        const usaHorarios = profData && profData.usa_horarios !== undefined ? Number(profData.usa_horarios) : 1;

        if (usaHorarios === 0) {
            return res.json({
                success: true,
                data: {
                    usa_horarios: 0,
                    horarios: []
                }
            });
        }

        const horarios = await buscarGradeEHorarios(project_id, id_instancia, profissional_id, data);

        return res.json({
            success: true,
            data: {
                usa_horarios: 1,
                horarios: horarios || []
            }
        });

    } catch (error) {
        console.error('Erro ao buscar horários do dia:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar horários' });
    }
});

// ============================================================================
// PERFIL DO PROFISSIONAL
// ============================================================================
router.post('/professional-app/perfil', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { profissional_id } = req.body;

        if (!profissional_id) {
            return res.status(400).json({ success: false, message: 'profissional_id é obrigatório' });
        }

        const result = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: [
                'id', 
                'nome', 
                'email', 
                'especialidade', 
                'img', 
                'ativo', 
                'criado_em',
                'tipo_remuneracao',
                'percentual_comissao',
                'salario_fixo',
                'frequencia_pagamento',
                'usa_horarios'
            ],
            where: { id: Number(profissional_id) },
            limit: 1
        });

        const profissional = (result.data || [])[0] || null;

        if (!profissional) {
            return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
        }

        return res.json({ success: true, data: { profissional } });

    } catch (error) {
        console.error('Erro ao buscar perfil do profissional:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar perfil' });
    }
});

// ============================================================================
// RELATÓRIO DE FATURAMENTO E REMUNERAÇÃO DO PROFISSIONAL (Baseado no Agendamento)
// ============================================================================
router.post('/professional-app/faturamento', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { profissional_id, ano, mes } = req.body;

        if (!profissional_id || !ano || !mes) {
            return res.status(400).json({ success: false, message: 'profissional_id, ano e mes são obrigatórios' });
        }

        // 1. Buscar dados cadastrais do profissional (apenas para exibição de nome/frequência se necessário)
        const profResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: ['id', 'nome', 'frequencia_pagamento'],
            where: { id: Number(profissional_id) },
            limit: 1
        });

        const profissional = (profResult.data || [])[0] || null;
        if (!profissional) {
            return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
        }

        const anoNum = Number(ano);
        const mesNum = Number(mes);
        const dataInicio = `${anoNum}-${String(mesNum).padStart(2, '0')}-01`;
        
        const ultimoDiaData = new Date(anoNum, mesNum, 0);
        const quantidadeDiasMes = ultimoDiaData.getDate();
        const dataFim = `${anoNum}-${String(mesNum).padStart(2, '0')}-${String(quantidadeDiasMes).padStart(2, '0')}`;

        // 2. Buscar agendamentos do profissional com os dados de remuneração individuais da tabela agendamentos
        const linhasResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'agendamentos',
            alias: 'a',
            select: [
                'a.id', 'a.data', 'a.status', 'a.tipo_remuneracao', 
                'a.percentual_comissao', 'a.salario_fixo',
                's.preco AS servico_preco'
            ],
            joins: [
                { type: 'INNER', table: 'agendamento_servicos', alias: 'ags', on: 'a.id = ags.agendamento_id' },
                { type: 'INNER', table: 'servicos', alias: 's', on: 'ags.servico_id = s.id' }
            ],
            where: {
                'a.profissional_id': Number(profissional_id)
            }
        });

        const linhas = linhasResult.data || [];
        const mapaAgendamentos = new Map();

        for (const linha of linhas) {
            if (linha.status === 'cancelado') continue;
            
            if (linha.data >= dataInicio && linha.data <= dataFim) {
                if (!mapaAgendamentos.has(linha.id)) {
                    mapaAgendamentos.set(linha.id, {
                        id: linha.id,
                        data: linha.data,
                        status: linha.status,
                        tipo_remuneracao: linha.tipo_remuneracao || 'comissao',
                        percentual_comissao: Number(linha.percentual_comissao || 0),
                        salario_fixo: Number(linha.salario_fixo || 0),
                        preco_total: 0
                    });
                }
                const item = mapaAgendamentos.get(linha.id);
                item.preco_total += Number(linha.servico_preco || 0);
            }
        }

        const agendamentosMes = Array.from(mapaAgendamentos.values());

        let faturamentoTotal = 0;
        let valorAReceberTotal = 0;

        // Armazenamos uma referência para exibir na tela o tipo predominante do mês ou padrão
        let tipoRemuneracaoExibicao = 'comissao';
        let comissaoExibicao = 0;
        let salarioFixoExibicao = 0;

        for (const ag of agendamentosMes) {
            faturamentoTotal += ag.preco_total;

            tipoRemuneracaoExibicao = ag.tipo_remuneracao;
            comissaoExibicao = ag.percentual_comissao;
            salarioFixoExibicao = ag.salario_fixo;

            let valorAgendamentoLiquido = 0;
            if (ag.tipo_remuneracao === 'comissao') {
                valorAgendamentoLiquido = (ag.preco_total * ag.percentual_comissao) / 100;
            } else if (ag.tipo_remuneracao === 'clt') {
                valorAgendamentoLiquido = ag.salario_fixo;
            } else if (ag.tipo_remuneracao === 'hibrido') {
                const comissaoCalc = (ag.preco_total * ag.percentual_comissao) / 100;
                valorAgendamentoLiquido = ag.salario_fixo + comissaoCalc;
            }

            valorAReceberTotal += valorAgendamentoLiquido;
        }

        const totalAtendimentos = agendamentosMes.length;

        return res.json({
            success: true,
            data: {
                profissional: {
                    nome: profissional.nome,
                    tipo_remuneracao: tipoRemuneracaoExibicao,
                    frequencia_pagamento: profissional.frequencia_pagamento || 'mensal',
                    percentual_comissao: comissaoExibicao,
                    salario_fixo: salarioFixoExibicao
                },
                periodo: {
                    ano: anoNum,
                    mes: mesNum,
                    quantidade_dias: quantidadeDiasMes,
                    data_inicio: dataInicio,
                    data_fim: dataFim
                },
                estatisticas: {
                    total_atendimentos: totalAtendimentos,
                    faturamento_total: Number(faturamentoTotal.toFixed(2)),
                    valor_a_receber: Number(valorAReceberTotal.toFixed(2))
                }
            }
        });

    } catch (error) {
        console.error('Erro ao calcular faturamento do profissional:', error);
        return res.status(500).json({ success: false, message: 'Erro ao calcular faturamento' });
    }
});
export default router;