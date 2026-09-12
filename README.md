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
