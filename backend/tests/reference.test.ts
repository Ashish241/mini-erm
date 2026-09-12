import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { execSync } from 'child_process';

const VALID_PASSWORD = 'password123';

describe('Reference Endpoints', () => {
  let token: string;

  beforeAll(async () => {
    execSync('npx tsx prisma/seed.ts', { stdio: 'ignore' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@erp.com', password: VALID_PASSWORD });
    token = res.body.data.token;
  });

  it('GET /api/reference/items returns list of items', async () => {
    const res = await request(app).get('/api/reference/items').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0]).toHaveProperty('id');
    expect(res.body.data.items[0]).toHaveProperty('name');
    expect(res.body.data.items[0]).toHaveProperty('category');
  });

  it('GET /api/reference/locations returns list of locations', async () => {
    const res = await request(app).get('/api/reference/locations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.locations)).toBe(true);
    expect(res.body.data.locations.length).toBeGreaterThan(0);
    expect(res.body.data.locations[0]).toHaveProperty('code');
  });

  it('GET /api/reference/categories returns list of categories', async () => {
    const res = await request(app).get('/api/reference/categories').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.categories)).toBe(true);
    expect(res.body.data.categories.length).toBeGreaterThan(0);
  });

  it('GET /api/reference/users returns list of assignable users', async () => {
    const res = await request(app).get('/api/reference/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.users.length).toBeGreaterThan(0);
    expect(res.body.data.users[0]).toHaveProperty('id');
    expect(res.body.data.users[0]).toHaveProperty('role');
    // Ensure SALES users are not included
    const hasSalesUser = res.body.data.users.some((u: any) => u.role === 'SALES');
    expect(hasSalesUser).toBe(false);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/reference/items');
    expect(res.status).toBe(401);
  });
});
