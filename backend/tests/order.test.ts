import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/config/database';
import { execSync } from 'child_process';

const VALID_PASSWORD = 'password123';

let adminToken: string;
let opsToken: string;
let salesToken: string;

let seededItemId: string;
let seededItem2Id: string;
let loc1Id: string; // WH-01
let loc2Id: string; // WH-02

// Track orders created during tests for cleanup
const createdOrderIds: string[] = [];

beforeAll(async () => {
  execSync('npx tsx prisma/seed.ts', { stdio: 'ignore' });
  const [adminRes, opsRes, salesRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin@erp.com', password: VALID_PASSWORD }),
    request(app).post('/api/auth/login').send({ email: 'ops@erp.com', password: VALID_PASSWORD }),
    request(app).post('/api/auth/login').send({ email: 'sales@erp.com', password: VALID_PASSWORD }),
  ]);
  adminToken = adminRes.body.data.token;
  opsToken = opsRes.body.data.token;
  salesToken = salesRes.body.data.token;

  const item1 = await prisma.item.findFirst({ where: { sku: 'RM-STEEL-01' } });
  const item2 = await prisma.item.findFirst({ where: { sku: 'FG-WIDGET-01' } });
  const loc1 = await prisma.location.findFirst({ where: { code: 'WH-01' } });
  const loc2 = await prisma.location.findFirst({ where: { code: 'WH-02' } });

  seededItemId = item1!.id;
  seededItem2Id = item2!.id;
  loc1Id = loc1!.id;
  loc2Id = loc2!.id;
});

afterAll(async () => {
  if (createdOrderIds.length > 0) {
    await prisma.inventoryTransaction.deleteMany({
      where: { referenceType: 'CustomerOrder', referenceId: { in: createdOrderIds } },
    });
    await prisma.customerOrder.deleteMany({
      where: { id: { in: createdOrderIds } },
    });
  }
  await prisma.$disconnect();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function createOrder(token = salesToken, items = [{ itemId: seededItemId, locationId: loc1Id, quantity: 10 }]) {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ items });
  if (res.body.data?.order?.id) createdOrderIds.push(res.body.data.order.id);
  return res;
}

// ─── POST /api/orders (Creation & Validation) ─────────────────────────────────
describe('POST /api/orders', () => {
  it('1. Sales user can create an order', async () => {
    const res = await createOrder();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const order = res.body.data.order;
    expect(order.orderNumber).toMatch(/^ORD-\d{5}$/);
    expect(order.status).toBe('CREATED');
    expect(order.items.length).toBe(1);
    expect(order.items[0].quantity).toBe(10);
    expect(order.items[0].reservedQuantity).toBe(0);
  });

  it('2. Admin/Operations role restrictions behave correctly (Ops rejected)', async () => {
    const res = await createOrder(opsToken);
    expect(res.status).toBe(403);
  });

  it('2. Admin/Operations role restrictions behave correctly (Admin rejected)', async () => {
    const res = await createOrder(adminToken);
    expect(res.status).toBe(403);
  });

  it('3. Unauthenticated request rejected', async () => {
    const res = await request(app).post('/api/orders').send({ items: [] });
    expect(res.status).toBe(401);
  });

  it('4. Invalid item rejected', async () => {
    const res = await createOrder(salesToken, [{ itemId: '00000000-0000-0000-0000-000000000001', locationId: loc1Id, quantity: 5 }]);
    expect(res.status).toBe(404);
  });

  it('5. Invalid quantity rejected', async () => {
    const res = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: -5 }]);
    expect(res.status).toBe(400);
  });

  it('6. Empty order rejected', async () => {
    const res = await createOrder(salesToken, []);
    expect(res.status).toBe(400);
  });

  it('Duplicate item lines are merged', async () => {
    const res = await createOrder(salesToken, [
      { itemId: seededItemId, locationId: loc1Id, quantity: 5 },
      { itemId: seededItemId, locationId: loc1Id, quantity: 15 }
    ]);
    expect(res.status).toBe(201);
    expect(res.body.data.order.items.length).toBe(1);
    expect(res.body.data.order.items[0].quantity).toBe(20); // Merged sum
  });
});

