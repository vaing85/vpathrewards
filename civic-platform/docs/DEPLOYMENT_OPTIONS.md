# Deployment Options Guide

This guide outlines various deployment options for the Civic Platform application.

## Architecture Overview

Your application consists of:
- **Frontend**: Next.js 14 (React) application
- **Backend**: NestJS API with GraphQL
- **Database**: PostgreSQL (production) / SQLite (development)
- **Monorepo**: npm workspaces structure

---

## Option 1: Platform-as-a-Service (PaaS) - Recommended for Quick Start

### 1.1 Vercel (Frontend) + Railway/Render (Backend)

**Best for**: Fastest deployment, minimal configuration

**Frontend (Vercel)**:
- ✅ Zero-config Next.js deployment
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic deployments from Git
- ✅ Free tier available
- ✅ Built-in analytics

**Backend (Railway/Render)**:
- ✅ Easy PostgreSQL setup
- ✅ Automatic deployments
- ✅ Environment variable management
- ✅ Free tier available (Railway)
- ✅ Auto-scaling

**Setup Steps**:
1. Connect GitHub repo to Vercel
2. Set `NEXT_PUBLIC_API_URL` environment variable
3. Deploy backend to Railway/Render
4. Configure CORS on backend
5. Deploy!

**Cost**: Free tier available, ~$5-20/month for small scale

---

### 1.2 Render (Full Stack)

**Best for**: Simple full-stack deployment

**Features**:
- ✅ Deploy both frontend and backend
- ✅ Managed PostgreSQL
- ✅ Automatic SSL
- ✅ Zero-downtime deployments
- ✅ Free tier available

**Setup**:
1. Create Web Service for backend
2. Create Static Site for frontend (or Web Service)
3. Add PostgreSQL database
4. Configure environment variables
5. Deploy!

**Cost**: Free tier available, ~$7-25/month

---

### 1.3 Heroku

**Best for**: Traditional PaaS, well-documented

**Features**:
- ✅ Easy deployment via Git
- ✅ Add-ons for PostgreSQL
- ✅ Environment config management
- ⚠️ No free tier (paid only now)

**Setup**:
1. Install Heroku CLI
2. Create two apps (frontend + backend)
3. Add PostgreSQL addon
4. Configure buildpacks
5. Deploy via Git

**Cost**: ~$7-25/month per dyno

---

## Option 2: Cloud Providers (IaaS)

### 2.1 AWS (Amazon Web Services)

**Best for**: Enterprise scale, maximum control

**Services**:
- **Frontend**: AWS Amplify or S3 + CloudFront
- **Backend**: EC2, ECS (Docker), or Lambda
- **Database**: RDS PostgreSQL
- **Load Balancer**: Application Load Balancer

**Architecture**:
```
CloudFront → S3 (Frontend)
           ↓
Application Load Balancer → ECS/EC2 (Backend)
           ↓
RDS PostgreSQL
```

**Pros**:
- ✅ Highly scalable
- ✅ Global infrastructure
- ✅ Comprehensive services
- ✅ Enterprise-grade security

**Cons**:
- ❌ Complex setup
- ❌ Steeper learning curve
- ❌ Can be expensive

**Cost**: ~$50-200/month (varies significantly)

---

### 2.2 Google Cloud Platform (GCP)

**Best for**: Modern cloud-native apps

**Services**:
- **Frontend**: Cloud Run or App Engine
- **Backend**: Cloud Run (containerized)
- **Database**: Cloud SQL (PostgreSQL)
- **CDN**: Cloud CDN

**Pros**:
- ✅ Excellent container support
- ✅ Good developer experience
- ✅ Competitive pricing

**Cost**: ~$30-150/month

---

### 2.3 Microsoft Azure

**Best for**: Enterprise integration, Windows ecosystem

**Services**:
- **Frontend**: Azure Static Web Apps or App Service
- **Backend**: Azure App Service or Container Instances
- **Database**: Azure Database for PostgreSQL

**Pros**:
- ✅ Enterprise features
- ✅ Good Windows integration
- ✅ Comprehensive tooling

