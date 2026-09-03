
// routes/app/app.routes.js
import express from 'express';
import goDataEngine from '../../../services/goDataEngine.service.js';

const router = express.Router();

// ============================================================================
// SALÕES PRÓXIMOS — pública, sem cliente logado, sem id_instancia fixo
// ============================================================================
router.post('/saloes-proximos', async (req, res) => {
    try {
        const { latitude, longitude, raio_km } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'latitude e longitude são obrigatórios' });
        }

        const raw = `
            (6371 * acos(
                cos(radians(${Number(latitude)})) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(${Number(longitude)})) +
                sin(radians(${Number(latitude)})) * sin(radians(latitude))
            )) AS distancia_km
        `;

        const result = await goDataEngine.advancedSelect({
            project_id: 1,
            table: 'instancias_projetion',
            select: ['id', 'name', 'cidade', 'estado', 'logo_url', 'whatsapp', 'latitude', 'longitude', raw],
            where: { status: 'active' },
            having: raio_km ? `distancia_km < ${Number(raio_km)}` : null,
            order_by: 'distancia_km ASC',
            limit: 20
        });

        return res.json({ success: true, data: result.data || [] });

    } catch (error) {
        console.error('Erro ao buscar salões próximos:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar salões' });
    }
});

// ============================================================================
// SALÕES POR CIDADE — plano B, sem geolocalização
// ============================================================================
router.post('/saloes-por-cidade', async (req, res) => {
    try {
        const { cidade } = req.body;

        if (!cidade) {
            return res.status(400).json({ success: false, message: 'cidade é obrigatória' });
        }

        const result = await goDataEngine.advancedSelect({
            project_id: 1,
            table: 'instancias_projetion',
            select: ['id', 'name', 'cidade', 'estado', 'logo_url', 'whatsapp', 'latitude', 'longitude'],
            where_raw: `cidade LIKE '%${cidade}%' AND status = 'active'`,
            order_by: 'name ASC',
            limit: 20
        });

        // sem lat/long do cliente, não dá pra calcular distância — mantém o
        // formato Salao[] esperado pelo app, com distancia_km zerada
        const data = (result.data || []).map(s => ({ ...s, distancia_km: 0 }));

        return res.json({ success: true, data });

    } catch (error) {
        console.error('Erro ao buscar salões por cidade:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar salões' });
    }
});

export default router;





// import express from 'express';

// import goDataEngine from '../../../services/goDataEngine.service.js';

// const router = express.Router();


// // routes/app/app.routes.js




// router.post('/saloes-proximos', async (req, res) => {
//     try {
//         const { latitude, longitude, raio_km } = req.body;

//         if (!latitude || !longitude) {
//             return res.status(400).json({ success: false, message: 'latitude e longitude são obrigatórios' });
//         }

//         // fórmula de Haversine — calcula distância em km direto no SQL
//         const raw = `
//             (6371 * acos(
//                 cos(radians(?)) * cos(radians(latitude)) *
//                 cos(radians(longitude) - radians(?)) +
//                 sin(radians(?)) * sin(radians(latitude))
//             )) AS distancia_km
//         `;

//         const result = await goDataEngine.advancedSelect({
//             project_id: 1, // salão de beleza
//             table: 'instancias_projetion',
//             select: ['id', 'name', 'cidade', 'estado', 'logo_url', 'whatsapp', 'latitude', 'longitude', raw],
//             where: { status: 'active' },
//             having: raio_km ? `distancia_km < ${Number(raio_km)}` : null,
//             order_by: 'distancia_km ASC',
//             limit: 20
//         });

//         return res.json({ success: true, data: result.data });

//     } catch (error) {
//         console.error('Erro ao buscar salões próximos:', error);
//         return res.status(500).json({ success: false, message: 'Erro ao buscar salões' });
//     }
// });


// export default router;