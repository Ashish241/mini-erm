import { z } from 'zod';

// ─── Create Inventory ────────────────────────────────────────────────────────
export const createInventorySchema = z.object({
  itemId: z.string().uuid({ message: 'itemId must be a valid UUID' }),
  locationId: z.string().uuid({ message: 'locationId must be a valid UUID' }),
  batchNumber: z.string().min(1, { message: 'batchNumber cannot be empty' }).optional(),
  physicalQuantity: z
    .number({ invalid_type_error: 'physicalQuantity must be a number' })
    .int({ message: 'physicalQuantity must be an integer' })
    .nonnegative({ message: 'physicalQuantity must be 0 or greater' }),
});

export type CreateInventoryInput = z.infer<typeof createInventorySchema>;

// ─── Stock Adjustment ────────────────────────────────────────────────────────
export const adjustStockSchema = z.object({
  adjustment: z
    .number({ invalid_type_error: 'adjustment must be a number' })
    .int({ message: 'adjustment must be an integer' })
    .refine((v) => v !== 0, { message: 'adjustment cannot be zero' }),
  reason: z.string().min(1, { message: 'reason is required' }).max(255),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

// ─── Query Filters ───────────────────────────────────────────────────────────
export const listInventoryQuerySchema = z.object({
  itemId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
