/**
 * ====================================================
 * SERVIÇO DE SCHEMA MANAGEMENT - GO
 * ====================================================
 * 
 * Gerencia a estrutura do banco de dados:
 * - Tabelas
 * - Colunas
 * - Índices
 * 
 * TABELAS:
 * - POST /schema/table - Criar tabela
 * - GET /schema/tables - Listar tabelas
 * - GET /schema/table/details - Detalhes da tabela
 * - DELETE /schema/table - Deletar tabela
 * 
 * COLUNAS:
 * - POST /schema/column - Adicionar coluna
 * - PUT /schema/column - Modificar coluna
 * - DELETE /schema/column - Remover coluna
 * 
 * ÍNDICES:
 * - POST /schema/index - Adicionar índice
 * - DELETE /schema/index - Remover índice
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const GO_API_URL = process.env.GO_API_URL || "http://localhost:8080";
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;

/**
 * Headers padrão
 */
function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Internal-Token": INTERNAL_TOKEN,
  };
}

/**
 * Instância configurada
 */
const axiosInstance = axios.create({
  baseURL: GO_API_URL,
  headers: getHeaders(),
});

/* ====================================================
   TABELAS
==================================================== */

/**
 * Criar uma nova tabela
 * 
 * IMPORTANTE: Todas as tabelas recebem automaticamente:
 * - id (BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
 * - id_instancia (BIGINT UNSIGNED NOT NULL + FOREIGN KEY)
 * 
 * @param {string} projectCode - Código do projeto
 * @param {Object} tableData - Dados da tabela
 * @param {number} tableData.project_id - ID do projeto
 * @param {string} tableData.table_name - Nome da tabela (sem prefixo)
 * @param {Array} tableData.columns - Array de colunas
 * @param {Array} [tableData.indexes] - Array de índices (opcional)
 * 
 * @example
 * createTable("barbearia_joao", {
 *   project_id: 1,
 *   table_name: "agendamentos",
 *   columns: [
 *     {
 *       name: "cliente_nome",
 *       type: "VARCHAR(255)",
 *       nullable: false,
 *       unique: false
 *     },
 *     {
 *       name: "data_agendamento",
 *       type: "DATETIME",
 *       nullable: false,
 *       unique: false
 *     },
 *     {
 *       name: "servico",
 *       type: "VARCHAR(100)",
 *       nullable: false,
 *       unique: false
 *     },
 *     {
 *       name: "valor",
 *       type: "DECIMAL(10,2)",
 *       nullable: false,
 *       unique: false
 *     }
 *   ],
 *   indexes: [
 *     {
 *       name: "idx_data",
 *       columns: ["data_agendamento"],
 *       type: "INDEX"
 *     }
 *   ]
 * })
 * 
 * @returns {Promise<{message: string, table: string}>}
 */
async function createTable(projectCode, tableData) {
  try {
    const response = await axiosInstance.post(
      "/schema/table",
      tableData,
      {
        params: { project_code: projectCode }
      }
    );
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao criar tabela:", err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao criar tabela");
  }
}

/**
 * Listar todas as tabelas de um projeto
 * 
 * @param {string} projectCode - Código do projeto
 * 
 * @example
 * const tabelas = await listTables("barbearia_joao");
 * // Retorna: ["agendamentos", "clientes", "servicos", "produtos"]
 * 
 * @returns {Promise<Array<string>>} Array com nomes das tabelas (sem prefixo)
 */
async function listTables(projectCode) {
  try {
    const response = await axiosInstance.get("/schema/tables", {
      params: { project_code: projectCode }
    });
    
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("❌ Erro ao listar tabelas:", err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao listar tabelas");
  }
}

/**
 * Obter detalhes completos de uma tabela
 * 
 * @param {string} projectCode - Código do projeto
 * @param {string} tableName - Nome da tabela (sem prefixo)
 * 
 * @example
 * const detalhes = await getTableDetails("barbearia_joao", "agendamentos");
 * // Retorna estrutura completa: colunas, tipos, índices, etc.
 * 
 * @returns {Promise<{name: string, columns: Array, indexes: Array}>}
 */
async function getTableDetails(projectCode, tableName) {
  try {
    const response = await axiosInstance.get("/schema/table/details", {
      params: {
        project_code: projectCode,
        table: tableName
      }
    });
    
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao buscar detalhes da tabela:", err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao buscar detalhes");
  }
}

/**
 * Deletar uma tabela
 * 
 * ⚠️ ATENÇÃO: Remove a tabela e todos os seus dados permanentemente
 * 
 * @param {string} projectCode - Código do projeto
 * @param {string} tableName - Nome da tabela (sem prefixo)
 * 
 * @example
 * deleteTable("barbearia_joao", "agendamentos")
 * 
 * @returns {Promise<string>} Mensagem de confirmação
 */
async function deleteTable(projectCode, tableName) {
  try {
    const response = await axiosInstance.delete("/schema/table", {
      params: {
        project_code: projectCode,
        table: tableName
      }
    });
    
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao deletar tabela:", err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao deletar tabela");
  }
}

/* ====================================================
   COLUNAS
==================================================== */

