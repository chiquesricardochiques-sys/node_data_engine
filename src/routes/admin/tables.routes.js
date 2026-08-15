import express from "express";
import * as tablesController from "../../controllers/admin/tables.controller.js";

const router = express.Router();

// LISTAR TABELAS
router.get("/", tablesController.renderListTables);

// DETALHES DA TABELA (🔥 FALTAVA ESSA)
router.get("/details", tablesController.renderTableDetails);

// CRIAR TABELA
router.get("/create", tablesController.renderCreateTable);
router.post("/create", tablesController.createTable);

// DELETAR TABELA
router.post("/delete", tablesController.deleteTable);

// COLUNAS
router.post("/column/add", tablesController.addColumn);
router.post("/column/update", tablesController.modifyColumn);
router.post("/column/drop", tablesController.dropColumn);

// ÍNDICES
router.post("/index/add", tablesController.addIndex);
router.post("/index/drop", tablesController.dropIndex);

export default router;
