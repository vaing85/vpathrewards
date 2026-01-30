# Deployment Checklist

## Pre-Deployment

### Environment Setup
- [ ] Create production environment variables file
- [ ] Set `NEXT_PUBLIC_API_URL` to production API endpoint
- [ ] Configure database connection string
- [ ] Set JWT secret key (strong, random)
- [ ] Configure CORS allowed origins
- [ ] Set up SSL/TLS certificates

### Database
- [ ] Run all Prisma migrations
- [ ] Seed initial data (if needed)
- [ ] Verify database backups are configured
- [ ] Test database connection

### Build & Test
- [ ] Run `npm run build` for both API and Web
- [ ] Verify no build errors
- [ ] Test production build locally
- [ ] Run type checking: `npm run type-check`
- [ ] Run linting: `npm run lint`

### Security
- [ ] Review authentication/authorization
- [ ] Verify all routes are protected
- [ ] Check for exposed secrets in code
- [ ] Review CORS settings
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags (if applicable)
- [ ] Review rate limiting (if implemented)

### Frontend Specific
- [ ] Verify all pages load correctly
- [ ] Test error boundaries work
- [ ] Test 404 page
- [ ] Verify authentication flow
- [ ] Test all CRUD operations
- [ ] Check responsive design on mobile
- [ ] Verify loading states
- [ ] Test error handling

### Backend Specific
- [ ] Verify GraphQL schema is correct
- [ ] Test all queries and mutations
- [ ] Verify tenant scoping works
- [ ] Test audit logging
- [ ] Verify file uploads (if applicable)

## Deployment

### Infrastructure
- [ ] Set up production server/hosting
- [ ] Configure reverse proxy (nginx, etc.)
- [ ] Set up process manager (PM2, systemd, etc.)
- [ ] Configure auto-restart on failure
- [ ] Set up log rotation

### Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure application monitoring
- [ ] Set up uptime monitoring
- [ ] Configure alerting for critical errors
- [ ] Set up performance monitoring

### Backup & Recovery
- [ ] Configure automated database backups
- [ ] Test backup restoration process
- [ ] Document recovery procedures

## Post-Deployment

### Verification
- [ ] Test login/logout
- [ ] Test all major features
- [ ] Verify API endpoints are accessible
- [ ] Check GraphQL Playground (if enabled)
- [ ] Verify audit logs are being created
- [ ] Test user management
- [ ] Verify dashboard statistics load

### Documentation
- [ ] Update deployment documentation
- [ ] Document environment variables
- [ ] Document troubleshooting steps
- [ ] Create runbook for common issues

## Rollback Plan
- [ ] Document rollback procedure
- [ ] Keep previous version available
- [ ] Test rollback process

## Notes
- Keep development and production environments separate
- Never commit `.env` files
- Use environment-specific configuration
- Monitor logs after deployment
- Have a rollback plan ready