/**
 * Adicionar uma coluna à tabela
 * 
 * @param {string} projectCode - Código do projeto
 * @param {string} tableName - Nome da tabela (sem prefixo)
 * @param {Object} columnData - Dados da coluna
 * @param {string} columnData.name - Nome da coluna
 * @param {string} columnData.type - Tipo SQL (VARCHAR(255), INT, DATETIME, etc)
 * @param {boolean} [columnData.nullable=true] - Aceita NULL
 * @param {boolean} [columnData.unique=false] - Valor único
 * 
 * @example
 * addColumn("barbearia_joao", "agendamentos", {
 *   name: "observacoes",
 *   type: "TEXT",
 *   nullable: true,
 *   unique: false
 * })
 * 
 * @returns {Promise<string>} Mensagem de confirmação
 */
async function addColumn(projectCode, tableName, columnData) {
  try {
    const response = await axiosInstance.post(
      "/schema/column",
      columnData,
      {
        params: {
          project_code: projectCode,
          table: tableName
        }
      }
    );
    
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao adicionar coluna:", err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao adicionar coluna");
  }
}

/**
 * Modificar uma coluna existente
 * 
 * @param {string} projectCode - Código do projeto
 * @param {string} tableName - Nome da tabela (sem prefixo)
 * @param {Object} columnData - Dados da coluna
 * @param {string} columnData.name - Nome da coluna
 * @param {string} columnData.type - Novo tipo SQL
 * @param {boolean} [columnData.nullable] - Aceita NULL
 * 
 * @example
 * modifyColumn("barbearia_joao", "agendamentos", {
 *   name: "cliente_nome",
 *   type: "VARCHAR(300)",
 *   nullable: false
 * })
 * 
 * @returns {Promise<string>} Mensagem de confirmação
 */
async function modifyColumn(projectCode, tableName, columnData) {
  try {
    const response = await axiosInstance.put(
      "/schema/column",
      columnData,
      {
        params: {
          project_code: projectCode,
          table: tableName
        }
      }
    );
    
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao modificar coluna:", err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao modificar coluna");
  }
}

/**
 * Remover uma coluna
 * 
 * ⚠️ ATENÇÃO: Remove a coluna e todos os seus dados permanentemente
 * 
 * @param {string} projectCode - Código do projeto
 * @param {string} tableName - Nome da tabela (sem prefixo)
 * @param {string} columnName - Nome da coluna
 * 
 * @example
 * dropColumn("barbearia_joao", "agendamentos", "observacoes")
 * 
 * @returns {Promise<string>} Mensagem de confirmação
 */
async function dropColumn(projectCode, tableName, columnName) {
  try {
    const response = await axiosInstance.delete("/schema/column", {
      params: {
        project_code: projectCode,
        table: tableName,
        column: columnName
      }
    });
    
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao remover coluna:", err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao remover coluna");
  }
}

/* ====================================================
   ÍNDICES
==================================================== */

/**
 * Adicionar um índice
 * 
 * @param {string} projectCode - Código do projeto
 * @param {string} tableName - Nome da tabela (sem prefixo)
 * @param {Object} indexData - Dados do índice
 * @param {string} indexData.name - Nome do índice
 * @param {Array<string>} indexData.columns - Colunas do índice
 * @param {string} [indexData.type="INDEX"] - "INDEX" ou "UNIQUE"
 * 
 * @example
 * // Índice simples
 * addIndex("barbearia_joao", "agendamentos", {
 *   name: "idx_data",
 *   columns: ["data_agendamento"],
 *   type: "INDEX"
 * })
 * 
 * @example
 * // Índice composto
 * addIndex("barbearia_joao", "agendamentos", {
 *   name: "idx_cliente_data",
 *   columns: ["cliente_nome", "data_agendamento"],
 *   type: "INDEX"
 * })
 * 
 * @example
 * // Índice único
 * addIndex("barbearia_joao", "usuarios", {
 *   name: "idx_email_unique",
 *   columns: ["email"],
 *   type: "UNIQUE"
 * })
 * 
 * @returns {Promise<string>} Mensagem de confirmação
 */
async function addIndex(projectCode, tableName, indexData) {
  try {
    const response = await axiosInstance.post(
      "/schema/index",
      indexData,
      {
        params: {
          project_code: projectCode,
          table: tableName
        }
      }
    );
    
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao adicionar índice:", err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao adicionar índice");
  }
}

/**
 * Remover um índice
 * 
 * @param {string} projectCode - Código do projeto
 * @param {string} tableName - Nome da tabela (sem prefixo)
 * @param {string} indexName - Nome do índice
 * 
 * @example
 * dropIndex("barbearia_joao", "agendamentos", "idx_cliente_data")
 * 
 * @returns {Promise<string>} Mensagem de confirmação
 */
async function dropIndex(projectCode, tableName, indexName) {
  try {
    const response = await axiosInstance.delete("/schema/index", {
      params: {
        project_code: projectCode,
        table: tableName,
        index: indexName
      }
    });
    
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao remover índice:", err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao remover índice");
  }
}

/* ====================================================
   EXPORTS
==================================================== */

export default {
  // Tabelas
  createTable,
  listTables,
  getTableDetails,
  deleteTable,

  // Colunas
  addColumn,
  modifyColumn,
  dropColumn,

  // Índices
  addIndex,
  dropIndex,
};