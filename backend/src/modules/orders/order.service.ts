import { Prisma, OrderStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreateOrderInput, ListOrdersQuery, VALID_ORDER_TRANSITIONS } from './order.schema';

// ─── Shared include ───────────────────────────────────────────────────────────
const orderInclude = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  items: {
    include: {
      item: true,
      location: true,
    },
  },
} satisfies Prisma.CustomerOrderInclude;

type LockedInventoryRow = {
  id: string;
  physicalQuantity: number;
  reservedQuantity: number;
  locationId: string;
  itemId: string;
};

// ─── Number Generator ─────────────────────────────────────────────────────────
async function generateOrderNumber(): Promise<string> {
  const count = await prisma.customerOrder.count();
  const serial = String(count + 1).padStart(5, '0');
  return `ORD-${serial}`;
}

// ─── Create Order ─────────────────────────────────────────────────────────────
export async function createOrder(input: CreateOrderInput, createdById: string) {
  // Merge duplicate lines (same itemId + locationId)
  const mergedItemsMap = new Map<string, { itemId: string; locationId: string; quantity: number }>();
  for (const reqItem of input.items) {
    const key = `${reqItem.itemId}-${reqItem.locationId}`;
    if (mergedItemsMap.has(key)) {
      mergedItemsMap.get(key)!.quantity += reqItem.quantity;
    } else {
      mergedItemsMap.set(key, { ...reqItem });
    }
  }
  const mergedItems = Array.from(mergedItemsMap.values());

  // Validate references
  for (const item of mergedItems) {
    const dbItem = await prisma.item.findUnique({ where: { id: item.itemId } });
    if (!dbItem) throw Object.assign(new Error(`Item not found: ${item.itemId}`), { code: 'NOT_FOUND' });

    const dbLocation = await prisma.location.findUnique({ where: { id: item.locationId } });
    if (!dbLocation) throw Object.assign(new Error(`Location not found: ${item.locationId}`), { code: 'NOT_FOUND' });
  }

  const orderNumber = await generateOrderNumber();

  return prisma.customerOrder.create({
    data: {
      orderNumber,
      createdById,
      status: OrderStatus.CREATED,
      items: {
        create: mergedItems.map((item) => ({
          itemId: item.itemId,
          locationId: item.locationId,
          quantity: item.quantity,
          reservedQuantity: 0,
        })),
      },
    },
    include: orderInclude,
  });
}

