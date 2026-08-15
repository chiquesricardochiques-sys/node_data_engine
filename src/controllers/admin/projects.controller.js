import goProjectsService from "../../services/goProjects.service.js";

// =========================
// UTILS: Builder + Validação
// =========================
function buildProjectPayload(data = {}) {
  return {
    name: data.name || "",
    code: data.code || "",
    type: data.type || "",
    version: data.version || "1.0",
    status: data.status || "active",
    api_key: data.api_key || ""
  };
}

function validateProjectPayload(payload) {
  const required = ["name", "code", "type", "version", "status", "api_key"];
  const missing = required.filter(f => !payload[f] || payload[f].toString().trim() === "");
  if (missing.length > 0) {
    throw new Error(`Campos obrigatórios ausentes: ${missing.join(", ")}`);
  }
}

// =========================
// RENDER CONTROLLERS
// =========================
export async function renderListProjects(req, res) {
  try {
    const projects = await goProjectsService.listProjects();
    res.render("admin/projects/list", { projects });
  } catch (err) {
    console.error("Erro ao listar projetos:", err.message);
    res.render("admin/projects/list", { projects: [], error: "Erro ao carregar projetos" });
  }
}

export async function renderCreateProject(req, res) {
  res.render("admin/projects/create", { title: "Criar Novo Projeto" });
}

export async function renderEditProject(req, res) {
  try {
    const id = req.params.id;
    const projects = await goProjectsService.listProjects();
    const project = projects.find(p => p.id == id);
    if (!project) {
      req.flash("error", "Projeto não encontrado");
      return res.redirect("/admin/projects");
    }
    res.render("admin/projects/edit", { project });
  } catch (err) {
    console.error("Erro ao carregar projeto:", err.message);
    res.redirect("/admin/projects");
  }
}

// =========================
// API CONTROLLERS
// =========================
export async function listProjects(req, res) {
  try {
    const projects = await goProjectsService.listProjects();
    res.json({ success: true, data: projects });
  } catch (err) {
    console.error("Erro ao listar projetos:", err.message);
    res.status(500).json({ success: false, message: "Erro ao listar projetos" });
  }
}

export async function createProject(req, res) {
  try {
    const payload = buildProjectPayload(req.body);
    validateProjectPayload(payload);

    await goProjectsService.createProject(payload);

    req.flash("success", "Projeto criado com sucesso!");
    res.redirect("/admin/projects");
  } catch (err) {
    console.error("Erro ao criar projeto:", err.message);
    req.flash("error", err.message || "Erro ao criar projeto. Tente novamente.");
    res.redirect("/admin/projects/create");
  }
}

