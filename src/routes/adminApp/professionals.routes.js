import express from 'express';
import multer from 'multer';
import bcrypt from 'bcrypt';
import goDataEngine from '../../services/goDataEngine.service.js';
import * as imgService from '../../services/img/servicesImg.js';

const router = express.Router();

const upload = multer({
    dest: 'src/uploads/tmp/',
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (tiposPermitidos.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG ou WEBP.'));
    },
});

// 📌 Função auxiliar para extrair dinamicamente os dados de tenant de cada request
function getTenantConfig(req) {
    const project_id = Number(req.body.project_id || req.query.project_id || process.env.PROJECT_ID) || 1;
    const id_instancia = Number(req.body.instance_id || req.body.id_instancia || req.query.instance_id || req.query.id_instancia || process.env.ID_INSTANCIA) || 1;
    const project_code = req.body.project_code || req.query.project_code || process.env.PROJECT_CODE || 'salao_beleza';
    
    return { project_id, id_instancia, project_code };
}

function validarNome(nome) {
    return nome && nome.trim() !== '';
}

function validarEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email && re.test(email.trim());
}

async function processarImagem(req) {
    if (!req.file) return null;
    const { project_code, id_instancia } = getTenantConfig(req);
    
    return await imgService.uploadImagem({
        filePath: req.file.path,
        project_code,
        id_instancia,
        table: 'profissionais',
    });
}

async function processarAtualizacaoImagem(req, public_id_antigo) {
    if (!req.file) return null;
    const { project_code, id_instancia } = getTenantConfig(req);
    
    return await imgService.atualizarImagem({
        filePath: req.file.path,
        public_id_antigo,
        project_code,
        id_instancia,
        table: 'profissionais',
    });
}

// ----------------------------------------------------------------------------
// LISTAR PROFISSIONAIS
// ----------------------------------------------------------------------------
router.post('/professionals/list', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);

        const result = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: [
                'id',
                'id_instancia',
                'nome',
                'email',
                'especialidade',
                'ativo',
                'img',
                'img_public_id',
                'tipo_remuneracao',
                'percentual_comissao',
                'salario_fixo',
                'frequencia_pagamento',
                'usa_horarios',
                'criado_em'
            ],
            order_by: 'nome ASC'
        });

        return res.json({ success: true, data: { profissionais: result.data || [] } });
    } catch (error) {
        console.error('Erro ao listar profissionais:', error);
        return res.status(500).json({ success: false, message: 'Erro ao listar profissionais' });
    }
});

// ----------------------------------------------------------------------------
// CRIAR PROFISSIONAL
// ----------------------------------------------------------------------------
router.post("/professionals/create", upload.single("imagem"), async (req, res) => {
  try {
    const { project_id, id_instancia } = getTenantConfig(req);
    const {
      nome,
      email,
      senha,
      especialidade,
      tipo_remuneracao,
      percentual_comissao,
      salario_fixo,
      frequencia_pagamento,
      usa_horarios
    } = req.body;

    if (!validarNome(nome)) {
        return res.status(400).json({ success: false, message: 'Nome do profissional é obrigatório.' });
    }

    if (!validarEmail(email)) {
        return res.status(400).json({ success: false, message: 'E-mail inválido.' });
    }

    const freqPagamentoFinal = ['mensal', 'quinzenal', 'semanal'].includes(frequencia_pagamento) 
      ? frequencia_pagamento 
      : 'mensal';

    const usaHorariosFinal = (usa_horarios === false || usa_horarios === "0" || usa_horarios === 0) ? 0 : 1;

    const hashSenha = senha ? await bcrypt.hash(senha, 10) : null;
    
    const imgData = await processarImagem(req);

    const dadosInsercao = {
      project_id,
      id_instancia,
      table: 'profissionais',
      data: {
        nome: nome.trim(),
        email: email.trim(),
        senha: hashSenha,
        especialidade: especialidade ? especialidade.trim() : null,
        tipo_remuneracao: tipo_remuneracao || 'comissao',
        percentual_comissao: percentual_comissao ? Number(percentual_comissao) : 0,
        salario_fixo: salario_fixo ? Number(salario_fixo) : 0,
        frequencia_pagamento: freqPagamentoFinal,
        usa_horarios: usaHorariosFinal,
        img: imgData?.secure_url || null,
        img_public_id: imgData?.public_id || null,
        ativo: 1
      }
    };

    const result = await goDataEngine.insert(dadosInsercao);
    const insertId = result?.insertId || result?.id;

    return res.json({ success: true, message: "Profissional criado com sucesso!", id: insertId });
  } catch (error) {
    console.error("Erro ao criar profissional:", error);
    return res.status(500).json({ success: false, message: "Erro interno no servidor." });
  }
});

