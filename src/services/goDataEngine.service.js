/**
 * ====================================================
 * DATA ENGINE SERVICE - Comunicação com Go API
 * ====================================================
 * 
 * Serviço para interação com o Data Engine (Go).
 * Encapsula todas as operações CRUD e agregações.
 * 
 * Rotas disponíveis:
 * - POST /data/select - SELECT avançado
 * - POST /data/join-select - SELECT com múltiplos JOINs
 * - POST /data/insert - INSERT único
 * - POST /data/batch-insert - INSERT em lote
 * - POST /data/update - UPDATE único
 * - POST /data/batch-update - UPDATE em lote
 * - POST /data/delete - DELETE (hard/soft)
 * - POST /data/aggregate - Agregações (COUNT, SUM, AVG, etc)
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const GO_API_URL = process.env.GO_API_URL || "http://tffheezd9i7paesyggxl83ts.179.198.119.43.sslip.io";
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;

/**
 * Headers padrão para requisições
 */
function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Internal-Token": INTERNAL_TOKEN,
  };
}

/**
 * Executa requisição HTTP POST para o Go
 * @private
 */
async function requestToGo(endpoint, payload) {
  try {
    const res = await axios.post(`${GO_API_URL}${endpoint}`, payload, {
      headers: getHeaders(),
      timeout: 30000,
    });
    return res.data;
  } catch (err) {
    console.error(
      `❌ Erro em ${endpoint}:`,
      err.response?.data || err.message
    );
    throw new Error(err.response?.data?.error || err.message);
  }
}

/* ====================================================
   SELECT - CONSULTAS
==================================================== */

/**
 * SELECT avançado com JOINs, filtros e paginação
 * 
 * @param {Object} options - Configurações da query
 * @param {number} options.project_id - ✅ OBRIGATÓRIO - ID do projeto
 * @param {number} options.id_instancia - ✅ OBRIGATÓRIO - ID da instância
 * @param {string} options.table - ✅ OBRIGATÓRIO - Nome da tabela (sem prefixo)
 * @param {string} [options.alias] - ❌ OPCIONAL - Alias da tabela
 * @param {string[]} [options.select] - ❌ OPCIONAL - Colunas ["id", "nome"] (padrão: *)
 * @param {Object[]} [options.joins] - ❌ OPCIONAL - Array de JOINs
 * @param {string} options.joins[].type - Tipo: INNER, LEFT, RIGHT
 * @param {string} options.joins[].table - Nome da tabela
 * @param {string} options.joins[].alias - Alias da tabela
 * @param {string} options.joins[].on - Condição ON
 * @param {Object} [options.where] - ❌ OPCIONAL - Filtros {coluna: valor}
 * @param {string} [options.where_raw] - ❌ OPCIONAL - WHERE customizado
 * @param {string} [options.group_by] - ❌ OPCIONAL - GROUP BY
 * @param {string} [options.having] - ❌ OPCIONAL - HAVING
 * @param {string} [options.order_by] - ❌ OPCIONAL - ORDER BY
 * @param {number} [options.limit] - ❌ OPCIONAL - LIMIT
 * @param {number} [options.offset] - ❌ OPCIONAL - OFFSET
 * 
 * @returns {Promise<{success: boolean, data: Array, count: number}>}
 * 
 * @example
 * // Busca simples
 * await advancedSelect({
 *   project_id: 1,
 *   id_instancia: 10,
 *   table: "usuarios",
 *   select: ["id", "nome", "email"],
 *   where: { status: "ativo" },
 *   order_by: "nome ASC",
 *   limit: 20
 * });
 * 
 * @example
 * // Com JOIN
 * await advancedSelect({
 *   project_id: 1,
 *   id_instancia: 10,
 *   table: "pedidos",
 *   alias: "p",
 *   select: ["p.*", "c.nome as cliente_nome"],
 *   joins: [{
 *     type: "LEFT",
 *     table: "clientes",
 *     alias: "c",
 *     on: "p.cliente_id = c.id"
 *   }],
 *   where: { "p.status": "aprovado" },
 *   limit: 50
 * });
 */
async function advancedSelect(options) {
  const {
    project_id,
    id_instancia,
    table,
    alias,
    select,
    joins,
    where,
    where_raw,
    group_by,
    having,
    order_by,
    limit,
    offset,
    use_prefix,
  } = options;

  if (!project_id || !id_instancia || !table) {
    throw new Error("project_id, id_instancia e table são obrigatórios");
  }

  const payload = {
    project_id: Number(project_id),
    id_instancia: Number(id_instancia),
    table,
    alias: alias || "",
    select: Array.isArray(select) ? select : [],
    joins: Array.isArray(joins) ? joins : [],
    where: where && typeof where === "object" ? where : {},
    where_raw: where_raw || "",
    group_by: group_by || "",
    having: having || "",
    order_by: order_by || "",
    limit: limit || 0,
    offset: offset || 0,
    use_prefix,
  };
  console.log("Payload para advancedSelect:", payload); // Log do payload
  return requestToGo("/data/select", payload);
}

