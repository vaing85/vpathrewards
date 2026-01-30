# Architecture Documentation

## System Architecture

```
┌─────────────────┐
│   Next.js Web   │  Frontend Application
│   (Port 3000)   │
└────────┬────────┘
         │
         │ HTTP/GraphQL
         │
┌────────▼────────┐
│  NestJS API     │  Backend API
│  (Port 3001)    │
└────────┬────────┘
         │
         │ Prisma ORM
         │
┌────────▼────────┐
│   PostgreSQL    │  Database
│   (Port 5432)   │
└─────────────────┘
```

## Project Structure

```
civic-platform/
├── apps/
│   ├── api/              # Backend (NestJS + GraphQL)
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules
│   │   │   ├── common/   # Shared utilities
│   │   │   └── prisma/   # Database service
│   │   └── prisma/       # Database schema
│   │
│   └── web/              # Frontend (Next.js)
│       └── src/
│           └── app/      # Next.js app router
│
├── packages/
│   └── shared/           # Shared types, constants
│       └── src/
│           └── types/    # TypeScript types
│
├── infra/
│   └── docker/           # Docker configurations
│
└── docs/                 # Documentation
```

## Module Structure (Backend)

### Auth Module
- JWT authentication
- Login/logout
- Token validation

### Users Module
- User CRUD operations
- Tenant-scoped queries

### Tenants Module
- Tenant management
- Bootstrap functionality

### RBAC Module
- Role management
- Permission checking

### Audit Module
- Activity logging
- Event tracking

## Data Flow

1. **Authentication Flow**
   - User submits credentials
   - Backend validates and issues JWT
   - Frontend stores token
   - Token included in subsequent requests

2. **Authorization Flow**
   - Request includes JWT token
   - Backend validates token
   - RBAC checks user roles
   - Access granted/denied

3. **Data Isolation**
   - All queries filtered by tenantId
   - Users can only access their tenant's data
   - Admin can manage multiple tenants

## Security Considerations

- JWT tokens with expiration
- Password hashing (bcrypt)
- Role-based access control
- Tenant data isolation
- Audit logging for compliance

## Technology Choices

### Backend
- **NestJS**: Enterprise-grade Node.js framework
- **GraphQL**: Flexible API with type safety
- **Prisma**: Type-safe database ORM
- **PostgreSQL**: Reliable relational database

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