// ─── GET /api/orders (Read) ───────────────────────────────────────────────────
describe('GET /api/orders and GET /api/orders/:id', () => {
  it('7. Order list/detail works for all roles', async () => {
    const listRes = await request(app).get('/api/orders').set('Authorization', `Bearer ${opsToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data.orders)).toBe(true);

    if (listRes.body.data.orders.length > 0) {
      const orderId = listRes.body.data.orders[0].id;
      const detailRes = await request(app).get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${salesToken}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.order.id).toBe(orderId);
    }
  });
});

// ─── Reservation ──────────────────────────────────────────────────────────────
describe('PATCH /api/orders/:id/reserve', () => {
  it('8. Reservation succeeds when stock is sufficient', async () => {
    const orderRes = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: 10 }]);
    const orderId = orderRes.body.data.order.id;

    const res = await request(app).patch(`/api/orders/${orderId}/reserve`).set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe('RESERVED');
  });

  it('9. Reservation fails when stock is insufficient', async () => {
    const orderRes = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: 999999 }]);
    const orderId = orderRes.body.data.order.id;

    const res = await request(app).patch(`/api/orders/${orderId}/reserve`).set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Insufficient stock/);
  });

  it('10. Failed reservation changes nothing (atomic)', async () => {
    // Inventory shouldn't have changed for the above failed request
    const orderRes = await createOrder(salesToken, [
      { itemId: seededItemId, locationId: loc1Id, quantity: 1 }, // this item has stock
      { itemId: seededItem2Id, locationId: loc2Id, quantity: 999999 } // this item doesn't
    ]);
    const orderId = orderRes.body.data.order.id;

    const res = await request(app).patch(`/api/orders/${orderId}/reserve`).set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(409); // Multi-item all-or-nothing failed

    // Fetch the order to ensure it's still CREATED and no reserved quantity was set on item 1
    const orderCheck = await prisma.customerOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    expect(orderCheck?.status).toBe('CREATED');
    expect(orderCheck?.items[0].reservedQuantity).toBe(0);
  });

  it('11. Reserved quantity increases correctly & 12. Available quantity decreases', async () => {
    const invBefore = await prisma.inventory.findFirst({ where: { itemId: seededItemId, locationId: loc1Id } });
    const orderRes = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: 15 }]);
    const orderId = orderRes.body.data.order.id;

    await request(app).patch(`/api/orders/${orderId}/reserve`).set('Authorization', `Bearer ${salesToken}`);

    const invAfter = await prisma.inventory.findFirst({ where: { id: invBefore!.id } });
    expect(invAfter!.reservedQuantity).toBe(invBefore!.reservedQuantity + 15);
    // Physical shouldn't change
    expect(invAfter!.physicalQuantity).toBe(invBefore!.physicalQuantity);
    // Available decreases implicitly since reserved increased
    expect(invAfter!.physicalQuantity - invAfter!.reservedQuantity).toBe(
      (invBefore!.physicalQuantity - invBefore!.reservedQuantity) - 15
    );
  });

  it('13. Same order cannot be reserved twice', async () => {
    const orderRes = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: 5 }]);
    const orderId = orderRes.body.data.order.id;

    await request(app).patch(`/api/orders/${orderId}/reserve`).set('Authorization', `Bearer ${salesToken}`);
    const duplicateRes = await request(app).patch(`/api/orders/${orderId}/reserve`).set('Authorization', `Bearer ${salesToken}`);

    expect(duplicateRes.status).toBe(409);
  });

  it('18. Concurrent reservations cannot exceed available stock', async () => {
    // Determine how much is available
    const rows = await prisma.inventory.findMany({ where: { itemId: seededItemId, locationId: loc1Id } });
    const available = rows.reduce((s, r) => s + r.physicalQuantity - r.reservedQuantity, 0);

    // Create two orders that each require almost all stock
    const qty = Math.floor(available * 0.75); // two of these will exceed available
    const o1 = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: qty }]);
    const o2 = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: qty }]);

    // Try reserving concurrently
    const [r1, r2] = await Promise.all([
      request(app).patch(`/api/orders/${o1.body.data.order.id}/reserve`).set('Authorization', `Bearer ${salesToken}`),
      request(app).patch(`/api/orders/${o2.body.data.order.id}/reserve`).set('Authorization', `Bearer ${salesToken}`)
    ]);

    const statuses = [r1.status, r2.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409); // one must fail
  });

  it('19. Multi-item reservation is all-or-nothing', async () => {
    // Already tested by test 10, but explicitly:
    const res = await createOrder(salesToken, [
      { itemId: seededItemId, locationId: loc1Id, quantity: 1 },
      { itemId: seededItem2Id, locationId: loc2Id, quantity: 99999 }
    ]);
    const reserveRes = await request(app).patch(`/api/orders/${res.body.data.order.id}/reserve`).set('Authorization', `Bearer ${salesToken}`);
    expect(reserveRes.status).toBe(409);
    
    // Check audit logs for this order -> should be 0
    const txCount = await prisma.inventoryTransaction.count({
      where: { referenceType: 'CustomerOrder', referenceId: res.body.data.order.id }
    });
    expect(txCount).toBe(0);
  });

  it('20. Reservation audit records are created', async () => {
    const res = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: 7 }]);
    const orderId = res.body.data.order.id;
    await request(app).patch(`/api/orders/${orderId}/reserve`).set('Authorization', `Bearer ${salesToken}`);

    const records = await prisma.inventoryTransaction.findMany({
      where: { referenceType: 'CustomerOrder', referenceId: orderId, type: 'RESERVATION' }
    });
    expect(records.length).toBeGreaterThan(0);
    expect(records.reduce((s, r) => s + r.quantity, 0)).toBe(7);
  });
});

// ─── Cancellation ─────────────────────────────────────────────────────────────
describe('PATCH /api/orders/:id/cancel', () => {
  it('14. Cancel releases reserved quantity', async () => {
    const res = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: 10 }]);
    const orderId = res.body.data.order.id;
    await request(app).patch(`/api/orders/${orderId}/reserve`).set('Authorization', `Bearer ${salesToken}`);

    const invBefore = await prisma.inventory.findFirst({ where: { itemId: seededItemId, locationId: loc1Id } });

    const cancelRes = await request(app).patch(`/api/orders/${orderId}/cancel`).set('Authorization', `Bearer ${salesToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.order.status).toBe('CANCELLED');

    const invAfter = await prisma.inventory.findFirst({ where: { id: invBefore!.id } });
    expect(invAfter!.reservedQuantity).toBe(invBefore!.reservedQuantity - 10);
  });

  it('15. Same order cannot be cancelled twice', async () => {
    const res = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: 5 }]);
    const orderId = res.body.data.order.id;
    await request(app).patch(`/api/orders/${orderId}/reserve`).set('Authorization', `Bearer ${salesToken}`);
    await request(app).patch(`/api/orders/${orderId}/cancel`).set('Authorization', `Bearer ${salesToken}`);

    const doubleCancelRes = await request(app).patch(`/api/orders/${orderId}/cancel`).set('Authorization', `Bearer ${salesToken}`);
    expect(doubleCancelRes.status).toBe(409);
  });

  it('16. Invalid status transitions rejected (cannot cancel CREATED directly)', async () => {
    const res = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: 5 }]);
    const cancelRes = await request(app).patch(`/api/orders/${res.body.data.order.id}/cancel`).set('Authorization', `Bearer ${salesToken}`);
    expect(cancelRes.status).toBe(409);
  });

  it('21. Release audit records are created', async () => {
    const res = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: 3 }]);
    const orderId = res.body.data.order.id;
    await request(app).patch(`/api/orders/${orderId}/reserve`).set('Authorization', `Bearer ${salesToken}`);
    await request(app).patch(`/api/orders/${orderId}/cancel`).set('Authorization', `Bearer ${salesToken}`);

    const records = await prisma.inventoryTransaction.findMany({
      where: { referenceType: 'CustomerOrder', referenceId: orderId, type: 'RELEASE' }
    });
    expect(records.length).toBeGreaterThan(0);
    expect(records.reduce((s, r) => s + r.quantity, 0)).toBe(3);
  });
});