/**
 * SELECT com múltiplos JOINs complexos
 * 
 * @param {Object} options - Configurações
 * @param {number} options.project_id - ✅ OBRIGATÓRIO - ID do projeto
 * @param {number} options.id_instancia - ✅ OBRIGATÓRIO - ID da instância
 * @param {Object} options.base - ✅ OBRIGATÓRIO - Tabela base
 * @param {string} options.base.table - Nome da tabela base
 * @param {string} [options.base.alias] - Alias da tabela base
 * @param {string[]} [options.base.columns] - Colunas da tabela base
 * @param {Object[]} [options.joins] - ❌ OPCIONAL - Array de JOINs
 * @param {string} options.joins[].type - Tipo: INNER, LEFT, RIGHT
 * @param {string} options.joins[].table - Nome da tabela
 * @param {string} [options.joins[].alias] - Alias da tabela
 * @param {string} options.joins[].on - Condição ON
 * @param {string[]} [options.joins[].columns] - Colunas do JOIN
 * @param {Object} [options.where] - ❌ OPCIONAL - Filtros simples
 * @param {string[]} [options.where_raw] - ❌ OPCIONAL - Array de condições WHERE
 * @param {string} [options.group_by] - ❌ OPCIONAL - GROUP BY
 * @param {string} [options.having] - ❌ OPCIONAL - HAVING
 * @param {string} [options.order_by] - ❌ OPCIONAL - ORDER BY
 * @param {number} [options.limit] - ❌ OPCIONAL - LIMIT
 * @param {number} [options.offset] - ❌ OPCIONAL - OFFSET
 * 
 * @returns {Promise<{success: boolean, data: Array, count: number}>}
 * 
 * @example
 * await joinSelect({
 *   project_id: 1,
 *   id_instancia: 10,
 *   base: {
 *     table: "pedidos",
 *     alias: "p",
 *     columns: ["p.id", "p.total", "p.data_pedido"]
 *   },
 *   joins: [
 *     {
 *       type: "INNER",
 *       table: "clientes",
 *       alias: "c",
 *       on: "p.cliente_id = c.id",
 *       columns: ["c.nome", "c.email"]
 *     },
 *     {
 *       type: "LEFT",
 *       table: "pagamentos",
 *       alias: "pg",
 *       on: "p.id = pg.pedido_id",
 *       columns: ["pg.metodo", "pg.valor_pago"]
 *     }
 *   ],
 *   where: { "p.status": "aprovado" },
 *   where_raw: ["p.total > 100"],
 *   order_by: "p.data_pedido DESC"
 * });
 */
async function joinSelect(options) {
  const {
    project_id,
    id_instancia,
    base,
    joins = [],
    where = {},
    where_raw = [],
    group_by = "",
    having = "",
    order_by = "",
    limit = null,
    offset = null,
  } = options;

  if (!project_id || !id_instancia || !base?.table) {
    throw new Error("project_id, id_instancia e base.table são obrigatórios");
  }

  const payload = {
    project_id,
    id_instancia,
    base,
    joins,
    where,
    where_raw,
    group_by,
    having,
    order_by,
    limit,
    offset,
  };

  return requestToGo("/data/join-select", payload);
}

/* ====================================================
   INSERT - INSERÇÕES
==================================================== */

/**
 * INSERT único
 * @param {number} project_id - ID do projeto
 * @param {number} instance_id - ID da instância (CORRIGIDO)
 * @param {string} table - Nome da tabela
 * @param {object} data - Dados a inserir {coluna: valor}
 */
async function insert(project_id, instance_id, table, data) {
  if (!project_id) throw new Error("project_id é obrigatório");
  if (!instance_id) throw new Error("instance_id é obrigatório");
  if (!table) throw new Error("table é obrigatória");
  if (!data || Object.keys(data).length === 0) {
    throw new Error("data não pode ser vazio");
  }

  // Transforma {nome: "X", idade: 25} em [{name: "nome", value: "X"}, {name: "idade", value: 25}]
  const columns = Object.entries(data).map(([key, value]) => ({
    name: key,
    value,
  }));

  const payload = {
    project_id,
    id_instancia: instance_id,
    table,
    columns,
  };

  return requestToGo("/data/insert", payload);
}

