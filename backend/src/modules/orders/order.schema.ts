import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [OrderStatus.RESERVED],
  [OrderStatus.RESERVED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

// ─── Create Order ─────────────────────────────────────────────────────────────
export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().uuid({ message: 'itemId must be a valid UUID' }),
        locationId: z.string().uuid({ message: 'locationId must be a valid UUID' }),
        quantity: z
          .number({ invalid_type_error: 'quantity must be a number' })
          .int({ message: 'quantity must be an integer' })
          .positive({ message: 'quantity must be greater than 0' }),
      })
    )
    .min(1, { message: 'Order must contain at least one item' }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ─── List Filters ─────────────────────────────────────────────────────────────
export const listOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  createdById: z.string().uuid().optional(),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
