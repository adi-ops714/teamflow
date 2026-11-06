# TeamFlow — Full-stack project management MVP

A runnable TypeScript monorepo with:
- React + Vite frontend
- Express + TypeScript API
- PostgreSQL + Prisma
- JWT authentication
- Organizations and memberships
- Projects and Kanban-style tasks
- Task comments and activity log
- Dashboard summaries
- Role checks (`OWNER`, `ADMIN`, `MEMBER`)

## Requirements
- Node.js 20+
- Docker Desktop (recommended) OR a local PostgreSQL instance
- npm

## 1. Configure environment

Copy `.env.example` to `apps/api/.env`. The API and Prisma commands run from `apps/api`, so this is where the environment file is loaded.

For the simplest local setup:

```bash
cp .env.example apps/api/.env
```

On Windows PowerShell:
```powershell
Copy-Item .env.example apps/api/.env
```

## 2. Start PostgreSQL

```bash
docker compose up -d db
```

## 3. Install dependencies

```bash
npm install
```

## 4. Prepare database

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## 5. Run the app

```bash
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:4000  
Health check: http://localhost:4000/health

## Demo account
After seeding:
- Email: `demo@teamflow.local`
- Password: `Password123!`

## Project layout

```text
teamflow/
  apps/
    api/       Express API + Prisma
    web/       React frontend
  docker-compose.yml
  package.json
  .env.example
```

## Notes
- This is a complete local MVP, not a production-hardened SaaS.
- Before public deployment, set strong secrets, configure HTTPS/CORS, add rate limiting, email verification, password reset, upload storage, backups, monitoring and automated tests.
- The seed script creates a demo organization, project and tasks.
