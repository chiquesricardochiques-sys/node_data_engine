// auth/auth.validation.js
import { z } from 'zod';

const senhaSchema = z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .regex(/[a-zA-Z]/, 'Senha deve conter ao menos 1 letra')
    .regex(/[0-9]/, 'Senha deve conter ao menos 1 número');

export const registerSchema = z.object({
    nome: z.string().min(1, 'Nome obrigatório'),
    email: z.string().email('Email inválido'),
    telefone: z.string().optional(),
    senha: senhaSchema
});

export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    senha: z.string().min(1, 'Senha obrigatória')
});

export const verifyEmailSchema = z.object({
    email: z.string().email('Email inválido'),
    codigo: z.string().length(6, 'Código deve ter 6 dígitos')
});

export const resendCodeSchema = z.object({
    email: z.string().email('Email inválido')
});

// 🔧 novo: login/cadastro via Google — recebe o idToken que o app/site
// pega do Google Sign-In
export const googleAuthSchema = z.object({
    idToken: z.string().min(1, 'idToken obrigatório')
});

// devolve { ok, data, message } em vez de lançar exceção direto no controller
export function validar(schema, dados) {
    const resultado = schema.safeParse(dados);

    if (!resultado.success) {
        const primeiroErro = resultado.error.errors[0];
        return { ok: false, message: primeiroErro?.message || 'Dados inválidos' };
    }

    return { ok: true, data: resultado.data };
}
