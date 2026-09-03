import express from 'express';
import bcrypt from 'bcrypt';
import goDataEngine from '../../services/goDataEngine.service.js';
import imgService from '../api/routsImg.js';

const router = express.Router();

const SALT_ROUNDS = 10;

// 📌 Função auxiliar para extrair e validar os IDs enviados pelo app ou usar variáveis de ambiente como fallback
function getTenantIds(req) {
    const project_id = Number(req.body.project_id || req.query.project_id || process.env.PROJECT_ID) || 1;
    // Aceita tanto instance_id (padrão novo do app) quanto id_instancia (legado)
    const id_instancia = Number(req.body.instance_id || req.body.id_instancia || req.query.instance_id || req.query.id_instancia || process.env.ID_INSTANCIA) || 1;
    
    return { project_id, id_instancia };
}

router.post('/admins/list', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);

        const result = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'admin',
            select: ['id', 'nome', 'email', 'criado_em'],
            order_by: 'criado_em DESC'
        });

        return res.json({ success: true, data: { admins: result.data || [] } });
    } catch (error) {
        console.error('Erro ao listar admins:', error);
        return res.status(500).json({ success: false, message: 'Erro ao listar admins' });
    }
});

router.post('/admins/create', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });
        }
        if (senha.length < 6) {
            return res.status(400).json({ success: false, message: 'Senha deve ter ao menos 6 caracteres' });
        }

        const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);

        await goDataEngine.insert(project_id, id_instancia, 'admin', { nome, email, senha_hash });

        return res.json({ success: true, message: 'Admin criado com sucesso!' });

    } catch (error) {
        console.error('Erro ao criar admin:', error);

        if (error?.code === 'ER_DUP_ENTRY' || String(error?.message || '').includes('Duplicate')) {
            return res.status(409).json({ success: false, message: 'Email já cadastrado' });
        }
        return res.status(500).json({ success: false, message: 'Erro ao criar admin' });
    }
});

router.post('/admins/update', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { id, nome, email } = req.body;

        if (!id || !nome || !email) {
            return res.status(400).json({ success: false, message: 'id, nome e email são obrigatórios' });
        }

        await goDataEngine.update(project_id, id_instancia, 'admin', { nome, email }, { id: Number(id) });

        return res.json({ success: true, message: 'Admin atualizado com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar admin:', error);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar admin' });
    }
});

router.post('/admins/update-password', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { id, senha } = req.body;

        if (!id || !senha || senha.length < 6) {
            return res.status(400).json({ success: false, message: 'Senha deve ter ao menos 6 caracteres' });
        }

        const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);

        await goDataEngine.update(project_id, id_instancia, 'admin', { senha_hash }, { id: Number(id) });

        return res.json({ success: true, message: 'Senha atualizada com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar senha do admin:', error);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar senha' });
    }
});

router.post('/admins/delete', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantIds(req);
        const { id, admin_id_solicitante } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'id é obrigatório' });
        }

        // não pode se auto-deletar
        if (Number(id) === Number(admin_id_solicitante)) {
            return res.status(400).json({ success: false, message: 'Você não pode remover a si mesmo' });
        }

        const totalResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'admin',
            select: ['id']
        });
        const total = (totalResult.data || []).length;

        if (total <= 1) {
            return res.status(400).json({ success: false, message: 'Não é possível remover o último admin' });
        }

        await goDataEngine.delete(project_id, id_instancia, 'admin', { id: Number(id) });

        return res.json({ success: true, message: 'Admin removido com sucesso!' });

    } catch (error) {
        console.error('Erro ao remover admin:', error);
        return res.status(500).json({ success: false, message: 'Erro ao remover admin' });
    }
});

router.post('/instancia/perfil', async (req, res) => {
    try {
        const { id_instancia } = getTenantIds(req);

        const result = await goDataEngine.advancedSelect({
            project_id: 1, // irrelevante aqui, use_prefix ignora
            id_instancia,
            table: 'instancias_projetion',
            alias: 'inst',
            select: [
                'id', 'project_id', 'client_name', 'email', 'phone',
                'name', 'code', 'description', 'status',
                'endereco', 'cidade', 'estado', 'cep',
                'whatsapp', 'logo_url'
            ],
            where: { id: id_instancia },
            use_prefix: 1, // 🔧 tabela núcleo, sem prefixo de projeto e sem filtro automático id_instancia
            limit: 1
        });

        const instancia = (result.data || [])[0] || null;

        if (!instancia) {
            return res.status(404).json({ success: false, message: 'Instância não encontrada' });
        }

        return res.json({ success: true, data: { instancia } });

    } catch (error) {
        console.error('Erro ao buscar perfil da instância:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar perfil da instância' });
    }
});

export default router;