export async function updateProject(req, res) {
  try {
    const id = req.params.id;
    const payload = buildProjectPayload(req.body);
    validateProjectPayload(payload);

    await goProjectsService.updateProject(id, payload);

    const projects = await goProjectsService.listProjects();
    const project = projects.find(p => p.id == id);

    if (!project) {
      req.flash("error", "Projeto não encontrado após atualização");
      return res.redirect("/admin/projects");
    }

    res.render("admin/projects/edit", { project, success: "Projeto atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar projeto:", err.message);

    const projects = await goProjectsService.listProjects();
    const project = projects.find(p => p.id == req.params.id);

    res.render("admin/projects/edit", {
      project,
      error: err.message || "Erro ao atualizar projeto. Tente novamente."
    });
  }
}

export async function deleteProject(req, res) {
  try {
    const id = req.params.id;
    await goProjectsService.deleteProject(id);
    res.json({ success: true, message: "Projeto deletado com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar projeto:", err.message);
    res.status(500).json({ success: false, message: "Erro ao deletar projeto" });
  }
}

// =========================
// UTILS: Builder + Validação
// =========================
function buildInstancePayload(data = {}) {
  return {
    project_id: Number(data.project_id) || null,
    client_name: data.client_name || "",
    email: data.email || "",
    phone: data.phone || "",
    price: Number(data.price) || 0,
    payment_day: Number(data.payment_day) || null,
    name: data.name || "",
    code: data.code || "",
    description: data.description || "",
    status: data.status || "active",
    settings: data.settings || {}
  };
}

function validateInstancePayload(payload) {
  const required = ["project_id", "client_name", "email", "name", "code"];
  const missing = required.filter(f => !payload[f] && payload[f] !== 0);
  if (missing.length > 0) {
    throw new Error(`Campos obrigatórios ausentes: ${missing.join(", ")}`);
  }
}

// =========================
// RENDER CONTROLLERS
// =========================
export async function renderInstances(req, res) {
  const projectId = req.params.projectId;
  try {
    const projects = await goProjectsService.listProjects();
    const project = projects.find(p => p.id == projectId);
    if (!project) return res.redirect("/admin/projects");

    const instances = await goProjectsService.listInstances(projectId);
    res.render("admin/projects/instances", { project, instances });
  } catch (err) {
    console.error("Erro ao renderizar instâncias:", err.message);
    res.redirect("/admin/projects");
  }
}

export async function renderCreateInstance(req, res) {
  const projectId = req.params.projectId;
  try {
    const project = (await goProjectsService.listProjects()).find(p => p.id == projectId);
    if (!project) {
      req.flash("error", "Projeto não encontrado");
      return res.redirect("/admin/projects");
    }

    res.render("admin/projects/create-instance", { project, title: `Criar Instância para ${project.name}` });
  } catch (err) {
    console.error("Erro ao renderizar criação de instância:", err.message);
    res.redirect("/admin/projects");
  }
}

export async function renderEditInstance(req, res) {
  const { projectId, instanceId } = req.params;
  try {
    const project = (await goProjectsService.listProjects()).find(p => p.id == projectId);
    if (!project) {
      req.flash("error", "Projeto não encontrado");
      return res.redirect("/admin/projects");
    }

    const instances = await goProjectsService.listInstances(projectId);
    const instance = instances.find(i => i.id == instanceId);

    if (!instance) {
      req.flash("error", "Instância não encontrada");
      return res.redirect(`/admin/projects/${projectId}/instances`);
    }

    res.render("admin/projects/edit-instance", { project, instance });
  } catch (err) {
    console.error("Erro ao renderizar edição da instância:", err.message);
    res.redirect(`/admin/projects/${projectId}/instances`);
  }
}

// =========================
// API CONTROLLERS
// =========================
export async function listInstances(req, res) {
  const projectId = req.query.project_id;
  try {
    if (!projectId) return res.status(400).json({ success: false, message: "project_id é obrigatório" });

    const instances = await goProjectsService.listInstances(projectId);
    res.json({ success: true, data: instances });
  } catch (err) {
    console.error("Erro ao listar instâncias:", err.message);
    res.status(500).json({ success: false, message: "Erro ao listar instâncias" });
  }
}

export async function createInstance(req, res) {
  const projectId = req.params.projectId;
  try {
    const payload = buildInstancePayload({ ...req.body, project_id: projectId });
    validateInstancePayload(payload);

    await goProjectsService.createInstance(payload);
    res.redirect(`/admin/projects/${projectId}/instances`);
  } catch (err) {
    console.error("Erro ao criar instância:", err.message);

    const project = (await goProjectsService.listProjects()).find(p => p.id == projectId);
    res.render("admin/projects/create-instance", { project, error: err.message });
  }
}

export async function updateInstance(req, res) {
  const { projectId, instanceId } = req.params;
  try {
    const payload = buildInstancePayload({ ...req.body, project_id: projectId });
    validateInstancePayload(payload);

    await goProjectsService.updateInstance(instanceId, payload);
    res.redirect(`/admin/projects/${projectId}/instances`);
  } catch (err) {
    console.error("Erro ao atualizar instância:", err.message);
    res.redirect(`/admin/projects/${projectId}/instances/${instanceId}/edit`);
  }
}

export async function deleteInstance(req, res) {
  const { projectId, instanceId } = req.params;
  try {
    await goProjectsService.deleteInstance(instanceId);
    res.redirect(`/admin/projects/${projectId}/instances`);
  } catch (err) {
    console.error("Erro ao deletar instância:", err.message);
    res.redirect(`/admin/projects/${projectId}/instances`);
  }
}

