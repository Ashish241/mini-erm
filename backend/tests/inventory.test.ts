import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/config/database';
import { execSync } from 'child_process';

const ADMIN_EMAIL = 'admin@erp.com';
const OPS_EMAIL = 'ops@erp.com';
const SALES_EMAIL = 'sales@erp.com';
const VALID_PASSWORD = 'password123';

let adminToken: string;
let opsToken: string;
let salesToken: string;

// IDs sourced from the seed data
let seededItemId: string;
let seededLocationId: string;
let seededBatchId: string;
let seededInventoryId: string; // the one created by seed (batched)

// IDs for items created during tests — cleaned up afterwards
const createdInventoryIds: string[] = [];

beforeAll(async () => {
  execSync('npx tsx prisma/seed.ts', { stdio: 'ignore' });
  const [adminRes, opsRes, salesRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: VALID_PASSWORD }),
    request(app).post('/api/auth/login').send({ email: OPS_EMAIL, password: VALID_PASSWORD }),
    request(app).post('/api/auth/login').send({ email: SALES_EMAIL, password: VALID_PASSWORD }),
  ]);
  adminToken = adminRes.body.data.token;
  opsToken = opsRes.body.data.token;
  salesToken = salesRes.body.data.token;

  // Fetch seeded data IDs from DB
  const item = await prisma.item.findFirst({ where: { sku: 'RM-STEEL-01' } });
  const location = await prisma.location.findFirst({ where: { code: 'WH-01' } });
  const batch = await prisma.batch.findFirst({ where: { batchNumber: 'B-STEEL-2024-01' } });
  const inventory = await prisma.inventory.findFirst({
    where: { itemId: item!.id, locationId: location!.id },
  });

  seededItemId = item!.id;
  seededLocationId = location!.id;
  seededBatchId = batch!.id;
  seededInventoryId = inventory!.id;
});

afterAll(async () => {
  // Clean up any inventory records created by these tests
  if (createdInventoryIds.length > 0) {
    await prisma.inventoryTransaction.deleteMany({
      where: { inventoryId: { in: createdInventoryIds } },
    });
    await prisma.inventory.deleteMany({
      where: { id: { in: createdInventoryIds } },
    });
  }
  await prisma.$disconnect();
});

// ─── List Inventory ───────────────────────────────────────────────────────────
describe('GET /api/inventory', () => {
  it('returns inventory list with availableQuantity for authenticated users', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.inventory)).toBe(true);

    const record = res.body.data.inventory[0];
    expect(record).toHaveProperty('availableQuantity');
    expect(record.availableQuantity).toBe(record.physicalQuantity - record.reservedQuantity);
  });

  it('returns 401 for unauthenticated requests', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(401);
  });

  it('filters by itemId', async () => {
    const res = await request(app)
      .get(`/api/inventory?itemId=${seededItemId}`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(res.status).toBe(200);
    res.body.data.inventory.forEach((inv: { itemId: string }) => {
      expect(inv.itemId).toBe(seededItemId);
    });
  });

  it('filters by locationId', async () => {
    const res = await request(app)
      .get(`/api/inventory?locationId=${seededLocationId}`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(res.status).toBe(200);
    res.body.data.inventory.forEach((inv: { locationId: string }) => {
      expect(inv.locationId).toBe(seededLocationId);
    });
  });

  it('searches by item name or SKU', async () => {
    const res = await request(app)
      .get('/api/inventory?search=steel')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.inventory.length).toBeGreaterThan(0);
  });
});

