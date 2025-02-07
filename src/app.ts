// src/app.ts
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import permissionRoutes from './routes/permission.routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';


const app = express();
app.use(express.json());
app.use(cookieParser());

// health check
app.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ok' });
});

// Swagger UI 라우트
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// main routes
app.use('/auth', authRoutes);
app.use('/permission', permissionRoutes);

export default app;
