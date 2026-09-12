import { Prisma, WorkOrderStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CreateWorkOrderInput,
  UpdateWorkOrderStatusInput,
  ListWorkOrdersQuery,
  VALID_STATUS_TRANSITIONS,
} from './workOrder.schema';

// ─── Shared include for consistent response shape ─────────────────────────────
const workOrderInclude = {
  location: true,
  item: { include: { category: true } },
  assignedUser: {
    select: { id: true, name: true, email: true, role: true },
  },
  materials: { include: { item: true } },
} satisfies Prisma.WorkOrderInclude;

// ─── Generate a sequential work order number ──────────────────────────────────
async function generateWorkOrderNumber(): Promise<string> {
  const count = await prisma.workOrder.count();
  const serial = String(count + 1).padStart(5, '0');
  return `WO-${serial}`;
}

// ─── Create Work Order ────────────────────────────────────────────────────────
export async function createWorkOrder(input: CreateWorkOrderInput) {
  const { locationId, itemId, requiredQuantity, assignedUserId } = input;

  // Validate location exists
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    throw Object.assign(new Error('Location not found'), { code: 'NOT_FOUND' });
  }

  // Validate item exists
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) {
    throw Object.assign(new Error('Item not found'), { code: 'NOT_FOUND' });
  }

  // Validate assigned user if provided
  if (assignedUserId) {
    const user = await prisma.user.findUnique({ where: { id: assignedUserId } });
    if (!user) {
      throw Object.assign(new Error('Assigned user not found'), { code: 'NOT_FOUND' });
    }
    // Only ADMIN or OPERATIONS users should be assignable to work orders
    if (user.role === 'SALES') {
      throw Object.assign(
        new Error('Work orders can only be assigned to ADMIN or OPERATIONS users'),
        { code: 'VALIDATION' }
      );
    }
  }

  const workOrderNumber = await generateWorkOrderNumber();

  const workOrder = await prisma.workOrder.create({
    data: {
      workOrderNumber,
      locationId,
      itemId,
      requiredQuantity,
      assignedUserId: assignedUserId ?? null,
      status: WorkOrderStatus.ASSIGNED,
    },
    include: workOrderInclude,
  });

  return workOrder;
}

// ─── List Work Orders ─────────────────────────────────────────────────────────
export async function getWorkOrders(filters: ListWorkOrdersQuery) {
  const where: Prisma.WorkOrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.itemId) where.itemId = filters.itemId;
  if (filters.assignedUserId) where.assignedUserId = filters.assignedUserId;

  return prisma.workOrder.findMany({
    where,
    include: workOrderInclude,
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Get Work Order by ID ─────────────────────────────────────────────────────
export async function getWorkOrderById(id: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: workOrderInclude,
  });

  if (!workOrder) {
    throw Object.assign(new Error('Work order not found'), { code: 'NOT_FOUND' });
  }

  return workOrder;
}

// ─── Update Work Order Status ─────────────────────────────────────────────────
export async function updateWorkOrderStatus(
  id: string,
  input: UpdateWorkOrderStatusInput
) {
  const { status: newStatus } = input;

  const workOrder = await prisma.workOrder.findUnique({ where: { id } });
  if (!workOrder) {
    throw Object.assign(new Error('Work order not found'), { code: 'NOT_FOUND' });
  }

  const allowedTransitions = VALID_STATUS_TRANSITIONS[workOrder.status];

  // Terminal state check
  if (allowedTransitions.length === 0) {
    throw Object.assign(
      new Error(
        `Work order is already COMPLETED and cannot be transitioned to any other status`
      ),
      { code: 'CONFLICT' }
    );
  }

  // Forward-only transition enforcement
  if (!allowedTransitions.includes(newStatus)) {
    throw Object.assign(
      new Error(
        `Invalid status transition: ${workOrder.status} → ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`
      ),
      { code: 'CONFLICT' }
    );
  }

  return prisma.workOrder.update({
    where: { id },
    data: { status: newStatus },
    include: workOrderInclude,
  });
}

// ─── Calculate Material Stock Check ──────────────────────────────────────────
export async function calculateMaterialStockCheck(id: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: workOrderInclude,
  });

  if (!workOrder) {
    throw Object.assign(new Error('Work order not found'), { code: 'NOT_FOUND' });
  }

  // Find inventory at the work order's specific item + location
  // Aggregate across all batches at that location to get combined stock
  const inventoryRows = await prisma.inventory.findMany({
    where: {
      itemId: workOrder.itemId,
      locationId: workOrder.locationId,
    },
  });

  // Sum across all batches (or the single unbatched row) at this location
  const physicalQuantity = inventoryRows.reduce(
    (sum, row) => sum + row.physicalQuantity,
    0
  );
  const reservedQuantity = inventoryRows.reduce(
    (sum, row) => sum + row.reservedQuantity,
    0
  );

  // Core formula — availableQuantity is never stored, always computed
  const availableQuantity = physicalQuantity - reservedQuantity;
  const shortageQuantity = Math.max(workOrder.requiredQuantity - availableQuantity, 0);
  const hasSufficientStock = shortageQuantity === 0;

  return {
    workOrder,
    stockCheck: {
      itemId: workOrder.itemId,
      item: workOrder.item,
      locationId: workOrder.locationId,
      location: workOrder.location,
      requiredQuantity: workOrder.requiredQuantity,
      physicalQuantity,
      reservedQuantity,
      availableQuantity,
      shortageQuantity,
      hasSufficientStock,
    },
  };
}
