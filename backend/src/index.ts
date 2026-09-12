import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './config/database';
import authRoutes from './modules/auth/auth.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

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

export { app };

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