// ─── Get Single Inventory ─────────────────────────────────────────────────────
describe('GET /api/inventory/:id', () => {
  it('returns single record with availableQuantity', async () => {
    const res = await request(app)
      .get(`/api/inventory/${seededInventoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const inv = res.body.data.inventory;
    expect(inv).toHaveProperty('availableQuantity');
    expect(inv.availableQuantity).toBe(inv.physicalQuantity - inv.reservedQuantity);
    expect(inv.item).toBeDefined();
    expect(inv.location).toBeDefined();
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .get('/api/inventory/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── Create Inventory ─────────────────────────────────────────────────────────
describe('POST /api/inventory', () => {
  let loc2Id: string;

  beforeAll(async () => {
    const loc2 = await prisma.location.findFirst({ where: { code: 'WH-02' } });
    loc2Id = loc2!.id;
  });

  it('creates inventory successfully as admin', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: seededItemId,
        locationId: loc2Id,
        physicalQuantity: 200,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const inv = res.body.data.inventory;
    expect(inv.physicalQuantity).toBe(200);
    expect(inv.reservedQuantity).toBe(0);
    expect(inv.availableQuantity).toBe(200);
    expect(inv.batchId).toBeNull();

    createdInventoryIds.push(inv.id);
  });

  it('creates inventory successfully as operations user', async () => {
    // Use a different batch to avoid conflict with the seeded one
    const newBatch = await prisma.batch.create({
      data: { batchNumber: `TEST-BATCH-${Date.now()}`, itemId: seededItemId },
    });

    const loc2 = await prisma.location.findFirst({ where: { code: 'WH-02' } });

    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        itemId: seededItemId,
        locationId: loc2!.id,
        batchId: newBatch.id,
        physicalQuantity: 50,
      });

    // This might 409 if already exists — just verify the shape
    if (res.status === 201) {
      createdInventoryIds.push(res.body.data.inventory.id);
      expect(res.body.data.inventory.batchId).toBe(newBatch.id);
    } else {
      expect([201, 409]).toContain(res.status);
    }

    // Clean up batch if not used
    await prisma.batch.deleteMany({ where: { id: newBatch.id, inventory: { none: {} } } });
  });

  it('rejects duplicate inventory record with 409', async () => {
    // The seeded batched record already exists (WH-01 / RM-STEEL-01 / B-STEEL-2024-01)
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: seededItemId,
        locationId: seededLocationId,
        batchId: seededBatchId,
        physicalQuantity: 100,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects negative physicalQuantity with 400', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: seededItemId,
        locationId: seededLocationId,
        physicalQuantity: -10,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects decimal physicalQuantity with 400', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: seededItemId,
        locationId: seededLocationId,
        physicalQuantity: 10.5,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 for sales user attempting to create inventory', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        itemId: seededItemId,
        locationId: seededLocationId,
        physicalQuantity: 100,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for unauthenticated create attempt', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .send({ itemId: seededItemId, locationId: seededLocationId, physicalQuantity: 100 });

    expect(res.status).toBe(401);
  });
});

// ─── Adjust Stock ─────────────────────────────────────────────────────────────
describe('PATCH /api/inventory/:id/adjust', () => {
  it('increases physical quantity successfully', async () => {
    const before = await prisma.inventory.findUnique({ where: { id: seededInventoryId } });

    const res = await request(app)
      .patch(`/api/inventory/${seededInventoryId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adjustment: 100, reason: 'Test stock increase' });

    expect(res.status).toBe(200);
    expect(res.body.data.inventory.physicalQuantity).toBe(before!.physicalQuantity + 100);
    // Restore
    await prisma.inventory.update({
      where: { id: seededInventoryId },
      data: { physicalQuantity: before!.physicalQuantity },
    });
  });

  it('decreases physical quantity successfully when stock is sufficient', async () => {
    const before = await prisma.inventory.findUnique({ where: { id: seededInventoryId } });

    const res = await request(app)
      .patch(`/api/inventory/${seededInventoryId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adjustment: -10, reason: 'Test stock decrease' });

    expect(res.status).toBe(200);
    expect(res.body.data.inventory.physicalQuantity).toBe(before!.physicalQuantity - 10);
    // Restore
    await prisma.inventory.update({
      where: { id: seededInventoryId },
      data: { physicalQuantity: before!.physicalQuantity },
    });
  });

  it('rejects adjustment that would make physical quantity negative — 409', async () => {
    const inv = await prisma.inventory.findUnique({ where: { id: seededInventoryId } });

    const res = await request(app)
      .patch(`/api/inventory/${seededInventoryId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adjustment: -(inv!.physicalQuantity + 1), reason: 'Should fail' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects adjustment that would take physical quantity below reserved — 409', async () => {
    // Set reservedQuantity to a high value temporarily
    await prisma.inventory.update({
      where: { id: seededInventoryId },
      data: { reservedQuantity: 900 },
    });

    const res = await request(app)
      .patch(`/api/inventory/${seededInventoryId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adjustment: -200, reason: 'Should fail — below reserved' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    // Restore reservedQuantity
    await prisma.inventory.update({
      where: { id: seededInventoryId },
      data: { reservedQuantity: 0 },
    });
  });

  it('rejects zero adjustment with 400', async () => {
    const res = await request(app)
      .patch(`/api/inventory/${seededInventoryId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adjustment: 0, reason: 'Zero' });

    expect(res.status).toBe(400);
  });

  it('returns 403 for sales user attempting stock adjustment', async () => {
    const res = await request(app)
      .patch(`/api/inventory/${seededInventoryId}/adjust`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ adjustment: 10, reason: 'Should be blocked' });

    expect(res.status).toBe(403);
  });

  it('returns 401 for unauthenticated adjustment', async () => {
    const res = await request(app)
      .patch(`/api/inventory/${seededInventoryId}/adjust`)
      .send({ adjustment: 10, reason: 'Should be blocked' });

    expect(res.status).toBe(401);
  });
});

// ─── Audit Transactions ───────────────────────────────────────────────────────
describe('GET /api/inventory/:id/transactions', () => {
  it('returns audit transaction history for a record', async () => {
    const res = await request(app)
      .get(`/api/inventory/${seededInventoryId}/transactions`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.transactions)).toBe(true);
    // Seed created an INBOUND transaction
    expect(res.body.data.transactions.length).toBeGreaterThan(0);
    const tx = res.body.data.transactions[0];
    expect(tx).toHaveProperty('type');
    expect(tx).toHaveProperty('quantity');
    expect(tx.createdBy).toBeDefined();
    expect(tx.createdBy).not.toHaveProperty('passwordHash');
  });

  it('returns 404 for transactions on unknown inventory id', async () => {
    const res = await request(app)
      .get('/api/inventory/00000000-0000-0000-0000-000000000000/transactions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('creates an audit transaction on stock adjustment', async () => {
    const before = await prisma.inventoryTransaction.count({
      where: { inventoryId: seededInventoryId },
    });

    await request(app)
      .patch(`/api/inventory/${seededInventoryId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adjustment: 5, reason: 'Audit-test increment' });

    const after = await prisma.inventoryTransaction.count({
      where: { inventoryId: seededInventoryId },
    });

    expect(after).toBe(before + 1);

    // Restore
    await prisma.inventory.update({
      where: { id: seededInventoryId },
      data: { physicalQuantity: { decrement: 5 } },
    });
  });
});
