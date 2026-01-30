# MVP Specification

## Overview
Civic Platform MVP - A comprehensive civic engagement and management platform.

## Core Features

### 1. Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Multi-tenant support
- User management

### 2. Tenant Management
- Tenant creation and bootstrap
- Tenant-specific data isolation
- Tenant settings

### 3. User Management
- User CRUD operations
- Role assignment
- Tenant-scoped users

### 4. Audit Logging
- Operation tracking
- User activity logs
- System events

## Technical Stack

### Backend
- NestJS
- GraphQL (Apollo)
- Prisma ORM
- PostgreSQL (SQLite for dev)

### Frontend
- Next.js 14
- React
- TypeScript
- Tailwind CSS

## MVP Scope
- Basic authentication flow
- User and tenant management
- Audit logging
- Role-based permissions
