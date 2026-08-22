import express from 'express';

import goDataEngine from '../../services/goDataEngine.service.js';

const router = express.Router();

// ============================================================================
// HOME PÚBLICA
// ============================================================================
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

router.post('/home', async (req, res) => {

    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);

        const textosResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'site_texts',
            select: ['*'],
            order_by: 'key_name ASC'
        });

        // transforma array [{key_name, value}, ...] em objeto {key_name: value, ...}
        const textos = {};
        textosResult.data.forEach(t => {
            textos[t.key_name] = t.value;
        });

        const servicosResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'servicos',
            select: ['*'],
            order_by: 'criado_em DESC'
        });

        const profissionaisResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: ['*'],
            order_by: 'nome ASC'
        });

        const comentariosResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'comments',
            select: ['*'],
            where: { ativo: 1 },
            order_by: 'id DESC'
        });

        return res.json({
            success: true,
            data: {
                textos, // já vem como objeto chave/valor
                servicos: servicosResult.data,
                profissionais: profissionaisResult.data,
                comentarios: comentariosResult.data
            }
        });

    } catch (error) {
        console.error('Erro ao carregar home pública:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao carregar dados da home'
        });
    }
});


// rota logim
router.post('/login', async (req, res) => {

    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);

        const textosResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'site_texts',
            select: ['*'],
            order_by: 'key_name ASC'
        });

        // transforma array [{key_name, value}, ...] em objeto {key_name: value, ...}
        const textos = {};
        textosResult.data.forEach(t => {
            textos[t.key_name] = t.value;
        });

        return res.json({
            success: true,
            data: {
                textos // já vem como objeto chave/valor
            }
        });

    } catch (error) {
        console.error('Erro ao carregar login público:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao carregar dados do login'
        });
    }
});


// router.post('/login-cliente', async (req, res) => {

//     try {
//         const project_id = Number(req.body.project_id);
//         const id_instancia = Number(req.body.id_instancia);
//         const { email, senha } = req.body;

//         // busca os textos do site (sempre necessário pra renderizar a página)
//         const textosResult = await goDataEngine.advancedSelect({
//             project_id,
//             id_instancia,
//             table: 'site_texts',
//             select: ['*'],
//             order_by: 'key_name ASC'
//         });

//         const textos = {};
//         textosResult.data.forEach(t => {
//             textos[t.key_name] = t.value;
//         });

//         if (!email || !senha) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Email e senha são obrigatórios',
//                 data: { textos }
//             });
//         }

//         const clientesResult = await goDataEngine.advancedSelect({
//             project_id,
//             id_instancia,
//             table: 'clientes',
//             select: ['*'],
//             where: { email },
//             limit: 1
//         });

//         // 🔧 clientesResult.data pode vir null quando não acha nenhum registro
//         const cliente = (clientesResult.data && clientesResult.data[0]) || null;
//         console.log('Cliente encontrado:', cliente);
//         if (!cliente) {
//             return res.json({
//                 success: false,
//                 message: 'Email ou senha incorretos!',
//                 data: { textos }
//             });
//         }

//         const senhaValida = await bcrypt.compare(senha, cliente.senha_hash);
//         console.log('Senha válida:', senhaValida);
//         if (!senhaValida) {
//             return res.json({
//                 success: false,
//                 message: 'Email ou senha incorretos!',
//                 data: { textos }
//             });
//         }

//         return res.json({
//             success: true,
//             data: {
//                 textos,
//                 cliente: cliente
//             }
//         });

//     } catch (error) {
//         console.error('Erro ao validar login do cliente:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Erro ao validar login'
//         });
//     }
// });


