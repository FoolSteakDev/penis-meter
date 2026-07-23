import cors from 'cors';
import express, { Router, type Express, type NextFunction, type Request, type Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { ValidateError } from 'tsoa';
import { ApiError } from './api/api-error';
import { RegisterRoutes } from './api/generated/routes';
import swaggerDocument from './api/generated/swagger.json';
import { envConfig } from './config/env.config';

export function createApp(): Express {
  const app = express();

  const corsOrigin = envConfig.adminCorsOrigins.includes('*') ? '*' : envConfig.adminCorsOrigins;
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const apiRouter = Router();
  RegisterRoutes(apiRouter);
  app.use('/api', apiRouter);

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    if (err instanceof ApiError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    if (err instanceof ValidateError) {
      res.status(422).json({ message: 'Validation failed', details: err.fields });
      return;
    }
    console.error('[app] unhandled error', err);
    res.status(500).json({ message: 'Internal server error' });
  });

  return app;
}
