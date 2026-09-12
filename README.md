# Mini Operations ERP

A full-stack technical case study for an Operations ERP system.

## Business Flow
Inventory → Work Order → Material Stock Check → Internal Transfer/Shortage → Customer Order Reservation

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Testing**: Vitest, Supertest

## Getting Started

1. Clone the repository.
2. Run `npm install` at the root to install all dependencies.
3. Update `.env` in the `backend` directory with your PostgreSQL connection URL. Make sure the database name is `mini_erp` (e.g. `postgresql://postgres:root@localhost:5432/mini_erp?schema=public`).
4. In the `backend` directory, initialize the database and run migrations:
   ```bash
   cd backend
   npx prisma db push --accept-data-loss
   npx prisma db execute --file prisma/migrations/20240101000001_unbatched_unique/migration.sql
   npm run prisma:generate
   ```
5. Seed the database with initial users and inventory:
   ```bash
   npx prisma db seed
   ```
6. Run `npm run dev` from the root to start both frontend and backend development servers.
7. Access the **API Documentation (Swagger UI)** at `http://localhost:3000/api/docs`.

## Customer Orders & Stock Reservation

The Customer Orders module implements a highly robust, concurrency-safe reservation architecture to prevent race conditions and overselling stock.

### Order Status Lifecycle
- **`CREATED`**: Order is created with item lines, but no stock is reserved.
- **`RESERVED`**: Order has successfully reserved stock. It can now be cancelled or completed.
- **`COMPLETED`**: Order is fulfilled. The originally reserved physical stock is permanently deducted, and audit logs are recorded.
- **`CANCELLED`**: Order is cancelled. The originally reserved stock is released back to available inventory.

### Reservation Transaction & Locking Strategy
To safely reserve stock across multiple concurrent requests without deadlocks or race conditions:
1. **Pessimistic Row-Level Locking**: The reservation process locks the `CustomerOrder` row and ALL affected `Inventory` rows simultaneously using `SELECT ... FOR UPDATE` inside a single Prisma `$transaction`.
2. **Pre-Flight Availability Check**: The total available quantity (physical - reserved) across all batches is calculated from the *locked* rows. If any item is short on stock, the entire transaction rolls back (`409 Conflict`), ensuring all-or-nothing multi-item reservations.
3. **Audit Truth**: Stock deductions for cancellation and completion rely strictly on querying the `InventoryTransaction` records of type `RESERVATION` for the order, providing absolute certainty about which batch rows were reserved.

### Batch Allocation Strategy
When multiple batches of the same item exist at a location, reservations are allocated deterministically using a **FIFO Strategy**:
- `Inventory` rows are queried and locked with `ORDER BY "itemId" ASC, "locationId" ASC, "createdAt" ASC`.
- The required reservation amount is greedily allocated to the oldest available batch first.
- This deterministic ordering also guarantees that concurrent reservations will always lock rows in exactly the same order, completely preventing deadlocks.

### API Endpoints
All endpoints enforce JWT Authentication.
- `POST /api/orders` (SALES only): Create a new order.
- `GET /api/orders` (ADMIN, OPERATIONS, SALES): List orders.
- `GET /api/orders/:id` (ADMIN, OPERATIONS, SALES): Get order details.
- `PATCH /api/orders/:id/reserve` (ADMIN, SALES): Lock and reserve stock.
- `PATCH /api/orders/:id/cancel` (ADMIN, SALES): Release reserved stock.
- `PATCH /api/orders/:id/complete` (ADMIN, SALES): Finalize order, deduct physical inventory.
