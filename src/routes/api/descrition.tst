/**
 * ====================================================
 * API NODE - GO DATA ENGINE (SECUNDÁRIA / DISTRIBUIDOR)
 * ====================================================
 *
 * Esta API atua como distribuidor entre clientes/consumidores e o
 * serviço CORE (Go Data Engine). Ela encapsula todas as operações
 * de dados, valida a API Key e repassa os dados para o serviço Go.
 *
 * ====================================================
 * ROTAS DISPONÍVEIS / FUNCIONALIDADES
 * ====================================================
 *
 * 1️⃣ POST /insert
 *    - Inserção de registro único
 *    - Recebe: { project_id, id_instancia, table, data }
 *      * project_id: number (obrigatório)
 *      * id_instancia: number (obrigatório)
 *      * table: string (obrigatório)
 *      * data: object (obrigatório, dados do registro)
 *    - Envia para Go: mesma estrutura
 *    - Retorna: { success: boolean, message: string, data: object }

 * 2️⃣ POST /batch-insert
 *    - Inserção de múltiplos registros
 *    - Recebe: { project_id, id_instancia, table, data: Array<object> }
 *      * data: array de objetos, cada um representando um registro
 *    - Envia para Go: array de registros com id_instancia garantido
 *    - Retorna: { success: boolean, message: string, count: number }

 * 3️⃣ POST /get
 *    - Advanced Select: consultas complexas com filtros, joins, paginação
 *    - Recebe: {
 *        project_id, id_instancia, table, alias?, select?, joins?,
 *        where?, where_raw?, group_by?, having?, order_by?, limit?, offset?
 *      }
 *    - Envia para Go: mesma estrutura, valores opcionais preenchidos
 *    - Retorna: Array de registros [{...}], junto com count (quantidade)

 * 4️⃣ POST /update
 *    - Atualiza um registro específico
 *    - Recebe: { project_id, id_instancia, table, data, where?, where_raw? }
 *    - Envia para Go: mesma estrutura
 *    - Retorna: { success: boolean, message: string, count: number }

 * 5️⃣ POST /batch-update
 *    - Atualiza múltiplos registros
 *    - Recebe: { project_id, id_instancia, table, updates: Array<{data, where}> }
 *    - Envia para Go: mesma estrutura
 *    - Retorna: { success: boolean, message: string, count: number }

 * 6️⃣ POST /delete
 *    - Remove registros (hard ou soft delete)
 *    - Recebe: { project_id, id_instancia, table, where?, where_raw?, mode? }
 *      * mode: "hard" ou "soft" (padrão: "hard")
 *    - Envia para Go: mesma estrutura
 *    - Retorna: { success: boolean, message: string, mode: string, count: number }

 * 7️⃣ POST /aggregate
 *    - Operações de agregação (COUNT, SUM, AVG, MIN, MAX, EXISTS)
 *    - Recebe: { project_id, id_instancia, table, operation, column?, where? }
 *    - Envia para Go: mesma estrutura
 *    - Retorna: { success: boolean, result: number|boolean }

 * ====================================================
 * SEGURANÇA / MIDDLEWARE
 * ====================================================
 * - Validação de API Key via header `x-api-key`
 * - Todas as rotas exigem chave válida
 * - Resposta 401 se chave inválida ou ausente:
 *   { success: false, message: "Chave de API inválida ou ausente" }

 * ====================================================
 * OBSERVAÇÕES GERAIS
 * ====================================================
 * - Todos os payloads enviados para o Go são validados e complementados
 *   com valores padrão para evitar erros.
 * - Erros internos retornam status 500 com mensagem detalhada
 *   e campo `error` descrevendo o problema.
 * - Consultas (SELECT / JOIN) podem usar filtros simples ou raw SQL.
 * - Inserts, Updates e Deletes seguem isolamento por projeto e instância.
 */
