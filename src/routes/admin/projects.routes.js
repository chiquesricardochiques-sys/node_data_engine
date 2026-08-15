import express from "express";
import * as projectsController from "../../controllers/admin/projects.controller.js";

const router = express.Router();

// Renderização
router.get("/", projectsController.renderListProjects);
router.get("/create", projectsController.renderCreateProject);
router.get("/edit/:id", projectsController.renderEditProject);
// router.get("/instances/:id", projectsController.renderInstances);
// Renderização do formulário de criação de instância
// router.get("/instances/create/:id", projectsController.renderCreateInstance);


// APIs (JSON)
router.get("/api", projectsController.listProjects);
router.post("/api", projectsController.createProject);
// router.put("/api/:id", projectsController.updateProject);
// POST para salvar edição do projeto via form HTML
router.post("/:id", projectsController.updateProject);


router.delete("/api/:id", projectsController.deleteProject);

// ========================
// INSTÂNCIAS
// ========================

// Lista instâncias do projeto
router.get("/:projectId/instances", projectsController.renderInstances);

// Formulário de criação
router.get("/:projectId/instances/create", projectsController.renderCreateInstance);

// Criar instância (POST do formulário)
router.post("/:projectId/instances", projectsController.createInstance);


router.get("/:projectId/instances/:instanceId/edit", projectsController.renderEditInstance);
router.post("/:projectId/instances/:instanceId", projectsController.updateInstance);
router.post("/:projectId/instances/:instanceId/delete", projectsController.deleteInstance);

export default router;
