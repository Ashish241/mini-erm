# Mini Operations ERP

A full-stack technical case study for an Operations ERP system.

## Business Flow
Inventory → Work Order → Material Stock Check → Internal Transfer/Shortage → Customer Order Reservation

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS (v4)
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Testing**: Vitest, Supertest

## Project Setup & How to Run

### 1. Project Setup
Clone the repository and install all dependencies for both frontend and backend from the root:
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the `backend` directory. You can copy the provided `.env.example` file.
You must set your PostgreSQL connection string.
```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/mini_erp?schema=public"
JWT_SECRET="super-secret-jwt-key"
```

### 3. Database Setup
In the `backend` directory, initialize the database and run migrations to create the tables. If you are using a fresh/empty database, you can simply push the schema:
```bash
cd backend
npx prisma db push
```
*(If you need to execute specific migrations locally, run `npx prisma migrate dev` instead).*

Next, seed the database with initial users (admin, ops, sales), locations, categories, and inventory:
```bash
npx prisma db seed
```

### 4. How to Run (Development)
Run the following command from the **root** of the repository to start both the frontend and backend development servers concurrently:
```bash
npm run dev
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **Swagger Documentation**: `http://localhost:3001/api-docs`

## How to Test
The backend uses **Vitest** and **Supertest** for comprehensive integration and unit testing.

To run the backend tests:
```bash
cd backend
npm run test
```
To run tests in watch mode during development:
```bash
npm run test:watch
```

## Database Schema & ER Diagram

The database is built on PostgreSQL using Prisma ORM. An interactive Mermaid ER diagram mapping out all tables, relationships, and cardinalities is available at:
👉 **[docs/erd.md](docs/erd.md)**

### Schema Overview

| Domain | Models | Description |
|--------|--------|-------------|
| **Core** | `User`, `Location`, `Category`, `Item`, `Batch` | Foundational reference data. `User` supports RBAC (`ADMIN`, `OPERATIONS`, `SALES`). `Location` and `Item` form the basis of all inventory tracking. |
| **Inventory** | `Inventory`, `InventoryTransaction` | Real-time stock levels. `Inventory` uniquely tracks physical and reserved quantities by `[itemId, locationId, batchId]`. `InventoryTransaction` serves as an immutable, append-only audit log. |
| **Manufacturing** | `WorkOrder`, `WorkOrderMaterial` | Tracks production. Deducts required `WorkOrderMaterial` items and increases stock of the target `Item` upon completion. |
| **Logistics** | `Transfer` | Two-step warehouse-to-warehouse transfers (`DISPATCHED` → `RECEIVED`) to prevent stock anomalies in transit. |
| **Sales** | `CustomerOrder`, `CustomerOrderItem` | External orders. Uses explicit stock reservation to safely lock and reserve inventory before final deduction. |

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

## Deployment

To deploy the backend to a production environment (like Render, Heroku, or AWS):

1. **Environment Variables**:
   Set the following variables in your production environment:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `JWT_SECRET`: A secure, random string for signing tokens.
   - `JWT_EXPIRES_IN`: (Optional) Token expiration time (e.g., `8h`).
   - `PORT`: Automatically provided by the hosting platform, or specify your own.
   - `FRONTEND_URL`: (Optional) The URL of your deployed frontend to properly restrict CORS (defaults to `*`).

2. **Build the Backend**:
   Run the TypeScript compiler to generate the `/dist` output:
   ```bash
   npm run build
   ```

3. **Database Migration**:
   Run the database schema migrations against your production database:
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the Server**:
   Start the compiled Node.js application:
   ```bash
   npm run start
   # (Which executes: node dist/index.js)
   ```

5. **API Documentation**:
   Once deployed, the interactive API documentation is publicly available at:
   - **Swagger UI**: `https://<your-backend-domain>/api-docs`
   - **OpenAPI JSON**: `https://<your-backend-domain>/api-docs.json`