// ----------------------------------------------------------------------------
// ATUALIZAR PROFISSIONAL
// ----------------------------------------------------------------------------
router.post("/professionals/update", upload.single("imagem"), async (req, res) => {
  try {
    const { project_id, id_instancia } = getTenantConfig(req);
    const {
      id,
      nome,
      email,
      senha_hash,
      especialidade,
      ativo,
      tipo_remuneracao,
      percentual_comissao,
      salario_fixo,
      frequencia_pagamento,
      usa_horarios
    } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID do profissional é obrigatório.' });
    }

    const isAtivo = (ativo === "on" || ativo === "1" || ativo === true || ativo === 1) ? 1 : 0;
    const freqPagamentoFinal = ['mensal', 'quinzenal', 'semanal'].includes(frequencia_pagamento) 
      ? frequencia_pagamento 
      : 'mensal';

    const usaHorariosFinal = (usa_horarios === false || usa_horarios === "0" || usa_horarios === 0) ? 0 : 1;

    const atualResult = await goDataEngine.advancedSelect({
        project_id,
        id_instancia,
        table: 'profissionais',
        select: ['*'],
        where: { id: Number(id) },
        limit: 1
    });
    const profissionalAtual = (atualResult.data || [])[0] || null;

    let dadosUpdate = {
      nome: nome ? nome.trim() : profissionalAtual?.nome,
      email: email ? email.trim() : profissionalAtual?.email,
      especialidade: especialidade !== undefined ? (especialidade ? especialidade.trim() : null) : profissionalAtual?.especialidade,
      ativo: isAtivo,
      tipo_remuneracao: tipo_remuneracao || profissionalAtual?.tipo_remuneracao || 'comissao',
      percentual_comissao: percentual_comissao !== undefined ? Number(percentual_comissao) : (profissionalAtual?.percentual_comissao || 0),
      salario_fixo: salario_fixo !== undefined ? Number(salario_fixo) : (profissionalAtual?.salario_fixo || 0),
      frequencia_pagamento: freqPagamentoFinal,
      usa_horarios: usaHorariosFinal
    };

    if (senha_hash && senha_hash.trim() !== "") {
      dadosUpdate.senha_hash = await bcrypt.hash(senha_hash.trim(), 10);
    }

    if (req.file) {
      const imgData = await processarAtualizacaoImagem(req, profissionalAtual?.img_public_id);
      if (imgData?.secure_url) {
        dadosUpdate.img = imgData.secure_url;
        dadosUpdate.img_public_id = imgData.public_id;
      }
    }

    await goDataEngine.update(project_id, id_instancia, 'profissionais', dadosUpdate, { id: Number(id) });

    return res.json({ success: true, message: "Profissional atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar profissional:", error);
    return res.status(500).json({ success: false, message: "Erro interno no servidor." });
  }
});

// ----------------------------------------------------------------------------
// REMOVER PROFISSIONAL
// ----------------------------------------------------------------------------
router.post('/professionals/delete', async (req, res) => {
    try {
        const { project_id, id_instancia } = getTenantConfig(req);
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID do profissional é obrigatório.' });
        }

        const atualResult = await goDataEngine.advancedSelect({
            project_id,
            id_instancia,
            table: 'profissionais',
            select: ['*'],
            where: { id: Number(id) },
            limit: 1
        });
        const profissional = (atualResult.data || [])[0] || null;

        if (profissional?.img_public_id) {
            await imgService.deletarImagem(profissional.img_public_id).catch(() => {});
        }

        await goDataEngine.delete(project_id, id_instancia, 'profissionais', { id: Number(id) });

        return res.json({ success: true, message: 'Profissional removido com sucesso!' });

    } catch (error) {
        console.error('Erro ao remover profissional:', error);
        return res.status(500).json({ success: false, message: 'Erro ao remover profissional' });
    }
});

export default router;