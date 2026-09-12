import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/config/database';
import { execSync } from 'child_process';

const VALID_PASSWORD = 'password123';

let adminToken: string;
let opsToken: string;
let salesToken: string;
let adminUserId: string;
let opsUserId: string;

// Seeded data IDs
let seededItemId: string;
let seededLocationId: string;
let loc2Id: string;

// Track work orders created during tests for cleanup
const createdWorkOrderIds: string[] = [];

beforeAll(async () => {
  execSync('npx tsx prisma/seed.ts', { stdio: 'ignore' });
  // Obtain tokens and user IDs
  const [adminRes, opsRes, salesRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin@erp.com', password: VALID_PASSWORD }),
    request(app).post('/api/auth/login').send({ email: 'ops@erp.com', password: VALID_PASSWORD }),
    request(app).post('/api/auth/login').send({ email: 'sales@erp.com', password: VALID_PASSWORD }),
  ]);
  adminToken = adminRes.body.data.token;
  opsToken = opsRes.body.data.token;
  salesToken = salesRes.body.data.token;
  adminUserId = adminRes.body.data.user.id;
  opsUserId = opsRes.body.data.user.id;

  // Fetch seeded data
  const item = await prisma.item.findFirst({ where: { sku: 'RM-STEEL-01' } });
  const loc1 = await prisma.location.findFirst({ where: { code: 'WH-01' } });
  const loc2 = await prisma.location.findFirst({ where: { code: 'WH-02' } });

  seededItemId = item!.id;
  seededLocationId = loc1!.id;
  loc2Id = loc2!.id;
});

afterAll(async () => {
  // Cleanup test work orders in creation-reverse order
  if (createdWorkOrderIds.length > 0) {
    await prisma.workOrder.deleteMany({
      where: { id: { in: createdWorkOrderIds } },
    });
  }
  await prisma.$disconnect();
});

// ─── POST /api/work-orders ────────────────────────────────────────────────────
describe('POST /api/work-orders', () => {
  it('admin can create a work order successfully', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: seededItemId,
        locationId: seededLocationId,
        requiredQuantity: 50,
        assignedUserId: opsUserId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const wo = res.body.data.workOrder;
    expect(wo.workOrderNumber).toMatch(/^WO-\d{5}$/);
    expect(wo.status).toBe('ASSIGNED');
    expect(wo.requiredQuantity).toBe(50);
    expect(wo.item).toBeDefined();
    expect(wo.location).toBeDefined();
    expect(wo.assignedUser).toBeDefined();
    expect(wo.assignedUser).not.toHaveProperty('passwordHash');

    createdWorkOrderIds.push(wo.id);
  });

  it('admin can create a work order without assignedUser', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: seededItemId,
        locationId: seededLocationId,
        requiredQuantity: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.workOrder.assignedUser).toBeNull();
    createdWorkOrderIds.push(res.body.data.workOrder.id);
  });

  it('returns 403 for operations user attempting to create a work order', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ itemId: seededItemId, locationId: seededLocationId, requiredQuantity: 10 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 for sales user attempting to create a work order', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ itemId: seededItemId, locationId: seededLocationId, requiredQuantity: 10 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .send({ itemId: seededItemId, locationId: seededLocationId, requiredQuantity: 10 });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid requiredQuantity (zero)', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itemId: seededItemId, locationId: seededLocationId, requiredQuantity: 0 });

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('requiredQuantity');
  });

  it('returns 400 for negative requiredQuantity', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itemId: seededItemId, locationId: seededLocationId, requiredQuantity: -5 });

    expect(res.status).toBe(400);
  });

  it('returns 400 for decimal requiredQuantity', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itemId: seededItemId, locationId: seededLocationId, requiredQuantity: 5.5 });

    expect(res.status).toBe(400);
  });

  it('returns 404 when referenced item does not exist', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: '00000000-0000-0000-0000-000000000001',
        locationId: seededLocationId,
        requiredQuantity: 10,
      });

    expect(res.status).toBe(404);
  });

  it('returns 404 when referenced location does not exist', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: seededItemId,
        locationId: '00000000-0000-0000-0000-000000000002',
        requiredQuantity: 10,
      });

    expect(res.status).toBe(404);
  });

  it('returns 404 when assignedUserId does not exist', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: seededItemId,
        locationId: seededLocationId,
        requiredQuantity: 10,
        assignedUserId: '00000000-0000-0000-0000-000000000003',
      });

    expect(res.status).toBe(404);
  });

  it('returns 400 when assigning a SALES user to a work order', async () => {
    const salesUser = await prisma.user.findFirst({ where: { email: 'sales@erp.com' } });

    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: seededItemId,
        locationId: seededLocationId,
        requiredQuantity: 10,
        assignedUserId: salesUser!.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ADMIN or OPERATIONS/);
  });
});

