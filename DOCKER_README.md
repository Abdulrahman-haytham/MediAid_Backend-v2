# Mid Aid Backend - Docker Setup

This setup provides a complete environment for running the Mid Aid Backend with PostgreSQL and Redis (for future queue/cache usage).

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Running the Application

1. **Create .env file:**
   Ensure you have a `.env` file in the root directory. You can copy `.env.example`:
   ```bash
   cp .env.example .env
   ```
   **Important:** Update `DB_HOST` to `postgres` in your `.env` file when running via Docker Compose.

2. **Start Services:**
   ```bash
   docker-compose up --build
   ```

3. **Access API:**
   The API will be available at `http://localhost:3000`.
   Swagger Documentation: `http://localhost:3000/api`.

## Services

- **app**: The NestJS application (Port 3000).
- **postgres**: PostgreSQL database (Port 5432).
- **redis**: Redis store (Port 6379) - Ready for future caching/queues.

## Useful Commands

- **Stop containers:** `docker-compose down`
- **View logs:** `docker-compose logs -f`