/**
 * BATCH INSERT - Insere múltiplos registros de uma vez
 * @param {number} project_id - ID do projeto
 * @param {number} instance_id - ID da instância (CORRIGIDO)
 * @param {string} table - Nome da tabela
 * @param {array} data - Array de objetos a inserir
 */
async function batchInsert(project_id, instance_id, table, data) {
  if (!project_id) throw new Error("project_id é obrigatório");
  if (!instance_id) throw new Error("instance_id é obrigatória");
  if (!table) throw new Error("table é obrigatória");
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("data deve ser um array não vazio");
  }

  // Transforma cada objeto em array de {name, value}
  const rows = data.map((row) =>
    Object.entries(row).map(([key, value]) => ({
      name: key,
      value,
    }))
  );

  const payload = {
    project_id,
    id_instancia: instance_id,
    table,
    rows,
  };

  return requestToGo("/data/batch-insert", payload);
}

// ✅ Não esqueça de EXPORTAR as funções no final do arquivo!


/* ====================================================
   UPDATE - ATUALIZAÇÕES
==================================================== */

/**
 * UPDATE único - Atualiza registros
 * 
 * @param {number} project_id - ✅ OBRIGATÓRIO - ID do projeto
 * @param {number} id_instancia - ✅ OBRIGATÓRIO - ID da instância
 * @param {string} table - ✅ OBRIGATÓRIO - Nome da tabela
 * @param {Object} data - ✅ OBRIGATÓRIO - Dados a atualizar {coluna: valor}
 * @param {Object} [where={}] - ❌ OPCIONAL - Filtros WHERE {coluna: valor}
 * @param {string} [where_raw=null] - ❌ OPCIONAL - WHERE customizado
 * 
 * @returns {Promise<{success: boolean, message: string, count: number}>}
 * 
 * @example
 * // Atualizar por ID
 * await update(1, 10, "usuarios", 
 *   { status: "inativo", updated_at: new Date() },
 *   { id: 5 }
 * );
 * 
 * @example
 * // Atualizar com WHERE customizado
 * await update(1, 10, "usuarios",
 *   { status: "inativo" },
 *   {},
 *   "idade > 65 AND ativo = true"
 * );
 * // Retorna: { success: true, message: "Atualização concluída", count: 3 }
 */
async function update(
  project_id,
  id_instancia,
  table,
  data,
  where = {},
  where_raw = null
) {
  if (!project_id || !id_instancia || !table || !data) {
    throw new Error("project_id, id_instancia, table e data são obrigatórios");
  }

  const payload = {
    project_id,
    id_instancia,
    table,
    data,
    where: where || {},
    where_raw: where_raw || "",
  };

  return requestToGo("/data/update", payload);
}

/**
 * BATCH UPDATE - Atualiza múltiplos registros
 * 
 * @param {number} project_id - ✅ OBRIGATÓRIO - ID do projeto
 * @param {number} id_instancia - ✅ OBRIGATÓRIO - ID da instância
 * @param {string} table - ✅ OBRIGATÓRIO - Nome da tabela
 * @param {Object[]} updates - ✅ OBRIGATÓRIO - Array de {data, where}
 * @param {Object} updates[].data - Dados a atualizar
 * @param {Object} updates[].where - Condições WHERE
 * 
 * @returns {Promise<{success: boolean, message: string, count: number}>}
 * 
 * @example
 * await batchUpdate(1, 10, "pedidos", [
 *   { data: { status: "enviado" }, where: { id: 100 } },
 *   { data: { status: "entregue" }, where: { id: 101 } },
 *   { data: { status: "cancelado" }, where: { id: 102 } }
 * ]);
 * // Retorna: { success: true, message: "Atualizações concluídas", count: 3 }
 */
async function batchUpdate(project_id, id_instancia, table, updates) {
  if (!project_id || !id_instancia || !table || !Array.isArray(updates)) {
    throw new Error(
      "project_id, id_instancia, table e updates (array) são obrigatórios"
    );
  }

  const payload = {
    project_id,
    id_instancia,
    table,
    updates: updates || [],
  };

  return requestToGo("/data/batch-update", payload);
}

/* ====================================================
   DELETE - REMOÇÕES
==================================================== */

