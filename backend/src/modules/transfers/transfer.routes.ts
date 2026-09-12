import { Router } from 'express';
import { authenticate, requireOperations } from '../../middleware/auth.middleware';
import {
  createTransferHandler,
  listTransfersHandler,
  getTransferByIdHandler,
  dispatchTransferHandler,
  receiveTransferHandler,
} from './transfer.controller';

const router = Router();

// All transfer routes require authentication
router.use(authenticate);

// POST   /api/transfers              — ADMIN and OPERATIONS
router.post('/', requireOperations, createTransferHandler);

// GET    /api/transfers              — ADMIN and OPERATIONS
router.get('/', requireOperations, listTransfersHandler);

// GET    /api/transfers/:id          — ADMIN and OPERATIONS
router.get('/:id', requireOperations, getTransferByIdHandler);

// PATCH  /api/transfers/:id/dispatch — ADMIN and OPERATIONS
router.patch('/:id/dispatch', requireOperations, dispatchTransferHandler);

// PATCH  /api/transfers/:id/receive  — ADMIN and OPERATIONS
router.patch('/:id/receive', requireOperations, receiveTransferHandler);

export default router;
