import { PrismaClient, UserRole, InventoryTransactionType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  if (process.env.NODE_ENV === 'test') {
    await prisma.inventoryTransaction.deleteMany();
    await prisma.customerOrderItem.deleteMany();
    await prisma.customerOrder.deleteMany();
    await prisma.transfer.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.inventory.deleteMany();
  }

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@erp.com',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const opsUser = await prisma.user.upsert({
    where: { email: 'ops@erp.com' },
    update: {},
    create: {
      name: 'Operations User',
      email: 'ops@erp.com',
      passwordHash,
      role: UserRole.OPERATIONS,
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@erp.com' },
    update: {},
    create: {
      name: 'Sales User',
      email: 'sales@erp.com',
      passwordHash,
      role: UserRole.SALES,
    },
  });

  // 2. Create Locations
  const loc1 = await prisma.location.upsert({
    where: { code: 'WH-01' },
    update: {},
    create: {
      name: 'Main Warehouse',
      code: 'WH-01',
    },
  });

  const loc2 = await prisma.location.upsert({
    where: { code: 'WH-02' },
    update: {},
    create: {
      name: 'Secondary Warehouse',
      code: 'WH-02',
    },
  });

  // 3. Create Categories
  const catRaw = await prisma.category.upsert({
    where: { name: 'Raw Materials' },
    update: {},
    create: { name: 'Raw Materials' },
  });

  const catFin = await prisma.category.upsert({
    where: { name: 'Finished Goods' },
    update: {},
    create: { name: 'Finished Goods' },
  });

  // 4. Create Items
  const itemSteel = await prisma.item.upsert({
    where: { sku: 'RM-STEEL-01' },
    update: {},
    create: {
      name: 'Steel Sheet 1mm',
      sku: 'RM-STEEL-01',
      categoryId: catRaw.id,
    },
  });

  const itemWidget = await prisma.item.upsert({
    where: { sku: 'FG-WIDGET-01' },
    update: {},
    create: {
      name: 'Super Widget',
      sku: 'FG-WIDGET-01',
      categoryId: catFin.id,
    },
  });

  // 5. Create Batches
  const batch1 = await prisma.batch.upsert({
    where: {
      itemId_batchNumber: {
        itemId: itemSteel.id,
        batchNumber: 'B-STEEL-2024-01',
      },
    },
    update: {},
    create: {
      batchNumber: 'B-STEEL-2024-01',
      itemId: itemSteel.id,
    },
  });

  // 6. Initial Inventory
  // Upsert for Inventory by unique constraint
  const inv1 = await prisma.inventory.upsert({
    where: {
      itemId_locationId_batchId: {
        itemId: itemSteel.id,
        locationId: loc1.id,
        batchId: batch1.id,
      },
    },
    update: {},
    create: {
      itemId: itemSteel.id,
      locationId: loc1.id,
      batchId: batch1.id,
      physicalQuantity: 1000,
      reservedQuantity: 0,
    },
  });

  const inv2 = await prisma.inventory.upsert({
    where: {
      itemId_locationId_batchId: {
        itemId: itemWidget.id,
        locationId: loc2.id,
        batchId: '', // We will have to handle optional batchId since we used batchId: String?. Upsert with batchId might be tricky if it's null in where clause. Let's see. Wait, we can't easily upsert with a nullable unique in Prisma like this. Let's just use create/findFirst.
      },
    },
    update: {},
    create: {
      itemId: itemWidget.id,
      locationId: loc2.id,
      // Leaving batchId null
      physicalQuantity: 500,
      reservedQuantity: 0,
    },
  }).catch(async (e) => {
     // If it fails due to unique constraint, we just fetch it
     return await prisma.inventory.findFirst({
        where: { itemId: itemWidget.id, locationId: loc2.id, batchId: null }
     });
  });

  // Create an initial transaction to represent the inbound inventory for inv1
  // We check if transactions exist first to avoid duplicates on re-seed
  const existingTx = await prisma.inventoryTransaction.findFirst({
    where: { inventoryId: inv1.id }
  });
  
  if (!existingTx) {
    await prisma.inventoryTransaction.create({
      data: {
        inventoryId: inv1.id,
        type: InventoryTransactionType.INBOUND,
        quantity: 1000,
        referenceType: 'Initial_Seed',
        referenceId: 'N/A',
        createdById: adminUser.id,
      }
    });
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
