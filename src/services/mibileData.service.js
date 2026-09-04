// services/mobileData.service.js

const axios = require('axios');
require('dotenv').config();

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const GO_API_URL =
    process.env.GO_API_URL ||
    'http://localhost:3000';

const INTERNAL_TOKEN =
    process.env.INTERNAL_TOKEN;

const PROJECT_ID =
    Number(process.env.PROJECT_ID) || 1;

const INSTANCE_ID =
    Number(process.env.ID_INSTANCIA) || 1;


// ============================================================
// HEADERS
// ============================================================

function getHeaders() {

    return {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_TOKEN
    };

}


// ============================================================
// REQUEST
// ============================================================

async function requestToGo(endpoint, payload) {

    try {

        const response = await axios.post(
            `${GO_API_URL}${endpoint}`,
            payload,
            {
                headers: getHeaders(),
                timeout: 30000
            }
        );

        return response.data;

    } catch (err) {

        console.error(
            `❌ Erro Data Engine ${endpoint}:`,
            err.response?.data ||
            err.message
        );

        throw err;
    }

}


// ============================================================
// GET / SELECT
// ============================================================

async function get({

    table,
    alias = '',
    select = [],
    joins = [],
    where = {},
    where_raw = '',
    group_by = '',
    having = '',
    order_by = '',
    limit = 0,
    offset = 0

}) {

    const result = await requestToGo(
        '/data/select',
        {

            project_id:
                PROJECT_ID,

            id_instancia:
                INSTANCE_ID,

            table,

            alias,

            select:
                Array.isArray(select)
                    ? select
                    : [],

            joins:
                Array.isArray(joins)
                    ? joins
                    : [],

            where:
                where || {},

            where_raw:
                where_raw || '',

            group_by:
                group_by || '',

            having:
                having || '',

            order_by:
                order_by || '',

            limit:
                limit || 0,

            offset:
                offset || 0
        }
    );


    // O Data Engine retorna:
    //
    // {
    //   success: true,
    //   data: [...]
    // }

    if (
        result &&
        Array.isArray(result.data)
    ) {

        return result.data;

    }

    return [];

}


// ============================================================
// INSERT
// ============================================================

async function insert({
    table,
    data
}) {

    if (
        !data ||
        Object.keys(data).length === 0
    ) {

        throw new Error(
            "insert requer 'data'"
        );

    }


    const result = await requestToGo(
        '/data/insert',
        {

            project_id:
                PROJECT_ID,

            id_instancia:
                INSTANCE_ID,

            table,

            columns:
                Object.entries(data)
                    .map(
                        ([name, value]) => ({
                            name,
                            value
                        })
                    )
        }
    );


    return result;

}


// ============================================================
// UPDATE
// ============================================================

async function update({
    table,
    data,
    where = {},
    where_raw = ''
}) {

    if (
        !data ||
        Object.keys(data).length === 0
    ) {

        throw new Error(
            "update requer 'data'"
        );

    }


    return requestToGo(
        '/data/update',
        {

            project_id:
                PROJECT_ID,

            id_instancia:
                INSTANCE_ID,

            table,

            data,

            where:
                where || {},

            where_raw:
                where_raw || ''
        }
    );

}


// ============================================================
// DELETE
// ============================================================

async function remove({
    table,
    where = {},
    where_raw = '',
    mode = 'hard'
}) {

    return requestToGo(
        '/data/delete',
        {

            project_id:
                PROJECT_ID,

            id_instancia:
                INSTANCE_ID,

            table,

            where:
                where || {},

            where_raw:
                where_raw || '',

            mode
        }
    );

}


// ============================================================
// BATCH INSERT
// ============================================================

async function batchInsert({
    table,
    data
}) {

    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        throw new Error(
            "batchInsert requer 'data' como array"
        );

    }


    const rows =
        data.map(row =>
            Object.entries(row)
                .map(
                    ([name, value]) => ({
                        name,
                        value
                    })
                )
        );


    return requestToGo(
        '/data/batch-insert',
        {

            project_id:
                PROJECT_ID,

            id_instancia:
                INSTANCE_ID,

            table,

            rows
        }
    );

}


// ============================================================
// BATCH UPDATE
// ============================================================

async function batchUpdate({
    table,
    updates
}) {

    if (
        !Array.isArray(updates)
    ) {

        throw new Error(
            "batchUpdate requer 'updates'"
        );

    }


    return requestToGo(
        '/data/batch-update',
        {

            project_id:
                PROJECT_ID,

            id_instancia:
                INSTANCE_ID,

            table,

            updates
        }
    );

}


// ============================================================
// AGGREGATE
// ============================================================

async function aggregate({
    table,
    operation,
    column = null,
    where = {}
}) {

    if (!operation) {

        throw new Error(
            "aggregate requer 'operation'"
        );

    }


    return requestToGo(
        '/data/aggregate',
        {

            project_id:
                PROJECT_ID,

            id_instancia:
                INSTANCE_ID,

            table,

            operation,

            column,

            where:
                where || {}
        }
    );

}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    get,
    insert,
    update,
    remove,
    batchInsert,
    batchUpdate,
    aggregate,

    PROJECT_ID,
    INSTANCE_ID

};