/**
 * ====================================================
 * SERVIÇO DE PROJETOS E INSTÂNCIAS - GO
 * ====================================================
 * 
 * Gerencia projetos e suas instâncias no sistema Go.
 * 
 * PROJETOS:
 * - GET /projects - Listar todos
 * - POST /projects - Criar novo
 * - PUT /projects/{id} - Atualizar
 * - DELETE /projects/{id} - Deletar
 * 
 * INSTÂNCIAS:
 * - GET /instances - Listar todas (ou filtrar por project_id)
 * - POST /instances - Criar nova
 * - PUT /instances/{id} - Atualizar
 * - DELETE /instances/{id} - Deletar
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
 * Instância configurada do axios
 */
const axiosInstance = axios.create({
  baseURL: GO_API_URL,
  headers: getHeaders(),
});


/* ====================================================
   BUILDERS (NORMALIZA PAYLOADS VINDOS DO CONTROLLER)
==================================================== */

/**
 * Preenche um objeto base com valores válidos
 */
function buildPayload(base, input = {}) {
  const payload = { ...base };

  for (const key of Object.keys(base)) {
    const value = input[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      payload[key] = value;
    }
  }

  return payload;
}

/**
 * Builder de Projeto
 */
function buildProjectPayload(data = {}) {
  const base = {
    name: "",
    code: "",
    description: "",
    api_key: "",
    type: "",
    version: "1.0.0",
    status: "active"
  };

  return buildPayload(base, data);
}

/**
 * Builder de Instância
 */
function buildInstancePayload(data = {}) {
  const base = {
    project_id: null,        // obrigatório
    client_name: "",         // obrigatório
    email: "",               // obrigatório
    phone: "",
    price: 0,
    payment_day: null,
    name: "",                // obrigatório
    code: "",                // obrigatório
    description: "",
    status: "active",
    settings: {}
  };

  return buildPayload(base, data);
}



/* ====================================================
   PROJETOS
==================================================== */

/**
 * Listar todos os projetos
 * 
 * @example
 * const projetos = await listProjects();
 * // Retorna array de projetos
 * 
 * @returns {Promise<Array>} Array de projetos
 */
