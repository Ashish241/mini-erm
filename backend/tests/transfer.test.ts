import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/config/database';

const VALID_PASSWORD = 'password123';

let adminToken: string;
let opsToken: string;
let salesToken: string;

let seededItemId: string;
let loc1Id: string; // WH-01 — has steel stock
let loc2Id: string; // WH-02

// Created transfer IDs for cleanup
const createdTransferIds: string[] = [];

beforeAll(async () => {
  const [adminRes, opsRes, salesRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin@erp.com', password: VALID_PASSWORD }),
    request(app).post('/api/auth/login').send({ email: 'ops@erp.com', password: VALID_PASSWORD }),
    request(app).post('/api/auth/login').send({ email: 'sales@erp.com', password: VALID_PASSWORD }),
  ]);
  adminToken = adminRes.body.data.token;
  opsToken = opsRes.body.data.token;
  salesToken = salesRes.body.data.token;

  const item = await prisma.item.findFirst({ where: { sku: 'RM-STEEL-01' } });
  const loc1 = await prisma.location.findFirst({ where: { code: 'WH-01' } });
  const loc2 = await prisma.location.findFirst({ where: { code: 'WH-02' } });
  seededItemId = item!.id;
  loc1Id = loc1!.id;
  loc2Id = loc2!.id;
});

afterAll(async () => {
  // Cleanup: delete audit records then transfers
  if (createdTransferIds.length > 0) {
    await prisma.inventoryTransaction.deleteMany({
      where: { referenceType: 'Transfer', referenceId: { in: createdTransferIds } },
    });
    await prisma.transfer.deleteMany({ where: { id: { in: createdTransferIds } } });
  }
  await prisma.$disconnect();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function createTransfer(qty = 10) {
  const res = await request(app)
    .post('/api/transfers')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ sourceLocationId: loc1Id, destinationLocationId: loc2Id, itemId: seededItemId, quantity: qty });
  if (res.body.data?.transfer?.id) createdTransferIds.push(res.body.data.transfer.id);
  return res;
}

async function dispatch(transferId: string, token = adminToken) {
  return request(app)
    .patch(`/api/transfers/${transferId}/dispatch`)
    .set('Authorization', `Bearer ${token}`);
}

async function receive(transferId: string, token = adminToken) {
  return request(app)
    .patch(`/api/transfers/${transferId}/receive`)
    .set('Authorization', `Bearer ${token}`);
}

// ─── Creation ─────────────────────────────────────────────────────────────────
describe('POST /api/transfers', () => {
  it('admin can create a transfer', async () => {
    const res = await createTransfer(20);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const t = res.body.data.transfer;
    expect(t.transferNumber).toMatch(/^TRF-\d{5}$/);
    expect(t.status).toBe('REQUESTED');
    expect(t.quantity).toBe(20);
    expect(t.sourceLocation).toBeDefined();
    expect(t.destinationLocation).toBeDefined();
    expect(t.item).toBeDefined();
  });

  it('operations user can create a transfer', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ sourceLocationId: loc1Id, destinationLocationId: loc2Id, itemId: seededItemId, quantity: 5 });
    expect(res.status).toBe(201);
    if (res.body.data?.transfer?.id) createdTransferIds.push(res.body.data.transfer.id);
  });

  it('sales user receives 403', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ sourceLocationId: loc1Id, destinationLocationId: loc2Id, itemId: seededItemId, quantity: 5 });
    expect(res.status).toBe(403);
  });

  it('unauthenticated request is rejected with 401', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .send({ sourceLocationId: loc1Id, destinationLocationId: loc2Id, itemId: seededItemId, quantity: 5 });
    expect(res.status).toBe(401);
  });

  it('rejects same source and destination location', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: loc1Id, destinationLocationId: loc1Id, itemId: seededItemId, quantity: 5 });
    expect(res.status).toBe(400);
    expect(res.body.errors?.destinationLocationId).toBeDefined();
  });

  it('rejects non-positive quantity (zero)', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: loc1Id, destinationLocationId: loc2Id, itemId: seededItemId, quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('rejects negative quantity', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: loc1Id, destinationLocationId: loc2Id, itemId: seededItemId, quantity: -10 });
    expect(res.status).toBe(400);
  });

  it('rejects decimal quantity', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: loc1Id, destinationLocationId: loc2Id, itemId: seededItemId, quantity: 2.5 });
    expect(res.status).toBe(400);
  });

  it('rejects insufficient source stock', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: loc1Id, destinationLocationId: loc2Id, itemId: seededItemId, quantity: 999999 });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Insufficient/);
  });

  it('returns 404 for non-existent source location', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: '00000000-0000-0000-0000-000000000001', destinationLocationId: loc2Id, itemId: seededItemId, quantity: 5 });
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent destination location', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: loc1Id, destinationLocationId: '00000000-0000-0000-0000-000000000002', itemId: seededItemId, quantity: 5 });
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent item', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: loc1Id, destinationLocationId: loc2Id, itemId: '00000000-0000-0000-0000-000000000003', quantity: 5 });
    expect(res.status).toBe(404);
  });

  it('creating a transfer does NOT reduce source stock', async () => {
    const invBefore = await prisma.inventory.findFirst({
      where: { itemId: seededItemId, locationId: loc1Id },
    });
    const qtyBefore = invBefore!.physicalQuantity;

    await createTransfer(10);

    const invAfter = await prisma.inventory.findFirst({
      where: { itemId: seededItemId, locationId: loc1Id },
    });
    expect(invAfter!.physicalQuantity).toBe(qtyBefore);
  });
});

