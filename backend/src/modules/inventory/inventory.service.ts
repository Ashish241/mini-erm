import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  CreateInventoryInput,
  AdjustStockInput,
  ListInventoryQuery,
} from './inventory.schema';

// ─── Shared include block for consistent response shape ───────────────────────
const inventoryInclude = {
  item: {
    include: {
      category: true,
    },
  },
  location: true,
  batch: true,
} satisfies Prisma.InventoryInclude;

// ─── Computed availableQuantity ───────────────────────────────────────────────
function withAvailable<T extends { physicalQuantity: number; reservedQuantity: number }>(
  record: T
) {
  return {
    ...record,
    availableQuantity: record.physicalQuantity - record.reservedQuantity,
  };
}

// ─── List Inventory ───────────────────────────────────────────────────────────
export async function listInventory(filters: ListInventoryQuery) {
  const where: Prisma.InventoryWhereInput = {};

  if (filters.itemId) {
    where.itemId = filters.itemId;
  }
  if (filters.locationId) {
    where.locationId = filters.locationId;
  }
  if (filters.categoryId) {
    where.item = { categoryId: filters.categoryId };
  }
  if (filters.search) {
    where.item = {
      ...((where.item as object) ?? {}),
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ],
    };
  }

  const records = await prisma.inventory.findMany({
    where,
    include: inventoryInclude,
    orderBy: { updatedAt: 'desc' },
  });

  return records.map(withAvailable);
}

// ─── Get Inventory by ID ──────────────────────────────────────────────────────
export async function getInventoryById(id: string) {
  const record = await prisma.inventory.findUnique({
    where: { id },
    include: inventoryInclude,
  });

  if (!record) return null;
  return withAvailable(record);
}

// ─── Create Inventory (initial stock / admin adjustment) ─────────────────────
export async function createInventory(
  input: CreateInventoryInput,
  createdById: string
) {
  const { itemId, locationId, batchNumber, physicalQuantity } = input;

  // Verify referenced records exist
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw Object.assign(new Error('Item not found'), { code: 'NOT_FOUND' });

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) throw Object.assign(new Error('Location not found'), { code: 'NOT_FOUND' });

  // Wrap creation + audit transaction in a Prisma transaction
  const result = await prisma.$transaction(async (tx) => {
    let finalBatchId = null;

    if (batchNumber) {
      const batch = await tx.batch.upsert({
        where: { itemId_batchNumber: { itemId, batchNumber } },
        update: {},
        create: { itemId, batchNumber },
      });
      finalBatchId = batch.id;
    }

    // Check for duplicate inside the transaction
    const existing = await tx.inventory.findFirst({
      where: {
        itemId,
        locationId,
        batchId: finalBatchId,
      },
    });

    if (existing) {
      throw Object.assign(
        new Error(
          'Inventory record already exists for this item/location/batch combination. Use the adjust endpoint instead.'
        ),
        { code: 'CONFLICT' }
      );
    }

    const inventory = await tx.inventory.create({
      data: {
        itemId,
        locationId,
        batchId: finalBatchId,
        physicalQuantity,
        reservedQuantity: 0,
      },
      include: inventoryInclude,
    });

    await tx.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        type: 'INBOUND',
        quantity: physicalQuantity,
        referenceType: 'ManualCreation',
        referenceId: null,
        createdById,
      },
    });

    return inventory;
  });

  return withAvailable(result);
}

// ─── Adjust Stock ─────────────────────────────────────────────────────────────
export async function adjustInventoryStock(
  id: string,
  input: AdjustStockInput,
  adjustedById: string
) {
  const { adjustment, reason } = input;

  const result = await prisma.$transaction(async (tx) => {
    // Lock the row for update to prevent concurrent mutations
    const records = await tx.$queryRaw<
      Array<{
        id: string;
        physicalQuantity: number;
        reservedQuantity: number;
      }>
    >`SELECT id, "physicalQuantity", "reservedQuantity" FROM "Inventory" WHERE id = ${id} FOR UPDATE`;

    if (records.length === 0) {
      throw Object.assign(new Error('Inventory record not found'), { code: 'NOT_FOUND' });
    }

    const current = records[0];
    const newPhysical = current.physicalQuantity + adjustment;

    // Business rule: physical quantity cannot go below 0
    if (newPhysical < 0) {
      throw Object.assign(
        new Error(
          `Adjustment would result in negative physical quantity (current: ${current.physicalQuantity}, adjustment: ${adjustment})`
        ),
        { code: 'CONFLICT' }
      );
    }

    // Business rule: physical quantity cannot go below reserved quantity
    if (newPhysical < current.reservedQuantity) {
      throw Object.assign(
        new Error(
          `Adjustment would make physical quantity (${newPhysical}) fall below reserved quantity (${current.reservedQuantity})`
        ),
        { code: 'CONFLICT' }
      );
    }

    const updated = await tx.inventory.update({
      where: { id },
      data: { physicalQuantity: newPhysical },
      include: inventoryInclude,
    });

    await tx.inventoryTransaction.create({
      data: {
        inventoryId: id,
        type: adjustment > 0 ? 'INBOUND' : 'OUTBOUND',
        quantity: Math.abs(adjustment),
        referenceType: 'StockAdjustment',
        referenceId: reason,
        createdById: adjustedById,
      },
    });

    return updated;
  });

  return withAvailable(result);
}

// ─── Get Inventory Transactions (audit history) ──────────────────────────────
export async function getInventoryTransactions(inventoryId: string) {
  // Verify the inventory record exists first
  const inventory = await prisma.inventory.findUnique({ where: { id: inventoryId } });
  if (!inventory) {
    throw Object.assign(new Error('Inventory record not found'), { code: 'NOT_FOUND' });
  }

  return prisma.inventoryTransaction.findMany({
    where: { inventoryId },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
