// auth/auth.controller.js
import * as authService from './auth.service.js';
import {
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    resendCodeSchema,
    googleAuthSchema,
    validar
} from './auth.validation.js';

function idsInstancia(req) {
    return {
        project_id: Number(req.body.project_id),
        id_instancia: Number(req.body.id_instancia)
    };
}

function tratarErro(res, err, contexto) {
    if (err instanceof authService.AuthError) {
        return res.status(err.status).json({ success: false, message: err.message });
    }
    console.error(`Erro em ${contexto}:`, err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
}

export async function register(req, res) {
    const validacao = validar(registerSchema, req.body);
    if (!validacao.ok) {
        return res.status(400).json({ success: false, message: validacao.message });
    }

    try {
        const { project_id, id_instancia } = idsInstancia(req);
        const resultado = await authService.registrar(project_id, id_instancia, validacao.data);

        return res.json({
            success: true,
            message: 'Conta criada! Confira seu e-mail pra confirmar.',
            data: resultado.cliente,
            codigoDebug: resultado.codigoDebug // ⚠️ remover quando tiver envio de email de verdade
        });
    } catch (err) {
        return tratarErro(res, err, 'register');
    }
}

export async function verifyEmail(req, res) {
    const validacao = validar(verifyEmailSchema, req.body);
    if (!validacao.ok) {
        return res.status(400).json({ success: false, message: validacao.message });
    }

    try {
        const { project_id, id_instancia } = idsInstancia(req);
        const resultado = await authService.verificarEmail(
            project_id, id_instancia, validacao.data.email, validacao.data.codigo
        );

        return res.json({ success: true, message: 'E-mail confirmado com sucesso', ...resultado });
    } catch (err) {
        return tratarErro(res, err, 'verifyEmail');
    }
}

export async function resendCode(req, res) {
    const validacao = validar(resendCodeSchema, req.body);
    if (!validacao.ok) {
        return res.status(400).json({ success: false, message: validacao.message });
    }

    try {
        const { project_id, id_instancia } = idsInstancia(req);
        const resultado = await authService.reenviarCodigo(project_id, id_instancia, validacao.data.email);

        return res.json({ success: true, message: 'Código reenviado', ...resultado });
    } catch (err) {
        return tratarErro(res, err, 'resendCode');
    }
}

export async function login(req, res) {
    const validacao = validar(loginSchema, req.body);
    if (!validacao.ok) {
        return res.status(400).json({ success: false, message: validacao.message });
    }

    try {
        const { project_id, id_instancia } = idsInstancia(req);
        const cliente = await authService.login(project_id, id_instancia, validacao.data);

        return res.json({ success: true, message: 'Login realizado', data: cliente });
    } catch (err) {
        return tratarErro(res, err, 'login');
    }
}

export async function google(req, res) {
    const validacao = validar(googleAuthSchema, req.body);
    if (!validacao.ok) {
        return res.status(400).json({ success: false, message: validacao.message });
    }

    try {
        const { project_id, id_instancia } = idsInstancia(req);
        const cliente = await authService.loginOuCriarComGoogle(
            project_id, id_instancia, validacao.data.idToken
        );

        return res.json({ success: true, message: 'Login com Google realizado', data: cliente });
    } catch (err) {
        return tratarErro(res, err, 'google');
    }
}
