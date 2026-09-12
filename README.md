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
3. Start the PostgreSQL database using Docker: `docker-compose up -d`.
4. Copy `.env.example` to `.env` in both `frontend` and `backend` directories and configure them.
5. In the `backend` directory, run database migrations (once Prisma is set up).
6. Run `npm run dev` from the root to start both frontend and backend development servers.