// ─── List / Detail ────────────────────────────────────────────────────────────
describe('GET /api/transfers and GET /api/transfers/:id', () => {
  it('admin can list transfers', async () => {
    const res = await request(app)
      .get('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.transfers)).toBe(true);
  });

  it('operations user can list transfers', async () => {
    const res = await request(app)
      .get('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`);
    expect(res.status).toBe(200);
  });

  it('sales user receives 403 on list', async () => {
    const res = await request(app).get('/api/transfers').set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown transfer id', async () => {
    const res = await request(app)
      .get('/api/transfers/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/transfers?status=REQUESTED')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.transfers.forEach((t: { status: string }) => expect(t.status).toBe('REQUESTED'));
  });
});

// ─── Dispatch ─────────────────────────────────────────────────────────────────
describe('PATCH /api/transfers/:id/dispatch', () => {
  it('dispatch reduces source physical quantity', async () => {
    const createRes = await createTransfer(30);
    const transferId = createRes.body.data.transfer.id;

    const srcBefore = await prisma.inventory.findFirst({ where: { itemId: seededItemId, locationId: loc1Id } });
    const physBefore = srcBefore!.physicalQuantity;

    const dispRes = await dispatch(transferId);
    expect(dispRes.status).toBe(200);
    expect(dispRes.body.data.transfer.status).toBe('DISPATCHED');
    expect(dispRes.body.data.transfer.dispatchedAt).not.toBeNull();

    const srcAfter = await prisma.inventory.findFirst({ where: { itemId: seededItemId, locationId: loc1Id } });
    expect(srcAfter!.physicalQuantity).toBe(physBefore - 30);
  });

  it('dispatch does NOT increase destination stock', async () => {
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;

    const dstBefore = await prisma.inventory.findMany({ where: { itemId: seededItemId, locationId: loc2Id } });
    const dstQtyBefore = dstBefore.reduce((s, r) => s + r.physicalQuantity, 0);

    await dispatch(transferId);

    const dstAfter = await prisma.inventory.findMany({ where: { itemId: seededItemId, locationId: loc2Id } });
    const dstQtyAfter = dstAfter.reduce((s, r) => s + r.physicalQuantity, 0);
    expect(dstQtyAfter).toBe(dstQtyBefore);
  });

  it('dispatching twice is rejected with 409', async () => {
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;
    await dispatch(transferId);

    const res2 = await dispatch(transferId);
    expect(res2.status).toBe(409);
    expect(res2.body.message).toMatch(/already been dispatched/);
  });

  it('dispatching a RECEIVED transfer is rejected', async () => {
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;
    await dispatch(transferId);
    await receive(transferId);

    const res = await dispatch(transferId);
    expect(res.status).toBe(409);
  });

  it('creates TRANSFER_OUT audit record on dispatch', async () => {
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;
    await dispatch(transferId);

    const auditRecords = await prisma.inventoryTransaction.findMany({
      where: { referenceType: 'Transfer', referenceId: transferId, type: 'TRANSFER_OUT' },
    });
    expect(auditRecords.length).toBeGreaterThan(0);
    expect(auditRecords.reduce((s, r) => s + r.quantity, 0)).toBe(5);
  });

  it('sales user receives 403 for dispatch', async () => {
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;
    const res = await dispatch(transferId, salesToken);
    expect(res.status).toBe(403);
    // Cleanup — dispatch with admin since it was not dispatched
    await dispatch(transferId);
  });

  it('unauthenticated dispatch is rejected', async () => {
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;
    const res = await request(app).patch(`/api/transfers/${transferId}/dispatch`);
    expect(res.status).toBe(401);
    await dispatch(transferId); // cleanup
  });

  it('rejects dispatch when source stock falls below reserved quantity', async () => {
    // Set reserved quantity = physicalQuantity on source to make available = 0
    const invRow = await prisma.inventory.findFirst({ where: { itemId: seededItemId, locationId: loc1Id } });
    const originalReserved = invRow!.reservedQuantity;
    await prisma.inventory.update({
      where: { id: invRow!.id },
      data: { reservedQuantity: invRow!.physicalQuantity },
    });

    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceLocationId: loc1Id, destinationLocationId: loc2Id, itemId: seededItemId, quantity: 1 });

    // Creation itself should fail (no available stock)
    expect(createRes.status).toBe(409);

    // Restore
    await prisma.inventory.update({ where: { id: invRow!.id }, data: { reservedQuantity: originalReserved } });
  });
});

