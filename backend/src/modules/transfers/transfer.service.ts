import { Prisma, TransferStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { CreateTransferInput, ListTransfersQuery } from './transfer.schema';

// ─── Shared include ───────────────────────────────────────────────────────────
const transferInclude = {
  sourceLocation: true,
  destinationLocation: true,
  item: { include: { category: true } },
} satisfies Prisma.TransferInclude;

// ─── Row type returned by raw lock query ──────────────────────────────────────
type LockedInventoryRow = {
  id: string;
  physicalQuantity: number;
  reservedQuantity: number;
  locationId: string;
};

// ─── Sequential transfer number generator ────────────────────────────────────
async function generateTransferNumber(): Promise<string> {
  const count = await prisma.transfer.count();
  const serial = String(count + 1).padStart(5, '0');
  return `TRF-${serial}`;
}

// ─── Create Transfer ──────────────────────────────────────────────────────────
export async function createTransfer(input: CreateTransferInput, createdById: string) {
  const { sourceLocationId, destinationLocationId, itemId, quantity } = input;

  // Validate references
  const srcLocation = await prisma.location.findUnique({ where: { id: sourceLocationId } });
  if (!srcLocation) throw Object.assign(new Error('Source location not found'), { code: 'NOT_FOUND' });

  const dstLocation = await prisma.location.findUnique({ where: { id: destinationLocationId } });
  if (!dstLocation) throw Object.assign(new Error('Destination location not found'), { code: 'NOT_FOUND' });

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw Object.assign(new Error('Item not found'), { code: 'NOT_FOUND' });

  // Check available stock at source (across all batches at that location)
  const sourceInventory = await prisma.inventory.findMany({
    where: { itemId, locationId: sourceLocationId },
  });
  const totalAvailable = sourceInventory.reduce(
    (sum, row) => sum + row.physicalQuantity - row.reservedQuantity,
    0
  );
  if (totalAvailable < quantity) {
    throw Object.assign(
      new Error(
        `Insufficient available stock at source location. Available: ${totalAvailable}, requested: ${quantity}`
      ),
      { code: 'CONFLICT' }
    );
  }

  const transferNumber = await generateTransferNumber();

  const transfer = await prisma.transfer.create({
    data: {
      transferNumber,
      sourceLocationId,
      destinationLocationId,
      itemId,
      quantity,
      status: TransferStatus.REQUESTED,
    },
    include: transferInclude,
  });

  return transfer;
}

// ─── List Transfers ───────────────────────────────────────────────────────────
export async function listTransfers(filters: ListTransfersQuery) {
  const where: Prisma.TransferWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.sourceLocationId) where.sourceLocationId = filters.sourceLocationId;
  if (filters.destinationLocationId) where.destinationLocationId = filters.destinationLocationId;
  if (filters.itemId) where.itemId = filters.itemId;

  return prisma.transfer.findMany({
    where,
    include: transferInclude,
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Get Transfer by ID ───────────────────────────────────────────────────────
export async function getTransferById(id: string) {
  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: transferInclude,
  });
  if (!transfer) throw Object.assign(new Error('Transfer not found'), { code: 'NOT_FOUND' });
  return transfer;
}

// ─── Dispatch Transfer ────────────────────────────────────────────────────────
// On DISPATCHED: source physical qty decreases; destination is unchanged.
// Uses SELECT … FOR UPDATE on ALL source inventory rows for this item/location
// to prevent concurrent dispatch from overdrawing stock.
export async function dispatchTransfer(id: string, dispatchedById: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the transfer row itself to prevent concurrent dispatches
    const transfers = await tx.$queryRaw<
      Array<{ id: string; status: string; quantity: number; sourceLocationId: string; destinationLocationId: string; itemId: string }>
    >`SELECT id, status, quantity, "sourceLocationId", "destinationLocationId", "itemId"
      FROM "Transfer" WHERE id = ${id} FOR UPDATE`;

    if (transfers.length === 0) {
      throw Object.assign(new Error('Transfer not found'), { code: 'NOT_FOUND' });
    }
    const transfer = transfers[0];

    if (transfer.status !== 'REQUESTED') {
      throw Object.assign(
        new Error(
          transfer.status === 'DISPATCHED'
            ? 'Transfer has already been dispatched'
            : 'Transfer cannot be dispatched — it has already been received'
        ),
        { code: 'CONFLICT' }
      );
    }

    // 2. Lock ALL inventory rows for this item at source location
    const sourceRows = await tx.$queryRaw<LockedInventoryRow[]>`
      SELECT id, "physicalQuantity", "reservedQuantity", "locationId"
      FROM "Inventory"
      WHERE "itemId" = ${transfer.itemId}
        AND "locationId" = ${transfer.sourceLocationId}
      FOR UPDATE`;

    const totalPhysical = sourceRows.reduce((s, r) => s + r.physicalQuantity, 0);
    const totalReserved = sourceRows.reduce((s, r) => s + r.reservedQuantity, 0);
    const totalAvailable = totalPhysical - totalReserved;

    if (totalAvailable < transfer.quantity) {
      throw Object.assign(
        new Error(
          `Insufficient available stock at source. Available: ${totalAvailable}, required: ${transfer.quantity}`
        ),
        { code: 'CONFLICT' }
      );
    }

    // 3. Reduce source physical qty — greedily deplete from first row(s)
    let remaining = transfer.quantity;
    for (const row of sourceRows) {
      if (remaining <= 0) break;
      const rowAvailable = row.physicalQuantity - row.reservedQuantity;
      const deduct = Math.min(rowAvailable, remaining);
      if (deduct <= 0) continue;

      // Guard: never let physical drop below reserved
      const newPhysical = row.physicalQuantity - deduct;
      if (newPhysical < row.reservedQuantity) {
        throw Object.assign(
          new Error('Dispatch would reduce physical quantity below reserved quantity at source'),
          { code: 'CONFLICT' }
        );
      }

      await tx.inventory.update({
        where: { id: row.id },
        data: { physicalQuantity: { decrement: deduct } },
      });

      // 4. Write TRANSFER_OUT audit record for each source row touched
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: row.id,
          type: 'TRANSFER_OUT',
          quantity: deduct,
          referenceType: 'Transfer',
          referenceId: id,
          createdById: dispatchedById,
        },
      });

      remaining -= deduct;
    }

    // 5. Update transfer status → DISPATCHED
    const updated = await tx.transfer.update({
      where: { id },
      data: { status: TransferStatus.DISPATCHED, dispatchedAt: new Date() },
      include: transferInclude,
    });

    return updated;
  });
}

