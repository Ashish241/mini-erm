import { Request, Response } from 'express';
import {
  createWorkOrderSchema,
  updateWorkOrderStatusSchema,
  listWorkOrdersQuerySchema,
} from './workOrder.schema';
import {
  createWorkOrder,
  getWorkOrders,
  getWorkOrderById,
  updateWorkOrderStatus,
  calculateMaterialStockCheck,
} from './workOrder.service';

// ─── Shared error → HTTP status mapper ───────────────────────────────────────
function errorStatus(err: unknown): number {
  const code = (err as { code?: string }).code;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'CONFLICT') return 409;
  if (code === 'VALIDATION') return 400;
  return 500;
}

// ─── POST /api/work-orders ────────────────────────────────────────────────────
export async function createWorkOrderHandler(req: Request, res: Response): Promise<void> {
  const parsed = createWorkOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const workOrder = await createWorkOrder(parsed.data);
    res.status(201).json({
      success: true,
      message: 'Work order created.',
      data: { workOrder },
    });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── GET /api/work-orders ─────────────────────────────────────────────────────
export async function listWorkOrdersHandler(req: Request, res: Response): Promise<void> {
  const parsed = listWorkOrdersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const workOrders = await getWorkOrders(parsed.data);
    res.status(200).json({ success: true, data: { workOrders } });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── GET /api/work-orders/:id ─────────────────────────────────────────────────
export async function getWorkOrderByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const workOrder = await getWorkOrderById(req.params.id);
    res.status(200).json({ success: true, data: { workOrder } });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── PATCH /api/work-orders/:id/status ───────────────────────────────────────
export async function updateWorkOrderStatusHandler(req: Request, res: Response): Promise<void> {
  const parsed = updateWorkOrderStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const workOrder = await updateWorkOrderStatus(req.params.id, parsed.data);
    res.status(200).json({
      success: true,
      message: 'Work order status updated.',
      data: { workOrder },
    });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── GET /api/work-orders/:id/stock-check ────────────────────────────────────
export async function stockCheckHandler(req: Request, res: Response): Promise<void> {
  try {
    const result = await calculateMaterialStockCheck(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}