router.post('/login-cliente', async (req, res) => {
    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);
        const { email, senha } = req.body;

        // ============================================================
        // TEXTOS
        // ============================================================

        const textosResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'site_texts',
            select: ['*'],
            order_by: 'key_name ASC'
        });

        const textos = {};

        (textosResult.data || []).forEach(t => {
            textos[t.key_name] = t.value;
        });

        // ============================================================
        // VALIDAÇÃO
        // ============================================================

        if (!email || !senha) {
            return res.status(400).json({
                success: false,
                message: 'Email e senha são obrigatórios',
                data: {
                    textos
                }
            });
        }

        // ============================================================
        // BUSCA CLIENTE
        // ============================================================

        const clientesResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'clientes',
            select: ['*'],
            where: {
                email
            },
            limit: 1
        });

        const cliente = (clientesResult.data || [])[0] || null;

        // console.log('Cliente encontrado:', cliente
        //     ? {
        //         id: cliente.id,
        //         nome: cliente.nome,
        //         email: cliente.email
        //     }
        //     : null
        // );

        if (!cliente) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos!',
                data: {
                    textos
                }
            });
        }

        // ============================================================
        // COMPARA SENHA
        // ============================================================

        const senhaValida = await bcrypt.compare(
            senha,
            cliente.senha_hash
        );

        console.log('Senha válida:', senhaValida);

        if (!senhaValida) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos!',
                data: {
                    textos
                }
            });
        }

        // ============================================================
        // NÃO DEVOLVER senha_hash
        // ============================================================

        const clienteSeguro = {
            id: cliente.id,
            id_instancia: cliente.id_instancia,
            nome: cliente.nome,
            email: cliente.email,
            telefone: cliente.telefone,
            criado_em: cliente.criado_em
        };

        // ============================================================
        // SUCESSO
        // ============================================================

        return res.json({
            success: true,
            data: {
                textos,
                cliente: clienteSeguro
            }
        });

    } catch (error) {

        console.error(
            'Erro ao validar login do cliente:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Erro ao validar login'
        });
    }
});
// ============================================================================
// REGISTER
// ============================================================================
router.post('/register', async (req, res) => {

    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);

        const textosResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'site_texts',
            select: ['*'],
            order_by: 'key_name ASC'
        });

        const textos = {};
        textosResult.data.forEach(t => {
            textos[t.key_name] = t.value;
        });

        return res.json({
            success: true,
            data: { textos }
        });

    } catch (error) {
        console.error('Erro ao carregar cadastro público:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao carregar dados do cadastro'
        });
    }
});
//  criar cliente
router.post('/register-cliente', async (req, res) => {

    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);
        const { nome, email, telefone, senha } = req.body;

        // busca os textos do site (sempre necessário pra renderizar a página)
        const textosResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'site_texts',
            select: ['*'],
            order_by: 'key_name ASC'
        });

        const textos = {};
        textosResult.data.forEach(t => {
            textos[t.key_name] = t.value;
        });

        if (!nome || !email || !senha) {
            return res.status(400).json({
                success: false,
                message: 'Nome, email e senha são obrigatórios',
                data: { textos }
            });
        }

        // verifica se já existe cliente com esse email
        const clientesResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'clientes',
            select: ['*'],
            where: { email },
            limit: 1
        });
        console.log('Resultado da busca de cliente existente:', clientesResult);

        const clienteExistente = (clientesResult.data && clientesResult.data[0]) || null;
        console.log('Cliente existente:', clienteExistente);
        if (clienteExistente) {
            return res.json({
                success: false,
                message: 'Email já cadastrado!',
                data: { textos }
            });
        }

        // cria o hash da senha aqui no gateway (mesma responsabilidade do login)
        const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);

        await goDataEngine.insert(project_id, id_instancia, 'clientes', {
            nome,
            email,
            telefone,
            senha_hash
        });

        return res.json({
            success: true,
            message: 'Cadastro realizado com sucesso!',
            data: { textos }
        });

    } catch (error) {
        console.error('Erro ao registrar cliente:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao registrar cliente'
        });
    }
});

// ============================================================================
// LOGIN
// ============================================================================
// router.post('/login', async (req, res) => {
//     try {
//         const project_id = Number(req.body.project_id);
//         const id_instancia = Number(req.body.id_instancia);
//         const { email, senha } = req.body;

//         const clientes = await goDataEngine.advancedSelect({
//             project_id, id_instancia,
//             table: 'clientes',
//             where: { email },
//             limit: 1
//         });

