// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();

router.post('/register', async (req, res, next) => {
    try {
        await AuthController.register(req, res);
    } catch (error) {
        next(error);
    }
});
router.post('/login', async (req, res, next) => {
    try {
        await AuthController.login(req, res);
    } catch (error) {
        next(error);
    }
});
router.post('/logout', async (req, res, next) => {
    try {
        await AuthController.logout(req, res);
    } catch (error) {
        next(error);
    }
});
router.get('/session-check', async (req, res, next) => {
    try {
        await AuthController.sessionCheck(req, res);
    } catch (error) {
        next(error);
    }
});
router.post('/authorize', async (req, res, next) => {
    try {
        await AuthController.authorize(req, res);
    } catch (error) {
        next(error);
    }
});
router.post('/verify-token', async (req, res, next) => {
    try {
        await AuthController.verifyToken(req, res);
    } catch (error) {
        next(error);
    }
});
router.post('/refresh-token', async (req, res, next) => {
    try {
        await AuthController.refreshToken(req, res);
    } catch (error) {
        next(error);
    }
});
export default router;
