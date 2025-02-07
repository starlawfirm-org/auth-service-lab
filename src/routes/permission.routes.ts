// src/routes/permission.routes.ts
import { Router } from 'express';
import { PermissionController } from '../controllers/PermissionController';

const router = Router();

router.post('/grant', async (req, res, next) => {
    try {
        await PermissionController.grantPermission(req, res);
    } catch (error) {
        next(error);
    }
});

export default router;