//         const cliente = clientes.data?.[0];

//         if (!cliente) {
//             return res.json({ success: false, message: 'Email ou senha incorretos!' });
//         }

//         const senhaValida = await bcrypt.compare(senha, cliente.senha_hash);

//         if (!senhaValida) {
//             return res.json({ success: false, message: 'Email ou senha incorretos!' });
//         }

//         delete cliente.senha_hash; // nunca devolve o hash pro site

//         return res.json({ success: true, data: cliente });

//     } catch (error) {
//         console.error('Erro ao logar cliente:', error);
//         return res.status(500).json({ success: false, message: 'Erro ao logar cliente' });
//     }
// });

// ============================================================================
// FORGOT PASSWORD
// ============================================================================
router.post('/forgot-password', async (req, res) => {

    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);
        const { email } = req.body;

        // busca os textos do site (sempre necessário pra renderizar a página)
        const textosResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'site_texts',
            select: ['*'],
            order_by: 'key_name ASC'
        });

        const textos = {};
        textosResult.data.forEach(t => {
            textos[t.key_name] = t.value;
        });

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email é obrigatório',
                data: { textos }
            });
        }

        // verifica se o cliente existe
        const clientesResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'clientes',
            select: ['*'],
            where: { email },
            limit: 1
        });

        const cliente = (clientesResult.data && clientesResult.data[0]) || null;

        if (!cliente) {
            return res.json({
                success: false,
                message: 'Email não encontrado',
                data: { textos }
            });
        }

        // gera e salva o token de recuperação
        const token = crypto.randomBytes(32).toString('hex');
        const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        await goDataEngine.update(
            project_id,
            id_instancia,
            'clientes',
            {
                reset_token: token,
                reset_token_expira: expira
            },
            { email }
        );

        return res.json({
            success: true,
            message: 'Token gerado com sucesso',
            data: {
                textos,
                token
            }
        });

    } catch (error) {
        console.error('Erro ao processar recuperação:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao processar recuperação'
        });
    }
});

router.post('/reset-senha', async (req, res) => {

    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);
        const { token, senha } = req.body;

        if (!token || !senha) {
            return res.status(400).json({
                success: false,
                message: 'Token e senha são obrigatórios'
            });
        }

        // busca cliente pelo token
        const clientesResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'clientes',
            select: ['*'],
            where: { reset_token: token },
            limit: 1
        });

        const cliente = (clientesResult.data && clientesResult.data[0]) || null;

        // verifica se existe e se o token ainda é válido
        const tokenValido = cliente && new Date(cliente.reset_token_expira) > new Date();

        if (!tokenValido) {
            return res.json({
                success: false,
                message: 'Token inválido ou expirado'
            });
        }

        // gera novo hash e limpa o token
        const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);

        await goDataEngine.update(
            project_id,
            id_instancia,
            'clientes',
            {
                senha_hash,
                reset_token: null,
                reset_token_expira: null
            },
            { id: cliente.id }
        );

        return res.json({
            success: true,
            message: 'Senha alterada com sucesso'
        });

    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao redefinir senha'
        });
    }
});

