import express from 'express';
import bcrypt from 'bcrypt';
import goDataEngine from '../../services/goDataEngine.service.js';

const router = express.Router();

// 📌 Função auxiliar para extrair e validar os IDs enviados dinamicamente pelo app
function getTenantIds(req) {
    const project_id = Number(req.body.project_id || req.query.project_id || process.env.PROJECT_ID) || 1;
    const id_instancia = Number(req.body.instance_id || req.body.id_instancia || req.query.instance_id || req.query.id_instancia || process.env.ID_INSTANCIA) || 1;
    
    return { project_id, id_instancia };
}

// ============================================================================
// LOGIN ADMIN
// ============================================================================
router.post('/login', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
        }

        const adminsResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'admin',
            select: ['*'],
            where: { email },
            limit: 1
        });

        const admin = (adminsResult.data || [])[0] || null;

        if (!admin) {
            return res.status(401).json({ success: false, message: 'Email ou senha incorretos!' });
        }

        const senhaValida = await bcrypt.compare(senha, admin.senha_hash);

        if (!senhaValida) {
            return res.status(401).json({ success: false, message: 'Email ou senha incorretos!' });
        }

        const adminSeguro = {
            id: admin.id,
            nome: admin.nome,
            email: admin.email,
            criado_em: admin.criado_em
        };

        return res.json({ success: true, data: { admin: adminSeguro } });

    } catch (error) {
        console.error('Erro ao validar login do admin:', error);
        return res.status(500).json({ success: false, message: 'Erro ao validar login' });
    }
});

// ============================================================================
// LOGIN PROFISSIONAL
// ============================================================================
router.post('/login-profissional', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
        }

        const profResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: ['*'],
            where: { email },
            limit: 1
        });

        const profissional = (profResult.data || [])[0] || null;

        if (!profissional || !profissional.senha_hash) {
            return res.status(401).json({ success: false, message: 'Email ou senha incorretos!' });
        }

        if (profissional.ativo === 0) {
            return res.status(403).json({ success: false, message: 'Este profissional está inativo.' });
        }

        const senhaValida = await bcrypt.compare(senha, profissional.senha_hash);

        if (!senhaValida) {
            return res.status(401).json({ success: false, message: 'Email ou senha incorretos!' });
        }

        const profissionalSeguro = {
            id: profissional.id,
            nome: profissional.nome,
            email: profissional.email,
            especialidade: profissional.especialidade,
            img: profissional.img
        };

        return res.json({ success: true, data: { profissional: profissionalSeguro } });

    } catch (error) {
        console.error('Erro ao validar login do profissional:', error);
        return res.status(500).json({ success: false, message: 'Erro ao validar login' });
    }
});

export default router;