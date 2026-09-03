import express from 'express';

import authRouter from './auth.routes.js';
import professionalsRouter from './professionals.routes.js';
import servicesRouter from './services.routes.js';
import commentsRouter from './comments.routes.js';
import siteTextsRouter from './site-texts.routes.js';
import professionalScheduleRouter from './professional-schedule.routes.js';
import blocksRouter from './blocks.routes.js';
import horariosRouter from './horarios.routes.js';
import adminsRouter from './admins.routes.js';
import dashboardRouter from './dashboard.routes.js';
import professionalAppRouter from './professional-app.routes.js'; // 🔧 novo
import salarioRoutes from './salario.routes.js'; // 🔧 novo

const router = express.Router();

router.use(authRouter);
router.use(professionalsRouter);
router.use(servicesRouter);
router.use(commentsRouter);
router.use(siteTextsRouter);
router.use(professionalScheduleRouter);
router.use(blocksRouter);
router.use(horariosRouter);
router.use(adminsRouter);
router.use(dashboardRouter);
router.use(professionalAppRouter); // 🔧 novo
router.use(salarioRoutes); // 🔧 novo

export default router;