/**
 * DELETE - Remove registros (hard ou soft)
 * 
 * @param {number} project_id - ✅ OBRIGATÓRIO - ID do projeto
 * @param {number} id_instancia - ✅ OBRIGATÓRIO - ID da instância
 * @param {string} table - ✅ OBRIGATÓRIO - Nome da tabela
 * @param {Object} [where={}] - ❌ OPCIONAL - Filtros WHERE {coluna: valor}
 * @param {string} [where_raw=null] - ❌ OPCIONAL - WHERE customizado
 * @param {string} [mode="hard"] - ❌ OPCIONAL - Modo: "hard" ou "soft"
 * 
 * @returns {Promise<{success: boolean, message: string, mode: string, count: number}>}
 * 
 * Modos:
 * - "hard": Remove fisicamente do banco (DELETE)
 * - "soft": Marca como deletado (UPDATE deleted_at = NOW())
 * 
 * @example
 * // Hard delete (remoção física)
 * await deleteRecords(1, 10, "logs", { id: 100 }, null, "hard");
 * 
 * @example
 * // Soft delete (marca como deletado)
 * await deleteRecords(1, 10, "usuarios", 
 *   { email: "remover@example.com" }, 
 *   null, 
 *   "soft"
 * );
 * 
 * @example
 * // Delete com WHERE customizado
 * await deleteRecords(1, 10, "logs", 
 *   {}, 
 *   "created_at < '2025-01-01'", 
 *   "hard"
 * );
 * // Retorna: { success: true, message: "Delete concluído", mode: "hard", count: 5 }
 */
async function deleteRecords(
  project_id,
  id_instancia,
  table,
  where = {},
  where_raw = null,
  mode = "hard"
) {
  if (!project_id || !id_instancia || !table) {
    throw new Error("project_id, id_instancia e table são obrigatórios");
  }

  return requestToGo("/data/delete", {
    project_id,
    id_instancia,
    table,
    where,
    where_raw,
    mode,
  });
}

/* ====================================================
   AGGREGATE - AGREGAÇÕES
==================================================== */

/**
 * AGGREGATE - Executa operações de agregação
 * 
 * @param {number} project_id - ✅ OBRIGATÓRIO - ID do projeto
 * @param {number} id_instancia - ✅ OBRIGATÓRIO - ID da instância
 * @param {string} table - ✅ OBRIGATÓRIO - Nome da tabela
 * @param {string} operation - ✅ OBRIGATÓRIO - COUNT, SUM, AVG, MIN, MAX, EXISTS
 * @param {string} [column=null] - ❌ OPCIONAL - Coluna (obrigatória para SUM, AVG, MIN, MAX)
 * @param {Object} [where={}] - ❌ OPCIONAL - Filtros WHERE
 * 
 * @returns {Promise<{success: boolean, result: number|boolean}>}
 * 
 * Operações:
 * - COUNT: Conta registros (não precisa de column)
 * - SUM: Soma valores (precisa de column)
 * - AVG: Calcula média (precisa de column)
 * - MIN: Retorna valor mínimo (precisa de column)
 * - MAX: Retorna valor máximo (precisa de column)
 * - EXISTS: Verifica se existe algum registro (não precisa de column)
 * 
 * @example
 * // COUNT - Contar usuários ativos
 * await aggregate(1, 10, "usuarios", "COUNT", null, { status: "ativo" });
 * // Retorna: { success: true, result: 150 }
 * 
 * @example
 * // SUM - Somar total de pedidos pagos
 * await aggregate(1, 10, "pedidos", "SUM", "total", { status: "pago" });
 * // Retorna: { success: true, result: 15420.50 }
 * 
 * @example
 * // AVG - Média de avaliações
 * await aggregate(1, 10, "avaliacoes", "AVG", "nota");
 * // Retorna: { success: true, result: 4.5 }
 * 
 * @example
 * // MIN/MAX - Menor e maior preço
 * await aggregate(1, 10, "produtos", "MIN", "preco");
 * await aggregate(1, 10, "produtos", "MAX", "preco");
 * 
 * @example
 * // EXISTS - Verificar se email existe
 * await aggregate(1, 10, "usuarios", "EXISTS", null, 
 *   { email: "verificar@example.com" }
 * );
 * // Retorna: { success: true, result: true }
 */
async function aggregate(
  project_id,
  id_instancia,
  table,
  operation,
  column = null,
  where = {}
) {
  if (!project_id || !id_instancia || !table || !operation) {
    throw new Error(
      "project_id, id_instancia, table e operation são obrigatórios"
    );
  }

  return requestToGo("/data/aggregate", {
    project_id,
    id_instancia,
    table,
    operation,
    column,
    where,
  });
}

/* ====================================================
   EXPORTS
==================================================== */

export default {
  // SELECT
  advancedSelect,
  joinSelect,

  // INSERT
  insert,
  batchInsert,

  // UPDATE
  update,
  batchUpdate,

  // DELETE
  delete: deleteRecords,

  // AGGREGATE
  aggregate,
};