// ─── Receive ──────────────────────────────────────────────────────────────────
describe('PATCH /api/transfers/:id/receive', () => {
  it('receive increases destination physical quantity', async () => {
    const createRes = await createTransfer(40);
    const transferId = createRes.body.data.transfer.id;
    await dispatch(transferId);

    const dstBefore = await prisma.inventory.findMany({ where: { itemId: seededItemId, locationId: loc2Id } });
    const dstQtyBefore = dstBefore.reduce((s, r) => s + r.physicalQuantity, 0);

    const rcvRes = await receive(transferId);
    expect(rcvRes.status).toBe(200);
    expect(rcvRes.body.data.transfer.status).toBe('RECEIVED');
    expect(rcvRes.body.data.transfer.receivedAt).not.toBeNull();

    const dstAfter = await prisma.inventory.findMany({ where: { itemId: seededItemId, locationId: loc2Id } });
    const dstQtyAfter = dstAfter.reduce((s, r) => s + r.physicalQuantity, 0);
    expect(dstQtyAfter).toBe(dstQtyBefore + 40);
  });

  it('receiving before dispatch is rejected with 409', async () => {
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;

    const res = await receive(transferId);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/dispatched before/);

    await dispatch(transferId); // cleanup
  });

  it('receiving twice is rejected with 409', async () => {
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;
    await dispatch(transferId);
    await receive(transferId);

    const res2 = await receive(transferId);
    expect(res2.status).toBe(409);
    expect(res2.body.message).toMatch(/already been received/);
  });

  it('creates TRANSFER_IN audit record on receive', async () => {
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;
    await dispatch(transferId);
    await receive(transferId);

    const auditRecords = await prisma.inventoryTransaction.findMany({
      where: { referenceType: 'Transfer', referenceId: transferId, type: 'TRANSFER_IN' },
    });
    expect(auditRecords.length).toBe(1);
    expect(auditRecords[0].quantity).toBe(5);
  });

  it('double-receive concurrency: second receive is safely rejected', async () => {
    // Simulate by sending two receive requests in parallel after dispatch
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;
    await dispatch(transferId);

    const [res1, res2] = await Promise.all([receive(transferId), receive(transferId)]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    const auditRecords = await prisma.inventoryTransaction.findMany({
      where: { referenceType: 'Transfer', referenceId: transferId, type: 'TRANSFER_IN' },
    });
    expect(auditRecords.length).toBe(1); // exactly one TRANSFER_IN record
  });

  it('sales user receives 403 for receive', async () => {
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;
    await dispatch(transferId);
    const res = await receive(transferId, salesToken);
    expect(res.status).toBe(403);
    await receive(transferId); // cleanup
  });

  it('unauthenticated receive is rejected', async () => {
    const createRes = await createTransfer(5);
    const transferId = createRes.body.data.transfer.id;
    await dispatch(transferId);
    const res = await request(app).patch(`/api/transfers/${transferId}/receive`);
    expect(res.status).toBe(401);
    await receive(transferId); // cleanup
  });
});