router.post('/client-home', async (req, res) => {
    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);
        const { cliente_id } = req.body;

        if (!cliente_id) {
            return res.status(400).json({ success: false, message: 'cliente_id é obrigatório' });
        }

        const textosResult = await goDataEngine.advancedSelect({
            project_id, id_instancia, table: 'site_texts', select: ['*'], order_by: 'key_name ASC'
        });
        const textos = {};
        (textosResult.data || []).forEach(t => { textos[t.key_name] = t.value; });

        const profissionaisResult = await goDataEngine.advancedSelect({
            project_id, id_instancia, table: 'profissionais', select: ['*'], where: { ativo: 1 }, order_by: 'nome ASC'
        });

        // 🔧 mesmo JOIN agregado do /my-schedules, mas só o próximo
        const linhasResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'agendamentos',
            alias: 'a',
            select: [
                'a.id', 'a.data', 'a.hora', 'a.status',
                's.nome AS servico_nome', 'p.nome AS profissional'
            ],
            joins: [
                { type: 'INNER', table: 'agendamento_servicos', alias: 'ags', on: 'a.id = ags.agendamento_id' },
                { type: 'INNER', table: 'servicos', alias: 's', on: 'ags.servico_id = s.id' },
                { type: 'INNER', table: 'profissionais', alias: 'p', on: 'a.profissional_id = p.id' }
            ],
            where: {
                'a.cliente_id': Number(cliente_id),
                'a.status': 'agendado'
            },
            order_by: 'a.data ASC, a.hora ASC'
        });

        const linhas = linhasResult.data || [];
        const hoje = new Date().toISOString().split('T')[0];

        const mapa = new Map();
        for (const linha of linhas) {
            if (linha.data < hoje) continue;
            if (!mapa.has(linha.id)) {
                mapa.set(linha.id, {
                    id: linha.id,
                    data: linha.data,
                    hora: linha.hora,
                    profissional: linha.profissional,
                    servicos: []
                });
            }
            mapa.get(linha.id).servicos.push(linha.servico_nome);
        }

        const futuros = Array.from(mapa.values());
        const proximoAgendamento = futuros.length > 0 ? futuros[0] : null;

        return res.json({
            success: true,
            data: {
                textos,
                profissionais: profissionaisResult.data || [],
                proximoAgendamento
            }
        });

    } catch (error) {
        console.error('Erro ao carregar home do cliente:', error);
        return res.status(500).json({ success: false, message: 'Erro ao carregar dados da home do cliente' });
    }
});



import { buscarGradeEHorarios } from '../../utils/schedule.utils.js';
// ============================================================
// HORÁRIOS DISPONÍVEIS (usado pelo AJAX e pela tela de agendamento)
// ============================================================
router.post('/horarios-disponiveis', async (req, res) => {
    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);
        const { profissional_id, data } = req.body;

        if (!profissional_id || !data) {
            return res.json({ success: true, data: { horarios: [] } });
        }

        // ✅ depois
        const horarios = await buscarGradeEHorarios(project_id, id_instancia, profissional_id, data);

        return res.json({ success: true, data: { horarios } });

    } catch (error) {
        console.error('Erro ao buscar horários:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar horários' });
    }
});

// ============================================================
// TELA DE AGENDAMENTO (GET /schedule)
// ============================================================
router.post('/schedule-page', async (req, res) => {
    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);

        const textosResult = await goDataEngine.advancedSelect({
            project_id, id_instancia, table: 'site_texts', select: ['*'], order_by: 'key_name ASC'
        });
        const textos = {};
        (textosResult.data || []).forEach(t => { textos[t.key_name] = t.value; });

        const servicosResult = await goDataEngine.advancedSelect({
            project_id, id_instancia, table: 'servicos', select: ['*'], order_by: 'criado_em DESC'
        });

        const profissionaisResult = await goDataEngine.advancedSelect({
            project_id, id_instancia, table: 'profissionais', select: ['*'], order_by: 'nome ASC'
        });

        const servicos = servicosResult.data || [];
        const profissionais = profissionaisResult.data || [];

        const hoje = new Date().toISOString().split('T')[0];

        let horariosDisponiveis = [];
        if (profissionais.length > 0) {
            // ✅ depois
            horariosDisponiveis = await buscarGradeEHorarios(project_id, id_instancia, profissionais[0].id, hoje);
        }

        return res.json({
            success: true,
            data: {
                textos,
                servicos,
                profissionais,
                currentDate: hoje,
                horariosDisponiveis,
                selectedProfissional: profissionais.length > 0 ? profissionais[0].id : null,
                selectedData: hoje
            }
        });

    } catch (error) {
        console.error('Erro ao carregar tela de agendamento:', error);
        return res.status(500).json({ success: false, message: 'Erro ao carregar tela de agendamento' });
    }
});

