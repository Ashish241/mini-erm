import { Router } from 'express';
import { authenticate, authorize, requireSales } from '../../middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import {
  createOrderHandler,
  listOrdersHandler,
  getOrderByIdHandler,
  reserveOrderHandler,
  cancelOrderHandler,
  completeOrderHandler,
} from './order.controller';

const router = Router();

router.use(authenticate);

// Create order: SALES only
router.post('/', authorize(UserRole.SALES), createOrderHandler);

// List/detail: ADMIN, OPERATIONS, SALES (All authenticated allowed for these reads)
router.get('/', listOrdersHandler);
router.get('/:id', getOrderByIdHandler);

// Reserve/Cancel/Complete: SALES and ADMIN
const requireSalesOrAdmin = authorize(UserRole.SALES, UserRole.ADMIN);

router.patch('/:id/reserve', requireSalesOrAdmin, reserveOrderHandler);
router.patch('/:id/cancel', requireSalesOrAdmin, cancelOrderHandler);
router.patch('/:id/complete', requireSalesOrAdmin, completeOrderHandler);

export default router;