// ─── List / Get ───────────────────────────────────────────────────────────────
export async function getOrders(filters: ListOrdersQuery) {
  const where: Prisma.CustomerOrderWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.createdById) where.createdById = filters.createdById;

  return prisma.customerOrder.findMany({
    where,
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderById(id: string) {
  const order = await prisma.customerOrder.findUnique({
    where: { id },
    include: orderInclude,
  });
  if (!order) throw Object.assign(new Error('Order not found'), { code: 'NOT_FOUND' });
  return order;
}

// ─── Reserve Order ────────────────────────────────────────────────────────────
export async function reserveOrder(id: string, reservedById: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the order row
    const orders = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status FROM "CustomerOrder" WHERE id = ${id} FOR UPDATE
    `;
    if (orders.length === 0) throw Object.assign(new Error('Order not found'), { code: 'NOT_FOUND' });
    const order = orders[0];

    if (order.status !== 'CREATED') {
      throw Object.assign(
        new Error(`Order cannot be reserved from status ${order.status}`),
        { code: 'CONFLICT' }
      );
    }

    const orderItems = await tx.customerOrderItem.findMany({ where: { orderId: id } });
    if (orderItems.length === 0) {
      throw Object.assign(new Error('Order has no items'), { code: 'CONFLICT' });
    }

    // 2. Deterministically lock ALL related inventory rows to prevent deadlocks
    // Order by itemId, locationId, then createdAt ASC (FIFO allocation)
    const itemIds = Array.from(new Set(orderItems.map((oi) => oi.itemId)));
    const locationIds = Array.from(new Set(orderItems.map((oi) => oi.locationId)));

    const inventoryRows = await tx.$queryRaw<LockedInventoryRow[]>`
      SELECT id, "physicalQuantity", "reservedQuantity", "locationId", "itemId"
      FROM "Inventory"
      WHERE "itemId" IN (${Prisma.join(itemIds)})
        AND "locationId" IN (${Prisma.join(locationIds)})
      ORDER BY "itemId" ASC, "locationId" ASC, "createdAt" ASC
      FOR UPDATE
    `;

    // 3. Pre-check availability for all items
    for (const orderItem of orderItems) {
      const rowsForThisItem = inventoryRows.filter(
        (r) => r.itemId === orderItem.itemId && r.locationId === orderItem.locationId
      );
      const totalAvailable = rowsForThisItem.reduce(
        (sum, r) => sum + r.physicalQuantity - r.reservedQuantity,
        0
      );
      if (totalAvailable < orderItem.quantity) {
        throw Object.assign(
          new Error(
            `Insufficient stock for item ${orderItem.itemId} at location ${orderItem.locationId}. Required: ${orderItem.quantity}, Available: ${totalAvailable}`
          ),
          { code: 'CONFLICT' }
        );
      }
    }

    // 4. Allocate and Deduct
    for (const orderItem of orderItems) {
      const rowsForThisItem = inventoryRows.filter(
        (r) => r.itemId === orderItem.itemId && r.locationId === orderItem.locationId
      );

      let remainingToReserve = orderItem.quantity;
      let totalReservedForItem = 0;

      for (const row of rowsForThisItem) {
        if (remainingToReserve <= 0) break;
        const available = row.physicalQuantity - row.reservedQuantity;
        if (available <= 0) continue;

        const amountToReserve = Math.min(available, remainingToReserve);

        // Update Inventory
        await tx.inventory.update({
          where: { id: row.id },
          data: { reservedQuantity: { increment: amountToReserve } },
        });

        // Audit Record
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: row.id,
            type: 'RESERVATION',
            quantity: amountToReserve,
            referenceType: 'CustomerOrder',
            referenceId: id,
            createdById: reservedById,
          },
        });

        remainingToReserve -= amountToReserve;
        totalReservedForItem += amountToReserve;
      }

      // Update OrderItem reservedQuantity
      await tx.customerOrderItem.update({
        where: { id: orderItem.id },
        data: { reservedQuantity: totalReservedForItem },
      });
    }

    // 5. Update Order Status
    return tx.customerOrder.update({
      where: { id },
      data: { status: OrderStatus.RESERVED },
      include: orderInclude,
    });
  });
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────
export async function cancelOrder(id: string, cancelledById: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the order row
    const orders = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status FROM "CustomerOrder" WHERE id = ${id} FOR UPDATE
    `;
    if (orders.length === 0) throw Object.assign(new Error('Order not found'), { code: 'NOT_FOUND' });
    const order = orders[0];

    if (order.status !== 'RESERVED') {
      throw Object.assign(
        new Error(`Order cannot be cancelled from status ${order.status}`),
        { code: 'CONFLICT' }
      );
    }

    // 2. Fetch past RESERVATION transactions to know exactly what was allocated
    const reservationTxs = await tx.inventoryTransaction.findMany({
      where: {
        referenceType: 'CustomerOrder',
        referenceId: id,
        type: 'RESERVATION',
      },
    });

    if (reservationTxs.length === 0) {
      throw Object.assign(new Error('No reservation records found to release'), { code: 'CONFLICT' });
    }

    // Lock those specific inventory rows
    const inventoryIds = Array.from(new Set(reservationTxs.map(t => t.inventoryId)));
    await tx.$queryRaw`
      SELECT id FROM "Inventory"
      WHERE id IN (${Prisma.join(inventoryIds)})
      ORDER BY id ASC
      FOR UPDATE
    `;

    // Calculate total reserved per inventory row
    const allocatedMap = new Map<string, number>();
    for (const txRecord of reservationTxs) {
      allocatedMap.set(
        txRecord.inventoryId,
        (allocatedMap.get(txRecord.inventoryId) || 0) + txRecord.quantity
      );
    }

    // 3. Release reserved stock
    for (const [inventoryId, qty] of allocatedMap.entries()) {
      await tx.inventory.update({
        where: { id: inventoryId },
        data: { reservedQuantity: { decrement: qty } },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId,
          type: 'RELEASE',
          quantity: qty,
          referenceType: 'CustomerOrder',
          referenceId: id,
          createdById: cancelledById,
        },
      });
    }

    // Update items to 0 reserved
    await tx.customerOrderItem.updateMany({
      where: { orderId: id },
      data: { reservedQuantity: 0 },
    });

    // 4. Update order status
    return tx.customerOrder.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: orderInclude,
    });
  });
}