// ============================================================
// CRIAR AGENDAMENTO (POST /schedule)
// ============================================================
router.post('/agendar', async (req, res) => {
    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);
        const { cliente_id, servico_ids, profissional_id, data, hora, observacoes } = req.body;

        // 🔧 servico_ids agora é um array: [1, 2, 3]
        if (!cliente_id || !Array.isArray(servico_ids) || servico_ids.length === 0 || !profissional_id || !data || !hora) {
            return res.status(400).json({ success: false, message: 'Dados obrigatórios faltando (selecione ao menos 1 serviço)' });
        }

        const textosResult = await goDataEngine.advancedSelect({
            project_id, id_instancia, table: 'site_texts', select: ['*'], order_by: 'key_name ASC'
        });
        const textos = {};
        (textosResult.data || []).forEach(t => { textos[t.key_name] = t.value; });

        // verifica se já existe agendamento pra esse horário
        const existentesResult = await goDataEngine.advancedSelect({
            project_id, id_instancia, table: 'agendamentos', select: ['id'],
            where: {
                profissional_id: Number(profissional_id),
                data,
                hora,
                status: 'agendado'
            },
            limit: 1
        });

        const existe = (existentesResult.data && existentesResult.data.length > 0);

        if (existe) {
            return res.json({
                success: false,
                message: 'Horário indisponível, escolha outro!',
                data: { textos }
            });
        }

        // 1. cria o agendamento (sem servico_id)
        const insertResult = await goDataEngine.insert(project_id, id_instancia, 'agendamentos', {
            cliente_id: Number(cliente_id),
            profissional_id: Number(profissional_id),
            data,
            hora,
            observacoes: observacoes || null
        });

        // pega o id do agendamento recém-criado
        const agendamento_id = insertResult.id || insertResult.insertId || insertResult.data?.id;

        if (!agendamento_id) {
            console.error('Não foi possível obter o id do agendamento criado:', insertResult);
            return res.status(500).json({ success: false, message: 'Erro ao criar agendamento (sem id de retorno)' });
        }

        // 2. insere cada serviço vinculado, em paralelo
        await Promise.all(
            servico_ids.map(servico_id =>
                goDataEngine.insert(project_id, id_instancia, 'agendamento_servicos', {
                    agendamento_id: Number(agendamento_id),
                    servico_id: Number(servico_id)
                })
            )
        );

        // recarrega dados atualizados pra tela
        const servicosResult = await goDataEngine.advancedSelect({
            project_id, id_instancia, table: 'servicos', select: ['*'], order_by: 'criado_em DESC'
        });
        const profissionaisResult = await goDataEngine.advancedSelect({
            project_id, id_instancia, table: 'profissionais', select: ['*'], order_by: 'nome ASC'
        });
        const horariosDisponiveis = await buscarGradeEHorarios(project_id, id_instancia, profissional_id, data);

        return res.json({
            success: true,
            message: 'Agendamento realizado com sucesso!',
            data: {
                textos,
                servicos: servicosResult.data || [],
                profissionais: profissionaisResult.data || [],
                currentDate: data,
                selectedProfissional: profissional_id,
                selectedServicos: servico_ids,
                horariosDisponiveis
            }
        });

    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        return res.status(500).json({ success: false, message: 'Erro ao criar agendamento' });
    }
});

router.post('/deletar-agendamento', async (req, res) => {
    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);
        const { agendamento_id, cliente_id } = req.body;

        if (!agendamento_id || !cliente_id) {
            return res.status(400).json({ success: false, message: 'agendamento_id e cliente_id são obrigatórios' });
        }

        const agendamentoResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'agendamentos',
            select: ['*'],
            where: { id: Number(agendamento_id) },
            limit: 1
        });

        const agendamento = (agendamentoResult.data && agendamentoResult.data[0]) || null;

        if (!agendamento || agendamento.cliente_id !== Number(cliente_id)) {
            return res.json({
                success: false,
                message: 'Agendamento não encontrado ou não permitido'
            });
        }

        // 🔧 goDataEngine.delete, não goDataEngine.deleteRecords
        await goDataEngine.delete(
            project_id,
            id_instancia,
            'agendamento_servicos',
            { agendamento_id: Number(agendamento_id) }
        );

        await goDataEngine.delete(
            project_id,
            id_instancia,
            'agendamentos',
            { id: Number(agendamento_id) }
        );

        return res.json({
            success: true,
            message: 'Agendamento deletado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao deletar agendamento:', error);
        return res.status(500).json({ success: false, message: 'Erro ao deletar agendamento' });
    }
});



