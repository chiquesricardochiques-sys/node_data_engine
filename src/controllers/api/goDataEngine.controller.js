/**
 * ====================================================
 * CONTROLLER GO DATA ENGINE
 * ====================================================
 */

import goDataEngineService from "../../services/goDataEngine.service.js";

/**
 * Função auxiliar para tratar erros de forma consistente
 */
function handleError(res, context, err) {
  console.error(`❌ Erro no ${context}:`, err.message);
  return res.status(500).json({
    success: false,
    message: `Erro ao ${context}`,
    error: err.message,
  });
}

/**
 * Função auxiliar para validação de campos obrigatórios
 */
function validateFields(res, body, requiredFields, context) {
  const missing = requiredFields.filter((f) => !(f in body) || body[f] == null);
  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: `Campos obrigatórios ausentes para ${context}: ${missing.join(", ")}`,
    });
  }
  return null;
}

/* ----------------------
   CRUD / OPERAÇÕES
---------------------- */

// INSERT único
export async function insertRecord(req, res) {
  const validationError = validateFields(req, req.body, ["project_id", "id_instancia", "table", "data"], "insert");
  if (validationError) return validationError;

  try {
    const { project_id, id_instancia, table, data } = req.body;
    const result = await goDataEngineService.insert(project_id, id_instancia, table, data);
    res.json({ success: true, message: "Registro inserido com sucesso", data: result });
  } catch (err) {
    handleError(res, "inserir registro", err);
  }
}

// BATCH INSERT
export async function batchInsert(req, res) {
  const validationError = validateFields(req, req.body, ["project_id", "id_instancia", "table", "data"], "batch insert");
  if (validationError) return validationError;

  if (!Array.isArray(req.body.data)) {
    return res.status(400).json({ success: false, message: "data deve ser um array para batch insert" });
  }

  try {
    const { project_id, id_instancia, table, data } = req.body;
    const result = await goDataEngineService.batchInsert(project_id, id_instancia, table, data);
    res.json({ success: true, message: "Batch insert realizado com sucesso", data: result });
  } catch (err) {
    handleError(res, "inserir registros em lote", err);
  }
}

// ADVANCED SELECT
export async function advancedSelect(req, res) {
  const validationError = validateFields(req, req.body, ["project_id", "id_instancia", "table"], "consulta avançada");
  if (validationError) return validationError;

  try {
    const result = await goDataEngineService.advancedSelect(req.body);
    res.json({
      success: true,
      message: "Consulta realizada com sucesso",
      data: result,
      count: Array.isArray(result.data) ? result.data.length : 0,
    });
  } catch (err) {
    handleError(res, "executar consulta avançada", err);
  }
}

// UPDATE
export async function updateRecord(req, res) {
  const validationError = validateFields(req, req.body, ["project_id", "id_instancia", "table", "data"], "update");
  if (validationError) return validationError;

  try {
    const { project_id, id_instancia, table, data, where, where_raw } = req.body;
    const result = await goDataEngineService.update(project_id, id_instancia, table, data, where || {}, where_raw || null);
    res.json({ success: true, message: "Registro atualizado com sucesso", data: result });
  } catch (err) {
    handleError(res, "atualizar registro", err);
  }
}

// BATCH UPDATE
export async function batchUpdate(req, res) {
  const validationError = validateFields(req, req.body, ["project_id", "id_instancia", "table", "updates"], "batch update");
  if (validationError) return validationError;

  if (!Array.isArray(req.body.updates)) {
    return res.status(400).json({ success: false, message: "updates deve ser um array para batch update" });
  }

  try {
    const { project_id, id_instancia, table, updates } = req.body;
    const result = await goDataEngineService.batchUpdate(project_id, id_instancia, table, updates);
    res.json({ success: true, message: "Batch update realizado com sucesso", data: result });
  } catch (err) {
    handleError(res, "atualizar registros em lote", err);
  }
}

// DELETE
export async function deleteRecord(req, res) {
  const validationError = validateFields(req, req.body, ["project_id", "id_instancia", "table"], "delete");
  if (validationError) return validationError;

  try {
    const { project_id, id_instancia, table, where, where_raw, mode } = req.body;
    const result = await goDataEngineService.delete(project_id, id_instancia, table, where || {}, where_raw || null, mode || "hard");
    res.json({ success: true, message: "Registro(s) deletado(s) com sucesso", data: result });
  } catch (err) {
    handleError(res, "deletar registro(s)", err);
  }
}

// AGGREGATE
export async function aggregate(req, res) {
  const validationError = validateFields(req, req.body, ["project_id", "id_instancia", "table", "operation"], "aggregate");
  if (validationError) return validationError;

  try {
    const { project_id, id_instancia, table, operation, column, where } = req.body;
    const result = await goDataEngineService.aggregate(project_id, id_instancia, table, operation, column || null, where || {});
    res.json({ success: true, message: "Agregação realizada com sucesso", data: result });
  } catch (err) {
    handleError(res, "executar agregação", err);
  }
}
