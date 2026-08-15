// src/config/goClient.js

import axios from 'axios';
import dotenv from 'dotenv';

// Carregue as variáveis de ambiente do arquivo .env
dotenv.config();

/*
====================================================
GO SERVICE - Comunicação com o Go
====================================================
Este arquivo contém os métodos para interagir com o serviço Go.
Aqui centralizamos as funções de CRUD (Create, Read, Update, Delete)
para tabelas e outros recursos no Go.
====================================================
*/

// Instância base do axios para o Go
const goClient = axios.create({
    baseURL: process.env.GO_API_URL || "http://127.0.0.1:8080",  // A URL agora depende de GO_API_URL
    timeout: 50000,  // Timeout para as requisições
    headers: {
      "X-Internal-Token": process.env.INTERNAL_TOKEN,  // Token de autenticação do Go
      "Content-Type": "application/json"
    }
  });

/**
 * Função para fazer requisições para o Go.
 * @param {string} url - A URL para o endpoint no Go.
 * @param {string} method - O método HTTP (GET, POST, PUT, DELETE).
 * @param {string} apiKey - Chave de API para autenticação.
 * @param {object} data - Dados enviados na requisição.
 */
async function goRequest({ url, method = 'POST', apiKey, data }) {
  try {
    const response = await goClient.request({
      url,
      method,
      data,
      headers: {
        api_key: apiKey
      }
    });
    return response.data;
  } catch (err) {
    // Erro vindo do Go
    if (err.response) {
      return {
        status: 'error',
        message: err.response.data || 'Erro no Go'
      };
    }
    // Erro de conexão
    return {
      status: 'error',
      message: 'Não foi possível conectar ao Go'
    };
  }
}

/*
====================================================
CRUD GENÉRICO (ROTAS SIMPLES)
====================================================
*/

// Inserir dados em uma tabela
export function insert(apiKey, table, data) {
  return goRequest({
    url: '/insert',
    apiKey,
    data: {
      table,
      data
    }
  });
}

// Obter todos os registros de uma tabela
export function getAll(apiKey, table) {
  return goRequest({
    url: '/get',
    apiKey,
    data: {
      table
    }
  });
}

// Atualizar registros de uma tabela
export function update(apiKey, table, data, query) {
  return goRequest({
    url: '/update',
    apiKey,
    data: {
      table,
      data,
      query
    }
  });
}

// Deletar registros de uma tabela
export function remove(apiKey, table, query) {
  return goRequest({
    url: '/delete',
    apiKey,
    data: {
      table,
      query
    }
  });
}

/*
====================================================
FUNÇÃO UNIVERSAL PARA EXECUTAR SQL RAW
====================================================
*/
// Função para executar comandos SQL diretamente no Go (como ALTER TABLE)
export function universal(apiKey, payload) {
  return goRequest({
    url: '/universal',
    apiKey,
    data: payload
  });
}

/*
====================================================
PROJETOS (MASTER DB)
====================================================
*/

// Listar todos os projetos
export function listProjects() {
  return goClient.get('/projects').then(r => r.data);
}

// Criar um novo projeto
export function createProject(data) {
  return goClient.post('/projects', data).then(r => r.data);
}

// Atualizar um projeto
export function updateProject(id, data) {
  return goClient.put(`/projects/${id}`, data).then(r => r.data);
}

// Deletar um projeto
export function deleteProject(id) {
  return goClient.delete(`/projects/${id}`).then(r => r.data);
}

/*
====================================================
TABELAS
====================================================
*/

// Criar uma tabela
export function createTable(projectId, data) {
  return goClient.post(`/projects/${projectId}/tables`, data).then(r => r.data);
}

// Deletar uma tabela
export function deleteTable(projectId, table) {
  return goClient.delete(`/projects/${projectId}/tables/${table}`).then(r => r.data);
}