async function listProjects() {
  try {
    const response = await axiosInstance.get("/projects");
    
    // Se o Go retornar objeto com data, extrai o array
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    // Se vier dentro de um objeto wrapper
    if (response.data && response.data.data) {
      return response.data.data;
    }
    
    return [];
  } catch (err) {
    console.error("❌ Erro ao listar projetos:", err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao listar projetos");
  }
}




/**
 * Criar um novo projeto
 * 
 * @param {Object} projectData - Dados do projeto
 * @param {string} projectData.name - Nome do projeto
 * @param {string} projectData.code - Código único (usado como prefixo de tabelas)
 * @param {string} projectData.api_key - API Key única
 * @param {string} projectData.type - Tipo do projeto
 * @param {string} [projectData.version="1.0.0"] - Versão
 * @param {string} [projectData.status="active"] - Status (active, inactive, blocked)
 * 
 * @example
 * createProject({
 *   name: "Barbearia João",
 *   code: "barbearia_joao",
 *   api_key: "key_unique_12345",
 *   type: "barbearia",
 *   version: "1.0.0",
 *   status: "active"
 * })
 * 
 * @returns {Promise<{message: string}>}
 */
async function createProject(projectData) {
  try {
    const payload = buildProjectPayload(projectData);
    const response = await axiosInstance.post("/projects", payload);
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao criar projeto:", err.response?.data || err.message);
    throw err;
  }
}


/**
 * Atualizar um projeto existente
 * 
 * @param {number} id - ID do projeto
 * @param {Object} projectData - Dados a atualizar
 * @param {string} [projectData.name] - Nome
 * @param {string} [projectData.code] - Código
 * @param {string} [projectData.type] - Tipo
 * @param {string} [projectData.version] - Versão
 * @param {string} [projectData.status] - Status
 * 
 * @example
 * updateProject(1, {
 *   name: "Barbearia João Atualizada",
 *   version: "1.1.0",
 *   status: "active"
 * })
 * 
 * @returns {Promise<string>} Mensagem de confirmação
 */
async function updateProject(id, projectData) {
  try {
    // Busca projetos e pega o atual
    const projects = await listProjects();
    const current = projects.find(p => p.id == id);

    if (!current) {
      throw new Error("Projeto não encontrado para atualização");
    }

    const payload = buildProjectPayload({
      ...current,
      ...projectData
    });

    const response = await axiosInstance.put(`/projects/${id}`, payload);
    return response.data;
  } catch (err) {
    console.error(`❌ Erro ao atualizar projeto ${id}:`, err.response?.data || err.message);
    throw err;
  }
}

/**
 * Deletar um projeto
 * 
 * ⚠️ ATENÇÃO: Deleta em cascata todas as instâncias e dados relacionados
 * 
 * @param {number} id - ID do projeto
 * 
 * @example
 * deleteProject(1)
 * 
 * @returns {Promise<string>} Mensagem de confirmação
 */
async function deleteProject(id) {
  try {
    const response = await axiosInstance.delete(`/projects/${id}`);
    return response.data;
  } catch (err) {
    console.error(`❌ Erro ao deletar projeto ${id}:`, err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao deletar projeto");
  }
}

/* ====================================================
   INSTÂNCIAS
==================================================== */

/**
 * Listar instâncias
 * 
 * @param {number} [projectId] - Filtrar por projeto (opcional)
 * 
 * @example
 * // Listar todas
 * const todasInstancias = await listInstances();
 * 
 * @example
 * // Filtrar por projeto
 * const instanciasDoProjeto = await listInstances(1);
 * 
 * @returns {Promise<Array>} Array de instâncias
 */
async function listInstances(projectId = null) {
  try {
    const params = projectId ? { project_id: projectId } : {};
    const response = await axiosInstance.get("/instances", { params });
    
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    if (response.data && response.data.data) {
      return response.data.data;
    }
    
    return [];
  } catch (err) {
    console.error("❌ Erro ao listar instâncias:", err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao listar instâncias");
  }
}

/**
 * Criar uma nova instância
 * 
 * @param {Object} instanceData - Dados da instância
 * @param {number} instanceData.project_id - ID do projeto (obrigatório)
 * @param {string} instanceData.client_name - Nome do cliente (obrigatório)
 * @param {string} instanceData.email - Email (obrigatório)
 * @param {string} instanceData.phone - Telefone
 * @param {number} instanceData.price - Preço
 * @param {number} instanceData.payment_day - Dia de pagamento (1-28)
 * @param {string} instanceData.name - Nome da instância (obrigatório)
 * @param {string} instanceData.code - Código único no projeto (obrigatório)
 * @param {string} [instanceData.description] - Descrição
 * @param {string} [instanceData.status="active"] - Status
 * @param {Object} [instanceData.settings] - Configurações JSON
 * 
 * @example
 * createInstance({
 *   project_id: 1,
 *   client_name: "João Silva",
 *   email: "joao@example.com",
 *   phone: "(11) 98765-4321",
 *   price: 299.90,
 *   payment_day: 10,
 *   name: "Unidade Centro",
 *   code: "centro",
 *   description: "Unidade localizada no centro",
 *   status: "active",
 *   settings: {
 *     horario_abertura: "08:00",
 *     horario_fechamento: "18:00"
 *   }
 * })
 * 
 * @returns {Promise<string>} Mensagem de confirmação
 */
async function createInstance(instanceData) {
  try {
    const payload = buildInstancePayload(instanceData);
    const response = await axiosInstance.post("/instances", payload);
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao criar instância:", err.response?.data || err.message);
    throw err;
  }
}


/**
 * Atualizar uma instância
 * 
 * @param {number} id - ID da instância
 * @param {Object} instanceData - Dados a atualizar (mesma estrutura do create)
 * 
 * @example
 * updateInstance(1, {
 *   project_id: 1,
 *   client_name: "João Silva",
 *   email: "joao.novo@example.com",
 *   phone: "(11) 98765-4321",
 *   price: 349.90,
 *   payment_day: 15,
 *   name: "Unidade Centro Atualizada",
 *   code: "centro",
 *   status: "active"
 * })
 * 
 * @returns {Promise<string>} Mensagem de confirmação
 */
async function updateInstance(id, instanceData) {
  try {
    // Busca instâncias do projeto
    if (!instanceData.project_id) {
      throw new Error("project_id é obrigatório para update de instância");
    }

    const instances = await listInstances(instanceData.project_id);
    const current = instances.find(i => i.id == id);

    if (!current) {
      throw new Error("Instância não encontrada");
    }

    const payload = buildInstancePayload({
      ...current,
      ...instanceData
    });

    const response = await axiosInstance.put(`/instances/${id}`, payload);
    return response.data;
  } catch (err) {
    console.error(`❌ Erro ao atualizar instância ${id}:`, err.response?.data || err.message);
    throw err;
  }
}


/**
 * Deletar uma instância
 * 
 * @param {number} id - ID da instância
 * 
 * @example
 * deleteInstance(1)
 * 
 * @returns {Promise<string>} Mensagem de confirmação
 */
async function deleteInstance(id) {
  try {
    const response = await axiosInstance.delete(`/instances/${id}`);
    return response.data;
  } catch (err) {
    console.error(`❌ Erro ao deletar instância ${id}:`, err.response?.data || err.message);
    throw new Error(err.response?.data || "Erro ao deletar instância");
  }
}

/* ====================================================
   EXPORTS
==================================================== */

export default {
  // Projetos
  listProjects,
  createProject,
  updateProject,
  deleteProject,

  // Instâncias
  listInstances,
  createInstance,
  updateInstance,
  deleteInstance,
};