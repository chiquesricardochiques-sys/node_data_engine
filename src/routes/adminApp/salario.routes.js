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

function mesAtualPrefix() {
    return new Date().toISOString().slice(0, 7); // "2026-08"
}

function semanaAtual() {
    const hoje = new Date();
    const diaSemana = hoje.getDay() || 7;
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - diaSemana + 1);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    return {
        inicio: inicio.toISOString().split('T')[0],
        fim: fim.toISOString().split('T')[0]
    };
}

// Calcula o ganho individual considerando os dados salvos no agendamento
function calcularGanhoAgendamento(item, totalGerado) {
    const gerado = Number(totalGerado) || 0;
    const tipo = item.tipo_remuneracao || 'comissao';
    const percentual = Number(item.percentual_comissao) || 0;
    const fixo = Number(item.salario_fixo) || 0;

    if (tipo === 'clt') return fixo;
    if (tipo === 'hibrido') return fixo + gerado * (percentual / 100);
    return gerado * (percentual / 100); // 'comissao' (padrão)
}

router.post('/salario/rendimento', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { profissional_id, mes_ano } = req.body;

        if (!profissional_id) {
            return res.status(400).json({ success: false, message: 'profissional_id é obrigatório' });
        }

        const mesFiltro = mes_ano || mesAtualPrefix();

        // 1. Dados cadastrais básicos do profissional (apenas para nome, foto e fallback geral)
        const profResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: ['id', 'nome', 'img', 'tipo_remuneracao', 'percentual_comissao', 'salario_fixo'],
            where: { id: Number(profissional_id) },
            limit: 1
        });

        const prof = (profResult.data || [])[0] || null;

        if (!prof) {
            return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
        }

        // 2. Buscar atendimentos CONCLUÍDOS trazendo as regras de remuneração individuais do agendamento
        const linhasResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'agendamentos',
            alias: 'a',
            select: [
                'a.id', 'a.data', 'a.tipo_remuneracao', 'a.percentual_comissao', 'a.salario_fixo',
                's.preco AS servico_preco'
            ],
            joins: [
                { type: 'INNER', table: 'agendamento_servicos', alias: 'ags', on: 'a.id = ags.agendamento_id' },
                { type: 'INNER', table: 'servicos', alias: 's', on: 'ags.servico_id = s.id' }
            ],
            where: {
                'a.profissional_id': Number(profissional_id),
                'a.status': 'concluido'
            }
        });

        const linhas = linhasResult.data || [];

        // Agrupa por agendamento (soma o preço total dos serviços e preserva as regras salariais do agendamento)
        const mapa = new Map();
        for (const linha of linhas) {
            if (!mapa.has(linha.id)) {
                mapa.set(linha.id, { 
                    id: linha.id, 
                    data: linha.data, 
                    tipo_remuneracao: linha.tipo_remuneracao || prof.tipo_remuneracao,
                    percentual_comissao: linha.percentual_comissao ?? prof.percentual_comissao,
                    salario_fixo: linha.salario_fixo ?? prof.salario_fixo,
                    total: 0 
                });
            }
            mapa.get(linha.id).total += Number(linha.servico_preco || 0);
        }
        const concluidos = Array.from(mapa.values());

        // 3. Classifica nos períodos e soma calculando ganho individual por agendamento
        const hoje = hojeSQL();
        const semana = semanaAtual();
        const mesAtual = mesAtualPrefix();

        function somarPeriodo(filtro) {
            const itens = concluidos.filter(filtro);
            const totalGerado = itens.reduce((acc, i) => acc + i.total, 0);
            
            // Soma o ganho líquido de cada agendamento individualmente
            const valorGanho = itens.reduce((acc, i) => acc + calcularGanhoAgendamento(i, i.total), 0);

            return { 
                qtd: itens.length, 
                totalGerado: Number(totalGerado.toFixed(2)), 
                valorGanho: Number(valorGanho.toFixed(2)) 
            };
        }

        return res.json({
            success: true,
            data: {
                nome: prof.nome,
                img: prof.img,
                tipo_remuneracao: prof.tipo_remuneracao,
                percentual_comissao: prof.percentual_comissao,
                salario_fixo: prof.salario_fixo,
                hoje: somarPeriodo(a => a.data === hoje),
                semana: somarPeriodo(a => a.data >= semana.inicio && a.data <= semana.fim),
                mesAtual: somarPeriodo(a => a.data.startsWith(mesAtual)),
                mesFiltro: somarPeriodo(a => a.data.startsWith(mesFiltro))
            }
        });

    } catch (error) {
        console.error('Erro ao buscar rendimento do profissional:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar rendimento' });
    }
});

export default router;