# MediAid Backend - Comprehensive System Documentation

## Table of Contents

1. [System Architecture Overview](./01-system-architecture.md)
2. [Database Schema & Models](./02-database-schema.md)
3. [Complete API Reference](./03-api-reference.md)
4. [Permissions & Authorization System](./04-permissions-authorization.md)
5. [Business Logic & Workflow Flows](./05-workflow-flows.md)
6. [Quick Reference & Index](./06-quick-reference.md)

---

## Project Quick Info

- **Framework**: NestJS 11 (TypeScript)
- **Database**: PostgreSQL 15 + PostGIS
- **Authentication**: JWT (Passport)
- **Real-time**: Socket.IO
- **File Storage**: Cloudinary
- **API Documentation**: Swagger at `http://localhost:3000/api`

## Key Features

- Role-based access control (Admin/User/Pharmacist)
- Spatial/geographic queries with PostGIS
- Real-time order chat via WebSockets
- Emergency medicine smart matching algorithm
- Stock-safe ordering with transactional guarantees
- Community help platform (KafuPosts)
- Medicine usage tracking