// ─── Complete Order ───────────────────────────────────────────────────────────
export async function completeOrder(id: string, completedById: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the order row
    const orders = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status FROM "CustomerOrder" WHERE id = ${id} FOR UPDATE
    `;
    if (orders.length === 0) throw Object.assign(new Error('Order not found'), { code: 'NOT_FOUND' });
    const order = orders[0];

    if (order.status !== 'RESERVED') {
      throw Object.assign(
        new Error(`Order cannot be completed from status ${order.status}`),
        { code: 'CONFLICT' }
      );
    }

    // 2. Fetch past RESERVATION transactions to know exactly what was allocated
    const reservationTxs = await tx.inventoryTransaction.findMany({
      where: {
        referenceType: 'CustomerOrder',
        referenceId: id,
        type: 'RESERVATION',
      },
    });

    if (reservationTxs.length === 0) {
      throw Object.assign(new Error('No reservation records found to complete'), { code: 'CONFLICT' });
    }

    // Lock those specific inventory rows
    const inventoryIds = Array.from(new Set(reservationTxs.map(t => t.inventoryId)));
    const inventoryRows = await tx.$queryRaw<Array<{ id: string; physicalQuantity: number; reservedQuantity: number }>>`
      SELECT id, "physicalQuantity", "reservedQuantity" FROM "Inventory"
      WHERE id IN (${Prisma.join(inventoryIds)})
      ORDER BY id ASC
      FOR UPDATE
    `;

    const inventoryMap = new Map(inventoryRows.map(row => [row.id, row]));

    // Calculate total reserved per inventory row
    const allocatedMap = new Map<string, number>();
    for (const txRecord of reservationTxs) {
      allocatedMap.set(
        txRecord.inventoryId,
        (allocatedMap.get(txRecord.inventoryId) || 0) + txRecord.quantity
      );
    }

    // 3. Deduct physical and reserved quantities
    for (const [inventoryId, allocationQty] of allocatedMap.entries()) {
      const inv = inventoryMap.get(inventoryId);
      if (!inv) throw new Error(`Inventory row ${inventoryId} not found`);

      if (inv.reservedQuantity < allocationQty) {
        throw Object.assign(new Error(`Invalid state: allocated qty (${allocationQty}) exceeds current reserved qty (${inv.reservedQuantity})`), { code: 'CONFLICT' });
      }

      await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          physicalQuantity: { decrement: allocationQty },
          reservedQuantity: { decrement: allocationQty },
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId,
          type: 'OUTBOUND',
          quantity: allocationQty,
          referenceType: 'CustomerOrder',
          referenceId: id,
          createdById: completedById,
        },
      });
    }

    // 4. Update order status
    return tx.customerOrder.update({
      where: { id },
      data: { status: OrderStatus.COMPLETED },
      include: orderInclude,
    });
  });
}
