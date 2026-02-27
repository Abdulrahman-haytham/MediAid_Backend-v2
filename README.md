# Mid Aid Backend

NestJS backend for Mid Aid services.

## Requirements

- Node.js 20+
- pnpm 9+
- PostgreSQL

## Project Structure

- `src/` application source code
- `test/` end-to-end tests
- `scripts/` helper scripts

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update `.env` values for your local setup.

4. Run in development:

```bash
pnpm run start:dev
```

## Useful Scripts

- `pnpm run build` build project
- `pnpm run start:dev` run in watch mode
- `pnpm run test` run unit tests
- `pnpm run test:e2e` run e2e tests
- `pnpm run demo:user` create demo user (requires running server)
- `pnpm run files:list` list files and generate `project_files.txt`

## Prepare and Push to GitHub

```bash
git add .
git commit -m "chore: initial project setup"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```

If `origin` already exists:

```bash
git remote set-url origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```