**Cost**: ~$50-200/month

---

### 2.4 DigitalOcean

**Best for**: Simple, affordable VPS

**Services**:
- **Droplets**: Virtual servers for backend
- **App Platform**: PaaS option
- **Managed Databases**: PostgreSQL

**Architecture**:
```
App Platform (Frontend) or Droplet
           ↓
Droplet (Backend API)
           ↓
Managed PostgreSQL
```

**Pros**:
- ✅ Simple pricing
- ✅ Good documentation
- ✅ Affordable
- ✅ Predictable costs

**Cost**: ~$12-50/month

---

## Option 3: Containerization (Docker)

### 3.1 Docker Compose (Self-Hosted)

**Best for**: On-premise or VPS deployment

**Setup**:
1. Create Dockerfiles for frontend and backend
2. Create docker-compose.yml
3. Deploy to any server with Docker

**Pros**:
- ✅ Consistent environments
- ✅ Easy local development
- ✅ Portable
- ✅ Can deploy anywhere

**Cons**:
- ❌ Need to manage server
- ❌ Need to handle SSL/domain

---

### 3.2 Kubernetes (K8s)

**Best for**: Large scale, microservices

**Platforms**:
- Google Kubernetes Engine (GKE)
- Amazon EKS
- Azure AKS
- DigitalOcean Kubernetes

**Pros**:
- ✅ Auto-scaling
- ✅ High availability
- ✅ Service discovery
- ✅ Load balancing

**Cons**:
- ❌ Complex setup
- ❌ Requires expertise
- ❌ Overkill for small apps

---

## Option 4: Serverless

### 4.1 AWS Lambda + API Gateway

**Best for**: Cost-effective, auto-scaling

**Architecture**:
- Frontend: S3 + CloudFront
- Backend: Lambda functions (NestJS can be adapted)
- Database: RDS or DynamoDB

**Pros**:
- ✅ Pay per use
- ✅ Auto-scaling
- ✅ No server management

**Cons**:
- ❌ Cold starts
- ❌ NestJS adaptation needed
- ❌ Complex setup

---

### 4.2 Vercel Serverless Functions

**Best for**: Next.js API routes

**Note**: Your backend is separate NestJS app, so this would require restructuring.

---

## Option 5: Hybrid Approaches

### 5.1 Frontend on CDN + Backend on VPS

**Example**:
- Frontend: Netlify/Vercel (CDN)
- Backend: DigitalOcean Droplet
- Database: Managed PostgreSQL

**Pros**:
- ✅ Fast frontend delivery
- ✅ Control over backend
- ✅ Cost-effective

---

## Recommended Deployment Paths

### 🚀 Quick Start (Recommended for MVP)

**Option**: Vercel (Frontend) + Railway (Backend)

**Why**:
- Fastest to deploy
- Minimal configuration
- Free tiers available
- Automatic HTTPS
- Git-based deployments

**Steps**:
1. Deploy backend to Railway
2. Deploy frontend to Vercel
3. Configure environment variables
4. Done!

---

### 🏢 Production (Recommended for Scale)

**Option**: AWS or GCP with Docker

**Why**:
- Scalable
- Reliable
- Enterprise features
- Professional support

**Architecture**:
- Frontend: CloudFront + S3 (AWS) or Cloud CDN (GCP)
- Backend: ECS/Cloud Run (containerized)
- Database: RDS/Cloud SQL (managed PostgreSQL)

---

### 💰 Budget-Conscious

**Option**: DigitalOcean App Platform

**Why**:
- Simple pricing
- All-in-one solution
- Good performance
- Affordable

---

## Deployment Checklist by Option

### For PaaS (Vercel + Railway/Render)

**Backend**:
- [ ] Create account on Railway/Render
- [ ] Connect GitHub repository
- [ ] Add PostgreSQL database
- [ ] Set environment variables:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `PORT=3001`
  - `NODE_ENV=production`
- [ ] Configure CORS to allow frontend domain
- [ ] Deploy and get backend URL

