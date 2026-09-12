import { z } from 'zod';
import { WorkOrderStatus } from '@prisma/client';

// ─── Valid status transition map ──────────────────────────────────────────────
// ASSIGNED → IN_PROGRESS → COMPLETED (forward-only)
export const VALID_STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  [WorkOrderStatus.ASSIGNED]: [WorkOrderStatus.IN_PROGRESS],
  [WorkOrderStatus.IN_PROGRESS]: [WorkOrderStatus.COMPLETED],
  [WorkOrderStatus.COMPLETED]: [], // terminal state — no transitions allowed
};

// ─── Create Work Order ────────────────────────────────────────────────────────
export const createWorkOrderSchema = z.object({
  locationId: z.string().uuid({ message: 'locationId must be a valid UUID' }),
  itemId: z.string().uuid({ message: 'itemId must be a valid UUID' }),
  requiredQuantity: z
    .number({ invalid_type_error: 'requiredQuantity must be a number' })
    .int({ message: 'requiredQuantity must be an integer' })
    .positive({ message: 'requiredQuantity must be greater than 0' }),
  assignedUserId: z
    .string()
    .uuid({ message: 'assignedUserId must be a valid UUID' })
    .optional(),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;

// ─── Update Status ────────────────────────────────────────────────────────────
export const updateWorkOrderStatusSchema = z.object({
  status: z.nativeEnum(WorkOrderStatus, {
    errorMap: () => ({
      message: `status must be one of: ${Object.values(WorkOrderStatus).join(', ')}`,
    }),
  }),
});

export type UpdateWorkOrderStatusInput = z.infer<typeof updateWorkOrderStatusSchema>;

// ─── List Filters ─────────────────────────────────────────────────────────────
export const listWorkOrdersQuerySchema = z.object({
  status: z.nativeEnum(WorkOrderStatus).optional(),
  locationId: z.string().uuid().optional(),
  itemId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
});

export type ListWorkOrdersQuery = z.infer<typeof listWorkOrdersQuerySchema>;
