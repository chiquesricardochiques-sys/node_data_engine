import express from "express";
import validateApiKey from "../../middlewares/apiKey.middleware.js";
import * as controller from "../../controllers/api/goDataEngine.controller.js";

const router = express.Router();

// CRUD / Data Engine   
router.post("/insert", validateApiKey, controller.insertRecord);
router.post("/batch-insert", validateApiKey, controller.batchInsert);
router.post("/get", validateApiKey, controller.advancedSelect);
router.post("/update", validateApiKey, controller.updateRecord);
router.post("/batch-update", validateApiKey, controller.batchUpdate);
router.post("/delete", validateApiKey, controller.deleteRecord);
router.post("/aggregate", validateApiKey, controller.aggregate);

export default router;


