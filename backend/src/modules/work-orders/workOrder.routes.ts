import { Router } from 'express';
import {
  authenticate,
  requireAdmin,
  requireOperations,
} from '../../middleware/auth.middleware';
import {
  createWorkOrderHandler,
  listWorkOrdersHandler,
  getWorkOrderByIdHandler,
  updateWorkOrderStatusHandler,
  stockCheckHandler,
} from './workOrder.controller';

const router = Router();

// All work-order routes require authentication
router.use(authenticate);

// POST /api/work-orders                  — ADMIN only
router.post('/', requireAdmin, createWorkOrderHandler);

// GET /api/work-orders                   — ADMIN and OPERATIONS
router.get('/', requireOperations, listWorkOrdersHandler);

// GET /api/work-orders/:id               — ADMIN and OPERATIONS
router.get('/:id', requireOperations, getWorkOrderByIdHandler);

// PATCH /api/work-orders/:id/status      — ADMIN and OPERATIONS
router.patch('/:id/status', requireOperations, updateWorkOrderStatusHandler);

// GET /api/work-orders/:id/stock-check   — ADMIN and OPERATIONS
router.get('/:id/stock-check', requireOperations, stockCheckHandler);

export default router;
