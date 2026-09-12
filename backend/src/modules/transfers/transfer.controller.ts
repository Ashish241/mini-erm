import { Request, Response } from 'express';
import { createTransferSchema, listTransfersQuerySchema } from './transfer.schema';
import {
  createTransfer,
  listTransfers,
  getTransferById,
  dispatchTransfer,
  receiveTransfer,
} from './transfer.service';

function errorStatus(err: unknown): number {
  const code = (err as { code?: string }).code;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'CONFLICT') return 409;
  if (code === 'VALIDATION') return 400;
  return 500;
}

// ─── POST /api/transfers ──────────────────────────────────────────────────────
export async function createTransferHandler(req: Request, res: Response): Promise<void> {
  const parsed = createTransferSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const transfer = await createTransfer(parsed.data, req.user!.userId);
    res.status(201).json({ success: true, message: 'Transfer created.', data: { transfer } });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── GET /api/transfers ───────────────────────────────────────────────────────
export async function listTransfersHandler(req: Request, res: Response): Promise<void> {
  const parsed = listTransfersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const transfers = await listTransfers(parsed.data);
    res.status(200).json({ success: true, data: { transfers } });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ─── GET /api/transfers/:id ───────────────────────────────────────────────────
export async function getTransferByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const transfer = await getTransferById(req.params.id);
    res.status(200).json({ success: true, data: { transfer } });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── PATCH /api/transfers/:id/dispatch ───────────────────────────────────────
export async function dispatchTransferHandler(req: Request, res: Response): Promise<void> {
  try {
    const transfer = await dispatchTransfer(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, message: 'Transfer dispatched.', data: { transfer } });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}

// ─── PATCH /api/transfers/:id/receive ────────────────────────────────────────
export async function receiveTransferHandler(req: Request, res: Response): Promise<void> {
  try {
    const transfer = await receiveTransfer(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, message: 'Transfer received.', data: { transfer } });
  } catch (err) {
    res.status(errorStatus(err)).json({
      success: false,
      message: (err as Error).message || 'Internal server error.',
    });
  }
}
