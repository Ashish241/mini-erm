import { Request, Response } from 'express';
import { createOrderSchema, listOrdersQuerySchema } from './order.schema';
import {
  createOrder,
  getOrders,
  getOrderById,
  reserveOrder,
  cancelOrder,
  completeOrder,
} from './order.service';

function errorStatus(err: unknown): number {
  const code = (err as { code?: string }).code;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'CONFLICT') return 409;
  if (code === 'VALIDATION') return 400;
  return 500;
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
export async function createOrderHandler(req: Request, res: Response): Promise<void> {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const order = await createOrder(parsed.data, req.user!.userId);
    res.status(201).json({ success: true, message: 'Order created.', data: { order } });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────
export async function listOrdersHandler(req: Request, res: Response): Promise<void> {
  const parsed = listOrdersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const orders = await getOrders(parsed.data);
    res.status(200).json({ success: true, data: { orders } });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
export async function getOrderByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const order = await getOrderById(req.params.id);
    res.status(200).json({ success: true, data: { order } });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── PATCH /api/orders/:id/reserve ────────────────────────────────────────────
export async function reserveOrderHandler(req: Request, res: Response): Promise<void> {
  try {
    const order = await reserveOrder(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, message: 'Order reserved.', data: { order } });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── PATCH /api/orders/:id/cancel ─────────────────────────────────────────────
export async function cancelOrderHandler(req: Request, res: Response): Promise<void> {
  try {
    const order = await cancelOrder(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, message: 'Order cancelled.', data: { order } });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── PATCH /api/orders/:id/complete ───────────────────────────────────────────
export async function completeOrderHandler(req: Request, res: Response): Promise<void> {
  try {
    const order = await completeOrder(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, message: 'Order completed.', data: { order } });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}
