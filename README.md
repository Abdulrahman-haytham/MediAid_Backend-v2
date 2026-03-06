# Mid Aid Backend

NestJS backend for Mid Aid services.

## Requirements

- Node.js 20+
- pnpm 9+
- PostgreSQL

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Create local environment file:

```bash
cp .env.example .env
```

3. Update `.env` values for your machine.

4. Run development server:

```bash
pnpm run start:dev
```

## Useful Scripts

- `pnpm run build` build the project
- `pnpm run start:dev` run in watch mode
- `pnpm run test` run unit tests
- `pnpm run test:e2e` run e2e tests
- `pnpm run demo:user` create demo user (requires running server)
- `pnpm run files:list` generate `project_files.txt` (ignored by git)

## Docker

If you want Docker setup, use:

- [DOCKER_README.md](./DOCKER_README.md)
- `Dockerfile`
- `docker-compose.yml`

## Security Notes

- Never commit `.env`.
- Keep production secrets (JWT, SMTP, Cloudinary, DB password) outside git.
- `.env.example` contains placeholders only.

## Push To GitHub

```bash
git add .
git commit -m "chore: prepare backend for github"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```

If `origin` already exists:

```bash
git remote set-url origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```

