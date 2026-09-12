import { Request, Response } from 'express';
import {
  createInventorySchema,
  adjustStockSchema,
  listInventoryQuerySchema,
} from './inventory.schema';
import {
  listInventory,
  getInventoryById,
  createInventory,
  adjustInventoryStock,
  getInventoryTransactions,
} from './inventory.service';

// Helper to map service error codes to HTTP status codes
function errorStatus(err: unknown): number {
  const code = (err as { code?: string }).code;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'CONFLICT') return 409;
  return 500;
}

// ─── GET /api/inventory ───────────────────────────────────────────────────────
export async function listInventoryHandler(req: Request, res: Response): Promise<void> {
  const parsed = listInventoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const inventory = await listInventory(parsed.data);
    res.status(200).json({ success: true, data: { inventory } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── GET /api/inventory/:id ───────────────────────────────────────────────────
export async function getInventoryByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const record = await getInventoryById(req.params.id);
    if (!record) {
      res.status(404).json({ success: false, message: 'Inventory record not found.' });
      return;
    }
    res.status(200).json({ success: true, data: { inventory: record } });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── POST /api/inventory ──────────────────────────────────────────────────────
export async function createInventoryHandler(req: Request, res: Response): Promise<void> {
  const parsed = createInventorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const record = await createInventory(parsed.data, req.user!.userId);
    res.status(201).json({ success: true, message: 'Inventory created.', data: { inventory: record } });
  } catch (err) {
    const status = errorStatus(err);
    res.status(status).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── PATCH /api/inventory/:id/adjust ─────────────────────────────────────────
export async function adjustStockHandler(req: Request, res: Response): Promise<void> {
  const parsed = adjustStockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const record = await adjustInventoryStock(req.params.id, parsed.data, req.user!.userId);
    res.status(200).json({ success: true, message: 'Stock adjusted.', data: { inventory: record } });
  } catch (err) {
    const status = errorStatus(err);
    res.status(status).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── GET /api/inventory/:id/transactions ─────────────────────────────────────
export async function getTransactionsHandler(req: Request, res: Response): Promise<void> {
  try {
    const transactions = await getInventoryTransactions(req.params.id);
    res.status(200).json({ success: true, data: { transactions } });
  } catch (err) {
    const status = errorStatus(err);
    res.status(status).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}