// ─── Completion ───────────────────────────────────────────────────────────────
describe('PATCH /api/orders/:id/complete', () => {
  it('17. Completing an order works only from RESERVED', async () => {
    // 1. Try completing from CREATED (should fail)
    const o1 = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: 5 }]);
    const failRes = await request(app).patch(`/api/orders/${o1.body.data.order.id}/complete`).set('Authorization', `Bearer ${salesToken}`);
    expect(failRes.status).toBe(409);

    // 2. Reserve and then complete (should succeed)
    await request(app).patch(`/api/orders/${o1.body.data.order.id}/reserve`).set('Authorization', `Bearer ${salesToken}`);
    const compRes = await request(app).patch(`/api/orders/${o1.body.data.order.id}/complete`).set('Authorization', `Bearer ${salesToken}`);
    expect(compRes.status).toBe(200);
    expect(compRes.body.data.order.status).toBe('COMPLETED');
  });

  it('22. Completion deducts physical and reserved quantity and creates OUTBOUND records', async () => {
    const invBefore = await prisma.inventory.findFirst({ where: { itemId: seededItemId, locationId: loc1Id } });

    const orderRes = await createOrder(salesToken, [{ itemId: seededItemId, locationId: loc1Id, quantity: 10 }]);
    const orderId = orderRes.body.data.order.id;

    // Reserve
    await request(app).patch(`/api/orders/${orderId}/reserve`).set('Authorization', `Bearer ${salesToken}`);

    // Complete
    await request(app).patch(`/api/orders/${orderId}/complete`).set('Authorization', `Bearer ${salesToken}`);

    const invAfter = await prisma.inventory.findFirst({ where: { id: invBefore!.id } });
    
    // Physical should be reduced by 10
    expect(invAfter!.physicalQuantity).toBe(invBefore!.physicalQuantity - 10);
    // Reserved should be back to what it was before (increased by 10 on reserve, decreased by 10 on complete)
    expect(invAfter!.reservedQuantity).toBe(invBefore!.reservedQuantity);

    // Audit check
    const records = await prisma.inventoryTransaction.findMany({
      where: { referenceType: 'CustomerOrder', referenceId: orderId, type: 'OUTBOUND' }
    });
    expect(records.length).toBeGreaterThan(0);
    expect(records.reduce((s, r) => s + r.quantity, 0)).toBe(10);
  });
});
