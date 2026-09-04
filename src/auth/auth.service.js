// auth/auth.service.js
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import * as goDataEngine from '../services/goDataEngine.service.js';

// 🔧 precisa da env var GOOGLE_CLIENT_ID (Client ID OAuth do Google Cloud
// Console — o mesmo usado no app mobile e no site pro Google Sign-In)
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const SALT_ROUNDS = 10;
const TABELA_CLIENTES = 'clientes';

export class AuthError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// ============================================================
// HELPERS
// ============================================================
function gerarCodigoVerificacao() {
    // código de 6 dígitos, tipo os SMS/email de verificação comuns
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function buscarClientePorEmail(project_id, id_instancia, email) {
    const resultado = await goDataEngine.advancedSelect({
        project_id, id_instancia, table: TABELA_CLIENTES,
        select: ['*'], where: { email }, limit: 1
    });
    return (resultado.data && resultado.data[0]) || null;
}

async function buscarClientePorGoogleId(project_id, id_instancia, google_id) {
    const resultado = await goDataEngine.advancedSelect({
        project_id, id_instancia, table: TABELA_CLIENTES,
        select: ['*'], where: { google_id }, limit: 1
    });
    return (resultado.data && resultado.data[0]) || null;
}

function sanitizarCliente(cliente) {
    if (!cliente) return null;
    const { senha, codigo_verificacao, ...resto } = cliente;
    return resto;
}

// ============================================================
// CADASTRO (nome, email, telefone, senha)
// cria a conta já com email_verificado = false + código de verificação
// ============================================================
export async function registrar(project_id, id_instancia, { nome, email, telefone, senha }) {

    const existente = await buscarClientePorEmail(project_id, id_instancia, email);
    if (existente) {
        throw new AuthError('E-mail já cadastrado', 409);
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const codigo = gerarCodigoVerificacao();

    await goDataEngine.insert(project_id, id_instancia, TABELA_CLIENTES, {
        nome,
        email,
        telefone: telefone || null,
        senha: senhaHash,
        google_id: null,
        email_verificado: 0,
        codigo_verificacao: codigo
    });

    const cliente = await buscarClientePorEmail(project_id, id_instancia, email);

    // ⚠️ TODO: disparar o email de verdade com o código. Por enquanto
    // devolve o código na resposta só pra dar pra testar sem ter o envio
    // de email pronto — TIRAR isso assim que o envio estiver implementado.
    return { cliente: sanitizarCliente(cliente), codigoDebug: codigo };
}

// ============================================================
// VALIDAR CONTA VIA EMAIL (código de 6 dígitos)
// ============================================================
export async function verificarEmail(project_id, id_instancia, email, codigo) {

    const cliente = await buscarClientePorEmail(project_id, id_instancia, email);
    if (!cliente) {
        throw new AuthError('Conta não encontrada', 404);
    }

    if (cliente.email_verificado) {
        return { jaVerificado: true };
    }

    if (cliente.codigo_verificacao !== codigo) {
        throw new AuthError('Código inválido', 400);
    }

    await goDataEngine.update(
        project_id, id_instancia, TABELA_CLIENTES,
        { email_verificado: 1, codigo_verificacao: null },
        { id: cliente.id }
    );

    return { verificado: true };
}

// ============================================================
// REENVIAR CÓDIGO DE VERIFICAÇÃO
// ============================================================
export async function reenviarCodigo(project_id, id_instancia, email) {

    const cliente = await buscarClientePorEmail(project_id, id_instancia, email);
    if (!cliente) {
        // não revela se o email existe ou não
        return { enviado: true };
    }

    if (cliente.email_verificado) {
        return { enviado: true, jaVerificado: true };
    }

    const codigo = gerarCodigoVerificacao();

    await goDataEngine.update(
        project_id, id_instancia, TABELA_CLIENTES,
        { codigo_verificacao: codigo },
        { id: cliente.id }
    );

    // ⚠️ mesmo TODO do registrar(): tirar o codigoDebug quando tiver email de verdade
    return { enviado: true, codigoDebug: codigo };
}

// ============================================================
// LOGIN (email + senha) — exige email verificado
// ============================================================
export async function login(project_id, id_instancia, { email, senha }) {

    const cliente = await buscarClientePorEmail(project_id, id_instancia, email);
    if (!cliente) {
        throw new AuthError('E-mail ou senha inválidos', 401);
    }

    const senhaBate = cliente.senha ? await bcrypt.compare(senha, cliente.senha) : false;
    if (!senhaBate) {
        throw new AuthError('E-mail ou senha inválidos', 401);
    }

    if (!cliente.email_verificado) {
        throw new AuthError('Confirme seu e-mail antes de entrar', 403);
    }

    return sanitizarCliente(cliente);
}

// ============================================================
// LOGIN / CADASTRO VIA GOOGLE
// conta criada por aqui já entra com email_verificado = true
// (o Google já garante que o email é real)
// ============================================================
export async function loginOuCriarComGoogle(project_id, id_instancia, idToken) {

    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
    } catch (err) {
        throw new AuthError('Token do Google inválido', 401);
    }

    const { sub: google_id, email, name } = payload;

    // 1. já existe conta vinculada a esse google_id?
    let cliente = await buscarClientePorGoogleId(project_id, id_instancia, google_id);
    if (cliente) {
        return sanitizarCliente(cliente);
    }

    // 2. já existe conta com esse email (criada via senha antes)? vincula o google_id
    cliente = await buscarClientePorEmail(project_id, id_instancia, email);
    if (cliente) {
        await goDataEngine.update(
            project_id, id_instancia, TABELA_CLIENTES,
            { google_id, email_verificado: 1 }, // Google confirma o email também
            { id: cliente.id }
        );
        return sanitizarCliente({ ...cliente, google_id, email_verificado: 1 });
    }

    // 3. não existe -> cria conta nova (sem senha, só Google, já verificada)
    await goDataEngine.insert(project_id, id_instancia, TABELA_CLIENTES, {
        nome: name || 'Cliente Google',
        email,
        telefone: null,
        senha: null,
        google_id,
        email_verificado: 1,
        codigo_verificacao: null
    });

    const novoCliente = await buscarClientePorEmail(project_id, id_instancia, email);
    return sanitizarCliente(novoCliente);
}
