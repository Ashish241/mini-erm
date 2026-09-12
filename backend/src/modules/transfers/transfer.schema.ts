import { z } from 'zod';

// ─── Create Transfer ──────────────────────────────────────────────────────────
export const createTransferSchema = z.object({
  sourceLocationId: z.string().uuid({ message: 'sourceLocationId must be a valid UUID' }),
  destinationLocationId: z.string().uuid({ message: 'destinationLocationId must be a valid UUID' }),
  itemId: z.string().uuid({ message: 'itemId must be a valid UUID' }),
  quantity: z
    .number({ invalid_type_error: 'quantity must be a number' })
    .int({ message: 'quantity must be an integer' })
    .positive({ message: 'quantity must be greater than 0' }),
}).refine((data) => data.sourceLocationId !== data.destinationLocationId, {
  message: 'Source and destination locations must be different',
  path: ['destinationLocationId'],
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;

// ─── List Filters ─────────────────────────────────────────────────────────────
export const listTransfersQuerySchema = z.object({
  status: z.enum(['REQUESTED', 'DISPATCHED', 'RECEIVED']).optional(),
  sourceLocationId: z.string().uuid().optional(),
  destinationLocationId: z.string().uuid().optional(),
  itemId: z.string().uuid().optional(),
});

export type ListTransfersQuery = z.infer<typeof listTransfersQuerySchema>;