// ─── GET /api/work-orders ─────────────────────────────────────────────────────
describe('GET /api/work-orders', () => {
  it('admin can list work orders', async () => {
    const res = await request(app)
      .get('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.workOrders)).toBe(true);
    expect(res.body.data.workOrders.length).toBeGreaterThan(0);
  });

  it('operations user can list work orders', async () => {
    const res = await request(app)
      .get('/api/work-orders')
      .set('Authorization', `Bearer ${opsToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.workOrders)).toBe(true);
  });

  it('sales user receives 403', async () => {
    const res = await request(app)
      .get('/api/work-orders')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/work-orders');
    expect(res.status).toBe(401);
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/work-orders?status=ASSIGNED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.workOrders.forEach((wo: { status: string }) => {
      expect(wo.status).toBe('ASSIGNED');
    });
  });
});

// ─── GET /api/work-orders/:id ─────────────────────────────────────────────────
describe('GET /api/work-orders/:id', () => {
  let workOrderId: string;

  beforeAll(async () => {
    workOrderId = createdWorkOrderIds[0];
  });

  it('returns work order details with relations', async () => {
    const res = await request(app)
      .get(`/api/work-orders/${workOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const wo = res.body.data.workOrder;
    expect(wo.id).toBe(workOrderId);
    expect(wo.item).toBeDefined();
    expect(wo.location).toBeDefined();
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .get('/api/work-orders/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('sales user receives 403', async () => {
    const res = await request(app)
      .get(`/api/work-orders/${workOrderId}`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/work-orders/:id/status ───────────────────────────────────────
describe('PATCH /api/work-orders/:id/status', () => {
  let workOrderId: string;

  beforeAll(async () => {
    // Create a fresh work order for status transition tests
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itemId: seededItemId, locationId: seededLocationId, requiredQuantity: 5 });
    workOrderId = res.body.data.workOrder.id;
    createdWorkOrderIds.push(workOrderId);
  });

  it('admin can transition ASSIGNED → IN_PROGRESS', async () => {
    const res = await request(app)
      .patch(`/api/work-orders/${workOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.data.workOrder.status).toBe('IN_PROGRESS');
  });

  it('operations user can transition IN_PROGRESS → COMPLETED', async () => {
    const res = await request(app)
      .patch(`/api/work-orders/${workOrderId}/status`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(res.body.data.workOrder.status).toBe('COMPLETED');
  });

  it('completed work order cannot be transitioned further — 409', async () => {
    const res = await request(app)
      .patch(`/api/work-orders/${workOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ASSIGNED' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('backward transition is rejected — 409', async () => {
    // Create a new WO at ASSIGNED, then try to jump to COMPLETED directly
    const newWoRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itemId: seededItemId, locationId: seededLocationId, requiredQuantity: 3 });
    const newWoId = newWoRes.body.data.workOrder.id;
    createdWorkOrderIds.push(newWoId);

    const res = await request(app)
      .patch(`/api/work-orders/${newWoId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED' }); // skip IN_PROGRESS

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Invalid status transition/);
  });

  it('returns 400 for invalid status value', async () => {
    const newWoRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itemId: seededItemId, locationId: seededLocationId, requiredQuantity: 3 });
    const newWoId = newWoRes.body.data.workOrder.id;
    createdWorkOrderIds.push(newWoId);

    const res = await request(app)
      .patch(`/api/work-orders/${newWoId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INVALID_STATUS' });

    expect(res.status).toBe(400);
  });

  it('sales user receives 403 for status update', async () => {
    const res = await request(app)
      .patch(`/api/work-orders/${workOrderId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(403);
  });

  it('returns 401 for unauthenticated status update', async () => {
    const res = await request(app)
      .patch(`/api/work-orders/${workOrderId}/status`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/work-orders/:id/stock-check ────────────────────────────────────
describe('GET /api/work-orders/:id/stock-check', () => {
  let workOrderWithStockId: string;
  let workOrderNoStockId: string;

  beforeAll(async () => {
    // WO at WH-01 where steel inventory EXISTS (seeded: 1000 units)
    const woRes1 = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itemId: seededItemId, locationId: seededLocationId, requiredQuantity: 100 });
    workOrderWithStockId = woRes1.body.data.workOrder.id;
    createdWorkOrderIds.push(workOrderWithStockId);

    // WO at WH-02 for Widget which has 0 stock there (no inventory row seeded)
    const widgetItem = await prisma.item.findFirst({ where: { sku: 'FG-WIDGET-01' } });
    const woRes2 = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itemId: widgetItem!.id, locationId: seededLocationId, requiredQuantity: 50 });
    workOrderNoStockId = woRes2.body.data.workOrder.id;
    createdWorkOrderIds.push(workOrderNoStockId);
  });

  it('returns correct stock check with sufficient stock', async () => {
    const res = await request(app)
      .get(`/api/work-orders/${workOrderWithStockId}/stock-check`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { stockCheck } = res.body.data;
    expect(stockCheck.requiredQuantity).toBe(100);
    expect(stockCheck.physicalQuantity).toBeGreaterThanOrEqual(100);
    expect(stockCheck.availableQuantity).toBe(
      stockCheck.physicalQuantity - stockCheck.reservedQuantity
    );
    expect(stockCheck.hasSufficientStock).toBe(true);
    expect(stockCheck.shortageQuantity).toBe(0);
    expect(stockCheck.item).toBeDefined();
    expect(stockCheck.location).toBeDefined();
  });

  it('returns correct stock check with shortage (no inventory row)', async () => {
    const res = await request(app)
      .get(`/api/work-orders/${workOrderNoStockId}/stock-check`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { stockCheck } = res.body.data;
    expect(stockCheck.physicalQuantity).toBe(0);
    expect(stockCheck.reservedQuantity).toBe(0);
    expect(stockCheck.availableQuantity).toBe(0);
    expect(stockCheck.hasSufficientStock).toBe(false);
    expect(stockCheck.shortageQuantity).toBe(stockCheck.requiredQuantity);
  });

  it('returns shortage when required > available', async () => {
    // Temporarily set inventory physical quantity to 10 (below required 100)
    const invRow = await prisma.inventory.findFirst({
      where: { itemId: seededItemId, locationId: seededLocationId },
    });
    const originalQty = invRow!.physicalQuantity;
    await prisma.inventory.update({
      where: { id: invRow!.id },
      data: { physicalQuantity: 10, reservedQuantity: 0 },
    });

    const res = await request(app)
      .get(`/api/work-orders/${workOrderWithStockId}/stock-check`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { stockCheck } = res.body.data;
    expect(stockCheck.hasSufficientStock).toBe(false);
    expect(stockCheck.shortageQuantity).toBe(100 - 10); // required - available

    // Restore
    await prisma.inventory.update({
      where: { id: invRow!.id },
      data: { physicalQuantity: originalQty },
    });
  });

  it('operations user can access stock check', async () => {
    const res = await request(app)
      .get(`/api/work-orders/${workOrderWithStockId}/stock-check`)
      .set('Authorization', `Bearer ${opsToken}`);

    expect(res.status).toBe(200);
  });

  it('sales user receives 403 for stock check', async () => {
    const res = await request(app)
      .get(`/api/work-orders/${workOrderWithStockId}/stock-check`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown work order id', async () => {
    const res = await request(app)
      .get('/api/work-orders/00000000-0000-0000-0000-000000000000/stock-check')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
