// auth/auth.routes.js
import { Router } from 'express';
import * as authController from './auth.controller.js';
// 🔧 mesmo middleware que valida x-api-key nas outras rotas do distribuidor
// (ajustar o caminho se o mobile.routes.js importar de outro lugar)
import validateApiKey from '../middleware/validateApiKey.js';

const router = Router();

router.use(validateApiKey);

router.post('/register', authController.register);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-code', authController.resendCode);
router.post('/login', authController.login);
router.post('/google', authController.google);

export default router;