router.post('/my-schedules', async (req, res) => {
    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);
        const { cliente_id } = req.body;

        if (!cliente_id) {
            return res.status(400).json({ success: false, message: 'cliente_id é obrigatório' });
        }

        const textosResult = await goDataEngine.advancedSelect({
            project_id, id_instancia, table: 'site_texts', select: ['*'], order_by: 'key_name ASC'
        });
        const textos = {};
        (textosResult.data || []).forEach(t => { textos[t.key_name] = t.value; });

        // 🔧 agora traz uma linha por serviço (JOIN com agendamento_servicos)
        const linhasResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'agendamentos',
            alias: 'a',
            select: [
                'a.id', 'a.data', 'a.hora', 'a.status', 'a.observacoes',
                's.nome AS servico_nome', 's.preco AS servico_preco', 's.duracao_min',
                'p.nome AS profissional'
            ],
            joins: [
                { type: 'INNER', table: 'agendamento_servicos', alias: 'ags', on: 'a.id = ags.agendamento_id' },
                { type: 'INNER', table: 'servicos', alias: 's', on: 'ags.servico_id = s.id' },
                { type: 'INNER', table: 'profissionais', alias: 'p', on: 'a.profissional_id = p.id' }
            ],
            where: {
                'a.cliente_id': Number(cliente_id),
                'a.status': 'agendado'
            },
            order_by: 'a.data ASC, a.hora ASC'
        });

        const linhas = linhasResult.data || [];
        const hoje = new Date().toISOString().split('T')[0];

        // agrupa por agendamento, somando duração/preço e listando os serviços
        const mapa = new Map();
        for (const linha of linhas) {
            if (linha.data < hoje) continue; // só futuros

            if (!mapa.has(linha.id)) {
                mapa.set(linha.id, {
                    id: linha.id,
                    data: linha.data,
                    hora: linha.hora,
                    status: linha.status,
                    observacoes: linha.observacoes,
                    profissional: linha.profissional,
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

        const agendamentos = Array.from(mapa.values());

        return res.json({
            success: true,
            data: { textos, agendamentos }
        });

    } catch (error) {
        console.error('Erro ao listar agendamentos do cliente:', error);
        return res.status(500).json({ success: false, message: 'Erro ao listar agendamentos' });
    }
});

// ============================================================
// PÁGINA DE PERFIL (GET /profile) — só textos, cliente já vem da sessão do site
// ============================================================
router.post('/profile-page', async (req, res) => {
    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);

        const textosResult = await goDataEngine.advancedSelect({
            project_id, id_instancia, table: 'site_texts', select: ['*'], order_by: 'key_name ASC'
        });
        const textos = {};
        (textosResult.data || []).forEach(t => { textos[t.key_name] = t.value; });

        return res.json({ success: true, data: { textos } });

    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        return res.status(500).json({ success: false, message: 'Erro ao carregar perfil' });
    }
});

// ============================================================
// ATUALIZAR PERFIL (POST /profile)
// ============================================================
router.post('/atualizar-perfil', async (req, res) => {
    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);
        const { cliente_id, nome, email, telefone, senha } = req.body;

        if (!cliente_id || !nome || !email) {
            return res.status(400).json({ success: false, message: 'cliente_id, nome e email são obrigatórios' });
        }

        const data = { nome, email };

        if (telefone !== undefined) {
            data.telefone = telefone;
        }

        if (senha && senha.trim() !== '') {
            data.senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);
        }

        await goDataEngine.update(
            project_id,
            id_instancia,
            'clientes',
            data,
            { id: Number(cliente_id) }
        );

        return res.json({
            success: true,
            message: 'Perfil atualizado com sucesso!',
            data: { nome, email }
        });

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
    }
});


export default router;