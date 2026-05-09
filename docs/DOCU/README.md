# MediAid Backend v2

Production-oriented backend for a digital pharmacy and medical ordering platform, built with NestJS and PostgreSQL.

## Project Highlights

- Modular domain-driven architecture (`auth`, `users`, `pharmacies`, `products`, `cart`, `orders`, `emergency-orders`, `chat`, `upload`, `mail`).
- JWT authentication with role-based authorization (`admin`, `user`, `pharmacist`).
- Strong request validation with global `ValidationPipe`.
- Unified API response shape with global interceptor.
- Global error filter with correlation-id support for traceability.
- Security hardening with `helmet`, throttling, guarded upload endpoint, and environment-based secrets.
- Stock-safe ordering flow with transactional updates and DB-level locking.

## Tech Stack

- Framework: NestJS 11
- Language: TypeScript
- Database: PostgreSQL + TypeORM
- Auth: Passport JWT
- Validation: class-validator / class-transformer
- Docs: Swagger (OpenAPI)
- Realtime: Socket.IO (chat module)
- Infra: Docker + Docker Compose

## Architecture Overview

`src/modules/`
- `auth`: login and JWT strategy
- `user`: registration, profile, roles
- `pharmacy`: pharmacy profile, inventory, rating, discovery
- `product`: catalog management and favorites
- `cart`: user cart and item management
- `order`: order lifecycle and status transitions
- `emergencyOrder`: emergency smart matching flow
- `chat`: order-linked messaging
- `upload`: image/file upload integration
- `mail`: verification and password reset emails

`src/common/`
- guards, decorators, interceptors, filters, logger, scheduled jobs

## API Documentation

Run the service and open:
- `http://localhost:3000/api`

## Requirements

- Node.js 20+
- pnpm 9+
- PostgreSQL 14+

## Local Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` values.

4. Run in development:
```bash
pnpm run start:dev
```

## Environment Notes

- `.env` is ignored by git.
- `.env.example` contains placeholders only.
- `DB_SYNCHRONIZE` should remain `false` outside local experimentation.
- `JWT_SECRET` must be set; no weak fallback is used.

## Scripts

- `pnpm run start:dev`: development mode
- `pnpm run build`: build output to `dist`
- `pnpm run start:prod`: run production build
- `pnpm run lint`: lint source files
- `pnpm run test`: unit tests
- `pnpm run test:e2e`: end-to-end tests

## Docker

For containerized setup, see:
- [DOCKER_README.md](./DOCKER_README.md)
- `Dockerfile`
- `docker-compose.yml`

## Railway Deployment

For Railway, set these environment variables at minimum:
- `DATABASE_URL`
- `DB_SSL=true`
- `JWT_SECRET`

Optional integrations:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` for email flows
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` for uploads

Production behavior:
- The app listens on Railway's injected `PORT`.
- `/health` is available for health checks.
- On the first production start, the app bootstraps the current schema if the database is empty, then records the existing migrations as a baseline.
- On later starts, only pending migrations are applied.

## Engineering Notes

- Cart items enforce uniqueness per `(cart, product, pharmacy)`.
- Order creation runs in a transaction and reduces inventory atomically.
- Role/resource checks are enforced for order visibility and status updates.

## GitHub Push

```bash
git add .
git commit -m "chore: update project docs"
git push
```
