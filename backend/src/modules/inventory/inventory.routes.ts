import { Router } from 'express';
import { authenticate, requireOperations } from '../../middleware/auth.middleware';
import {
  listInventoryHandler,
  getInventoryByIdHandler,
  createInventoryHandler,
  adjustStockHandler,
  getTransactionsHandler,
} from './inventory.controller';

const router = Router();

// All inventory routes require authentication
router.use(authenticate);

// GET /api/inventory               — any authenticated user
router.get('/', listInventoryHandler);

// GET /api/inventory/:id           — any authenticated user
router.get('/:id', getInventoryByIdHandler);

// POST /api/inventory              — ADMIN and OPERATIONS only
router.post('/', requireOperations, createInventoryHandler);

// PATCH /api/inventory/:id/adjust  — ADMIN and OPERATIONS only
router.patch('/:id/adjust', requireOperations, adjustStockHandler);

// GET /api/inventory/:id/transactions — any authenticated user
router.get('/:id/transactions', getTransactionsHandler);

export default router;
