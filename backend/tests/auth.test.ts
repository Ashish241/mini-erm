import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/config/database';

// These tests rely on the seeded database users created by prisma/seed.ts
// Admin: admin@erp.com / password123
// Ops:   ops@erp.com   / password123
// Sales: sales@erp.com / password123

const ADMIN_EMAIL = 'admin@erp.com';
const OPS_EMAIL = 'ops@erp.com';
const SALES_EMAIL = 'sales@erp.com';
const VALID_PASSWORD = 'password123';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/auth/login', () => {
  it('should return 200 and a JWT token for a valid admin login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: VALID_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toMatchObject({
      email: ADMIN_EMAIL,
      role: 'ADMIN',
    });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('should return 401 for an invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 for a non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@erp.com', password: VALID_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for an invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: VALID_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toHaveProperty('email');
  });

  it('should return 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  let adminToken: string;
  let opsToken: string;
  let salesToken: string;

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: VALID_PASSWORD });
    adminToken = adminRes.body.data.token;

    const opsRes = await request(app)
      .post('/api/auth/login')
      .send({ email: OPS_EMAIL, password: VALID_PASSWORD });
    opsToken = opsRes.body.data.token;

    const salesRes = await request(app)
      .post('/api/auth/login')
      .send({ email: SALES_EMAIL, password: VALID_PASSWORD });
    salesToken = salesRes.body.data.token;
  });

  it('should return the authenticated user for a valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      email: ADMIN_EMAIL,
      role: 'ADMIN',
    });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('should return 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 for a malformed or invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.invalid');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return OPERATIONS role for ops user token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${opsToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('OPERATIONS');
  });

  it('should return SALES role for sales user token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('SALES');
  });
});
