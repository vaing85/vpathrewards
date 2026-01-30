# Civic Platform

A comprehensive civic engagement and management platform built with NestJS and Next.js.

## Project Structure

```
civic-platform/
├── apps/
│   ├── api/              # Backend (NestJS + GraphQL)
│   └── web/              # Frontend (Next.js)
├── packages/
│   └── shared/           # Shared types, constants
├── infra/
│   └── docker/           # Postgres, Redis later
├── docs/
│   ├── MVP_SPEC.md
│   ├── DEV_TASKS.md
│   └── ARCHITECTURE.md
├── .cursorrules
├── package.json          # Optional monorepo tooling
└── README.md
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (for database)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Copy .env.example files and configure
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

3. Set up the database:
```bash
cd apps/api
npm run prisma:generate
npm run prisma:migrate
```

### Development

Run all services in development mode:
```bash
npm run dev
```

Run specific services:
```bash
npm run dev:api    # API only
npm run dev:web    # Web only
```

### Building

Build all packages:
```bash
npm run build
```

Build specific packages:
```bash
npm run build:api
npm run build:web
```

## API Documentation

Once the API is running, Swagger documentation is available at:
- http://localhost:3001/api/docs

## Frontend Features

The frontend application includes:

- **Authentication**: Login system with JWT token management
- **Dashboard**: Statistics overview and recent activity feed
- **Core Modules**: Full CRUD operations for:
  - Citations
  - Violations & Violation Types
  - Cases
  - Hearings
  - Payments
  - Documents
- **User Management**: Create, edit, and manage users
- **Audit Logs**: View system activity and audit trails
- **Settings**: User profile management

## Frontend Development

### Environment Variables

Create a `.env.local` file in `apps/web/`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Running the Frontend

```bash
cd apps/web
npm install
npm run dev
```

The frontend will be available at http://localhost:3000

### Building for Production

```bash
cd apps/web
npm run build
npm start
```

## Tech Stack

- **Backend**: NestJS, TypeScript, Prisma, SQLite (dev) / PostgreSQL (prod)
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Apollo Client
- **GraphQL**: Apollo Server (backend), Apollo Client (frontend)
- **Monorepo**: npm workspaces

## Testing

### Backend Testing
See `docs/TESTING_GUIDE.md` for comprehensive testing instructions.

### Frontend Testing
1. Start the backend API: `cd apps/api && npm run start:dev`
2. Start the frontend: `cd apps/web && npm run dev`
3. Navigate to http://localhost:3000
4. Login with test credentials (see backend testing guide)
5. Test all modules and features

## Deployment

### Quick Start (Recommended)

For the fastest deployment, see: `docs/DEPLOYMENT_QUICK_START.md`

**Recommended**: Deploy to Vercel (Frontend) + Railway (Backend)
- ⏱️ 15-30 minutes setup
- 💰 $0-20/month
- ✅ Automatic HTTPS
- ✅ Git-based deployments

### All Deployment Options

See comprehensive guides:
- `docs/DEPLOYMENT_OPTIONS.md` - All deployment options explained
- `docs/DEPLOYMENT_COMPARISON.md` - Quick comparison table
- `docs/DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `docs/DEPLOYMENT_SUMMARY.md` - Overview and decision guide

### Docker Deployment

Ready-to-use Docker configuration:
```bash
docker-compose up -d
```

See `docker-compose.yml` and Dockerfiles in `apps/api/` and `apps/web/`

## License

Private