**Frontend**:
- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Set environment variables:
  - `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
- [ ] Deploy

---

### For VPS (DigitalOcean, AWS EC2, etc.)

**Server Setup**:
- [ ] Provision server (Ubuntu 22.04 recommended)
- [ ] Install Node.js 18+
- [ ] Install PostgreSQL
- [ ] Install Nginx (reverse proxy)
- [ ] Install PM2 (process manager)
- [ ] Set up SSL with Let's Encrypt
- [ ] Configure firewall

**Application Deployment**:
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Build applications
- [ ] Run database migrations
- [ ] Configure environment variables
- [ ] Start with PM2
- [ ] Configure Nginx
- [ ] Set up auto-restart

---

### For Docker

**Setup**:
- [ ] Create Dockerfile for backend
- [ ] Create Dockerfile for frontend
- [ ] Create docker-compose.yml
- [ ] Configure environment variables
- [ ] Build and run containers
- [ ] Set up reverse proxy (Nginx/Traefik)
- [ ] Configure SSL

---

## Environment Variables Reference

### Backend (.env)
```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# JWT
JWT_SECRET="your-strong-secret-key-here"

# Server
PORT=3001
NODE_ENV=production

# CORS (if needed)
CORS_ORIGIN="https://your-frontend-domain.com"
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL="https://your-backend-domain.com"
```

---

## Database Migration Strategy

### Production Database Setup

1. **Create Database**:
   ```bash
   # On managed database or server
   createdb civic_platform_prod
   ```

2. **Run Migrations**:
   ```bash
   cd apps/api
   npm run prisma:migrate deploy
   ```

3. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate
   ```

4. **Seed (Optional)**:
   ```bash
   npm run prisma:seed
   ```

---

## SSL/HTTPS Setup

### Automatic (PaaS)
- Vercel, Railway, Render: Automatic SSL
- No configuration needed

### Manual (VPS)
- Use Let's Encrypt with Certbot
- Configure Nginx to use SSL certificates
- Set up auto-renewal

---

## Monitoring & Logging

### Recommended Tools

**Error Tracking**:
- Sentry (free tier available)
- Rollbar
- Bugsnag

**Application Monitoring**:
- New Relic
- Datadog
- AppDynamics

**Uptime Monitoring**:
- UptimeRobot (free)
- Pingdom
- StatusCake

**Logging**:
- Papertrail
- Loggly
- CloudWatch (AWS)

---

## Cost Estimates

### Small Scale (< 1000 users)
- **Vercel + Railway**: $0-20/month
- **Render**: $7-25/month
- **DigitalOcean**: $12-30/month
- **AWS (minimal)**: $30-50/month

### Medium Scale (1000-10,000 users)
- **Vercel + Railway**: $20-100/month
- **Render**: $50-150/month
- **DigitalOcean**: $50-200/month
- **AWS**: $100-300/month

### Large Scale (10,000+ users)
- **AWS/GCP**: $300-1000+/month
- **Kubernetes**: $500-2000+/month

---

## Security Considerations

### All Deployments
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Regular security updates
- [ ] Database backups
- [ ] Environment variable security
- [ ] API key rotation

### Additional for VPS
- [ ] Firewall configuration
- [ ] SSH key authentication
- [ ] Regular system updates
- [ ] Fail2ban setup
- [ ] Intrusion detection

---

## CI/CD Options

### GitHub Actions (Recommended)
- Free for public repos
- Easy to set up
- Integrates with deployments

### GitLab CI/CD
- Built into GitLab
- Comprehensive features

### CircleCI / Travis CI
- Popular alternatives
- Good free tiers

---

## Next Steps

1. **Choose your deployment option** based on:
   - Budget
   - Technical expertise
   - Scale requirements
   - Timeline

2. **Set up staging environment** first
   - Test deployment process
   - Verify all features work
   - Test rollback procedures

3. **Deploy to production**
   - Follow deployment checklist
   - Monitor closely after deployment
   - Have rollback plan ready

---

## Need Help?

For specific deployment guides, see:
- `docs/DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- Platform-specific documentation
- Infrastructure setup guides (if created)

