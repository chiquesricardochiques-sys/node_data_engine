import goSchemaService from "../../services/goSchema.service.js";
import goProjectsService from "../../services/goProjects.service.js";

/* ====================================================
   LISTAR TABELAS
==================================================== */
async function resolveProject(project_id) {
  const projects = await goProjectsService.listProjects();
  const project = projects.find(p => p.id == project_id);
  if (!project) throw new Error("Projeto não encontrado");
  return project;
}

/* ==================================================== LISTAR TABELAS ==================================================== */
export async function renderListTables(req, res) {
  const projectId = req.query.project_id;

  if (!projectId) {
    return res.status(400).send("project_id é obrigatório");
  }

  try {
    const project = await resolveProject(projectId);

    // ✅ Agora sim
    const tables = await goSchemaService.listTables(project.code);
    
    res.render("admin/tables/list", {
      project,
      tables: tables || []
    });
  } catch (error) {
    console.error("Erro ao renderizar lista de tabelas:", error.message);
    res.status(500).send("Erro ao renderizar lista de tabelas");
  }
}


// Função utilitária para pegar projectCode pelo ID
async function getProjectCodeById(project_id) {
  const projects = await goProjectsService.listProjects();
  const project = projects.find(p => p.id == project_id);
  if (!project) throw new Error("Projeto não encontrado");
  return project.code; // supondo que cada projeto tenha um "code"
}
/* ====================================================
   DETALHES DE UMA TABELA
==================================================== */

export async function renderTableDetails(req, res) {
  const { project_id, table } = req.query;

  if (!project_id || !table) {
    return res.status(400).send("project_id e table são obrigatórios");
  }

  try {
    const projects = await goProjectsService.listProjects();
    const project = projects.find(p => p.id == project_id);

    if (!project) {
      return res.status(404).send("Projeto não encontrado");
    }
    
    // ✅ Usar project.code para chamar Go
    const tableDetails = await goSchemaService.getTableDetails(project.code, table);

    res.render("admin/tables/details", { project, table: tableDetails });
  } catch (err) {
    console.error("Erro ao buscar detalhes da tabela:", err.message);
    res.status(500).send("Erro ao buscar detalhes da tabela");
  }
}


/* ====================================================
   CRIAR TABELA
==================================================== */

export async function renderCreateTable(req, res) {
  const projectId = req.query.project_id;
  
  if (!projectId) {
    return res.status(400).send("project_id é obrigatório");
  }

  try {
    const projects = await goProjectsService.listProjects();
    const project = projects.find(p => p.id == projectId);

    if (!project) {
      return res.status(404).send("Projeto não encontrado");
    }

    res.render("admin/tables/create", { project });
  } catch (err) {
    console.error("Erro ao renderizar criação de tabela:", err.message);
    res.status(500).send("Erro ao renderizar criação de tabela");
  }
}

export async function createTable(req, res) {
  const { project_id, table_name, columns_json, indexes_json } = req.body;
  if (!project_id || !table_name || !columns_json) 
    return res.status(400).send("Campos obrigatórios faltando");

  try {
    const projectCode = await getProjectCodeById(project_id);

    const columns = JSON.parse(columns_json);
    const indexes = indexes_json ? JSON.parse(indexes_json) : [];

    await goSchemaService.createTable(projectCode, {
      project_id,
      table_name,
      columns,
      indexes
    });

    res.redirect(`/admin/tables?project_id=${project_id}`);
  } catch (err) {
    console.error("Erro ao criar tabela:", err.message);
    res.status(500).send(err.message);
  }
}

/* ====================================================
   DELETAR TABELA
==================================================== */

export async function deleteTable(req, res) {
  const { project_id, table } = req.body;
  
  if (!project_id || !table) {
    return res.status(400).json({ success: false, message: "project_id e table são obrigatórios" });
  }

  try {

    const projectCode = await getProjectCodeById(project_id);
    await goSchemaService.deleteTable(projectCode, table);
    res.redirect(`/admin/tables?project_id=${project_id}`);
  } catch (err) {
    console.error("Erro ao deletar tabela:", err.message);
    res.status(500).json({ success: false, message: "Erro ao deletar tabela" });
  }
}

/* ====================================================
   GERENCIAR COLUNAS
==================================================== */

export async function addColumn(req, res) {
  const { project_id, table, name, type, nullable, unique } = req.body;
  
  if (!project_id || !table || !name || !type) {
    return res.status(400).json({ success: false, message: "Campos obrigatórios faltando" });
  }

  const columnData = {
    name,
    type,
    nullable: !!nullable,
    unique: !!unique
  };

  try {
    const projectCode = await getProjectCodeById(project_id);
    await goSchemaService.addColumn(projectCode, table, columnData);

    res.redirect(`/admin/tables/details?project_id=${project_id}&table=${table}`);
  } catch (err) {
    console.error("Erro ao adicionar coluna:", err.message);
    res.status(500).json({ success: false, message: "Erro ao adicionar coluna" });
  }
}

export async function modifyColumn(req, res) {
  const { project_id, table, name, type, nullable, unique } = req.body;
  if (!project_id || !table || !name || !type)
    return res.status(400).json({ success: false, message: "Campos obrigatórios faltando" });

  try {
    const projectCode = await getProjectCodeById(project_id);

    await goSchemaService.modifyColumn(projectCode, table, {
      name,
      type,
      nullable: !!nullable,
      unique: !!unique
    });

    res.redirect(`/admin/tables/details?project_id=${project_id}&table=${table}`);
  } catch (err) {
    console.error("Erro ao modificar coluna:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function dropColumn(req, res) {
  const { project_id, table, column } = req.body;
  
  if (!project_id || !table || !column) {
    return res.status(400).json({ success: false, message: "Campos obrigatórios faltando" });
  }

  try {
    const projectCode = await getProjectCodeById(project_id);
    await goSchemaService.dropColumn(projectCode, table, column);

    res.redirect(`/admin/tables/details?project_id=${project_id}&table=${table}`);
  } catch (err) {
    console.error("Erro ao remover coluna:", err.message);
    res.status(500).json({ success: false, message: "Erro ao remover coluna" });
  }
}

/* ====================================================
   GERENCIAR ÍNDICES
==================================================== */

export async function addIndex(req, res) {
  const { project_id, table, name, columns, type } = req.body;
  
  if (!project_id || !table || !name || !columns) {
    return res.status(400).json({ success: false, message: "Campos obrigatórios faltando" });
  }

  const indexData = {
    name,
    columns: Array.isArray(columns) ? columns : columns.split(',').map(c => c.trim()),
    type: type || "INDEX"
  };

  try {
    const projectCode = await getProjectCodeById(project_id);
    await goSchemaService.addIndex(projectCode, table, indexData);

    res.redirect(`/admin/tables/details?project_id=${project_id}&table=${table}`);
  } catch (err) {
    console.error("Erro ao adicionar índice:", err.message);
    res.status(500).json({ success: false, message: "Erro ao adicionar índice" });
  }
}

export async function dropIndex(req, res) {
  const { project_id, table, index } = req.body;
  
  if (!project_id || !table || !index) {
    return res.status(400).json({ success: false, message: "Campos obrigatórios faltando" });
  }

  try {
    const projectCode = await getProjectCodeById(project_id);
    await goSchemaService.dropIndex(projectCode, table, index);

    res.redirect(`/admin/tables/details?project_id=${project_id}&table=${table}`);
  } catch (err) {
    console.error("Erro ao remover índice:", err.message);
    res.status(500).json({ success: false, message: "Erro ao remover índice" });
  }
}