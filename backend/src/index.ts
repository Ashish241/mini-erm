import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './config/database';
import authRoutes from './modules/auth/auth.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import workOrderRoutes from './modules/work-orders/workOrder.routes';
import transferRoutes from './modules/transfers/transfer.routes';
import orderRoutes from './modules/orders/order.routes';
import referenceRoutes from './modules/reference/reference.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json());

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reference', referenceRoutes);

// ─── Swagger Documentation ───────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.json(swaggerDocument);
});

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      message: 'Mini Operations ERP API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── 404 handler ───────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ──────────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

export { app };

// Only bind to port when this module is the entrypoint (not when imported by tests)
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
