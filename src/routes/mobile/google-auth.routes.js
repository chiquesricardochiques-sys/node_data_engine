import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

import goDataEngine from '../../services/goDataEngine.service.js';

const router = express.Router();

const SALT_ROUNDS = 10;

// ============================================================================
// CLIENT IDS DO GOOGLE (um por plataforma, todos aceitos como audience)
// ============================================================================
const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.GOOGLE_ANDROID_CLIENT_ID;

const googleClient = new OAuth2Client();

// ============================================================================
// LOGIN / CADASTRO VIA GOOGLE
// ============================================================================
router.post('/login-google', async (req, res) => {

    try {
        const project_id = Number(req.body.project_id);
        const id_instancia = Number(req.body.id_instancia);
        const { id_token } = req.body;

        if (!id_token) {
            return res.status(400).json({
                success: false,
                message: 'id_token é obrigatório'
            });
        }

        // ========================================================
        // TEXTOS (mesmo padrão das outras rotas)
        // ========================================================
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

        // ========================================================
        // VERIFICA O ID_TOKEN DIRETO COM O GOOGLE
        // — nunca confia em nome/email mandado solto pelo app
        // ========================================================
        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: id_token,
                audience: [
                    GOOGLE_WEB_CLIENT_ID,
                    GOOGLE_IOS_CLIENT_ID,
                    GOOGLE_ANDROID_CLIENT_ID
                ].filter(Boolean)
            });

            payload = ticket.getPayload();
        } catch (verifyError) {
            console.error('Token do Google inválido:', verifyError);
            return res.status(401).json({
                success: false,
                message: 'Token do Google inválido ou expirado',
                data: { textos }
            });
        }

        const { email, name, sub: googleId, email_verified } = payload;

        if (!email || !email_verified) {
            return res.status(401).json({
                success: false,
                message: 'Não foi possível confirmar o email da conta Google',
                data: { textos }
            });
        }

        // ========================================================
        // BUSCA CLIENTE PELO EMAIL
        // ========================================================
        const clientesResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'clientes',
            select: ['*'],
            where: { email },
            limit: 1
        });

        let cliente = (clientesResult.data || [])[0] || null;

        // ========================================================
        // NÃO EXISTE AINDA → CRIA CONTA NOVA
        // ========================================================
        if (!cliente) {
            // senha_hash aleatória — essa conta nunca loga com senha,
            // só existe pra satisfazer a coluna NOT NULL da tabela
            const senhaAleatoria = crypto.randomBytes(32).toString('hex');
            const senha_hash = await bcrypt.hash(senhaAleatoria, SALT_ROUNDS);

            const insertResult = await goDataEngine.insert(
                project_id,
                id_instancia,
                'clientes',
                {
                    nome: name || email.split('@')[0],
                    email,
                    telefone: null,
                    senha_hash,
                    google_id: googleId
                }
            );

            const novoId = insertResult.id || insertResult.insertId || insertResult.data?.id;

            cliente = {
                id: novoId,
                id_instancia,
                nome: name || email.split('@')[0],
                email,
                telefone: null,
                criado_em: new Date()
            };
        }

        // ========================================================
        // NÃO DEVOLVER senha_hash
        // ========================================================
        const clienteSeguro = {
            id: cliente.id,
            id_instancia: cliente.id_instancia,
            nome: cliente.nome,
            email: cliente.email,
            telefone: cliente.telefone,
            criado_em: cliente.criado_em
        };

        return res.json({
            success: true,
            data: {
                textos,
                cliente: clienteSeguro
            }
        });

    } catch (error) {
        console.error('Erro ao autenticar com Google:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao autenticar com Google'
        });
    }
});

export default router;