// ─── Receive Transfer ─────────────────────────────────────────────────────────
// On RECEIVED: destination physical qty increases.
// Guard against double-receive using the locked transfer status check.
export async function receiveTransfer(id: string, receivedById: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the transfer row
    const transfers = await tx.$queryRaw<
      Array<{ id: string; status: string; quantity: number; destinationLocationId: string; itemId: string }>
    >`SELECT id, status, quantity, "destinationLocationId", "itemId"
      FROM "Transfer" WHERE id = ${id} FOR UPDATE`;

    if (transfers.length === 0) {
      throw Object.assign(new Error('Transfer not found'), { code: 'NOT_FOUND' });
    }
    const transfer = transfers[0];

    if (transfer.status === 'REQUESTED') {
      throw Object.assign(
        new Error('Transfer must be dispatched before it can be received'),
        { code: 'CONFLICT' }
      );
    }
    if (transfer.status === 'RECEIVED') {
      throw Object.assign(
        new Error('Transfer has already been received'),
        { code: 'CONFLICT' }
      );
    }
    // transfer.status must be 'DISPATCHED' at this point

    // 2. Find or create an unbatched inventory row at destination
    //    We use findFirst + update-or-create (locked) inside the transaction.
    const destRows = await tx.$queryRaw<LockedInventoryRow[]>`
      SELECT id, "physicalQuantity", "reservedQuantity", "locationId"
      FROM "Inventory"
      WHERE "itemId" = ${transfer.itemId}
        AND "locationId" = ${transfer.destinationLocationId}
        AND "batchId" IS NULL
      FOR UPDATE`;

    let destInventoryId: string;

    if (destRows.length > 0) {
      // Update existing row
      const destRow = destRows[0];
      await tx.inventory.update({
        where: { id: destRow.id },
        data: { physicalQuantity: { increment: transfer.quantity } },
      });
      destInventoryId = destRow.id;
    } else {
      // Create new unbatched inventory row at destination
      const created = await tx.inventory.create({
        data: {
          itemId: transfer.itemId,
          locationId: transfer.destinationLocationId,
          batchId: null,
          physicalQuantity: transfer.quantity,
          reservedQuantity: 0,
        },
      });
      destInventoryId = created.id;
    }

    // 3. Write TRANSFER_IN audit record
    await tx.inventoryTransaction.create({
      data: {
        inventoryId: destInventoryId,
        type: 'TRANSFER_IN',
        quantity: transfer.quantity,
        referenceType: 'Transfer',
        referenceId: id,
        createdById: receivedById,
      },
    });

    // 4. Update transfer status → RECEIVED
    const updated = await tx.transfer.update({
      where: { id },
      data: { status: TransferStatus.RECEIVED, receivedAt: new Date() },
      include: transferInclude,
    });

    return updated;
  });
}
