# Deployment Guide - V PATHing Rewards

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env` in backend
- [ ] Set `NODE_ENV=production`
- [ ] Generate secure `JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Configure production `FRONTEND_URL`
- [ ] Set up production SMTP email service
- [ ] Configure CORS for production domain

### 2. Security
- [ ] Change default admin password
- [ ] Review and update rate limits
- [ ] Verify security headers
- [ ] Enable HTTPS/SSL
- [ ] Review API authentication

### 3. Database
- [ ] Backup development database
- [ ] Set up production database
- [ ] Run database migrations
- [ ] Verify indexes are created
- [ ] Set up database backups

### 4. Build & Test
- [ ] Build backend: `cd backend && npm run build`
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Test production builds locally
- [ ] Verify all API endpoints work
- [ ] Test critical user flows

---

## Deployment Options

### Option 1: VPS/Cloud Server (Recommended for MVP)

#### Requirements
- Node.js 18+ installed
- PM2 for process management
- Nginx for reverse proxy
- SSL certificate (Let's Encrypt)

#### Steps

1. **Server Setup**
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt-get install nginx
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd cashback-app
   
   # Install dependencies
   cd backend && npm install --production
   cd ../frontend && npm install
   
   # Build
   cd ../backend && npm run build
   cd ../frontend && npm run build
   ```

3. **Configure Environment**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with production values
   
   # Start with PM2
   pm2 start dist/server.js --name cashback-backend
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx**
   ```nginx
   # /etc/nginx/sites-available/cashback-app
   server {
       listen 80;
       server_name yourdomain.com;
       
       # Frontend
       location / {
           root /path/to/cashback-app/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
       
       # Backend API
       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **SSL Setup (Let's Encrypt)**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

### Option 2: Platform as a Service (PaaS)

#### Heroku

1. **Install Heroku CLI**
2. **Create apps**
   ```bash
   heroku create cashback-backend
   heroku create cashback-frontend
   ```

3. **Deploy Backend**
   ```bash
   cd backend
   heroku git:remote -a cashback-backend
   git push heroku main
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-secret
   ```

4. **Deploy Frontend**
   ```bash
   cd frontend
   # Use buildpack or static hosting
   ```

#### Railway / Render / Fly.io
- Similar process to Heroku
- Check platform-specific documentation

---

### Option 3: Static Hosting + Serverless

#### Frontend: Vercel/Netlify
```bash
# Vercel
npm i -g vercel
cd frontend
vercel

# Netlify
npm i -g netlify-cli
cd frontend
netlify deploy --prod
```

#### Backend: Serverless Functions
- Convert Express routes to serverless functions
- Use AWS Lambda, Vercel Functions, or Netlify Functions

---

## Post-Deployment

### 1. Monitoring
- [ ] Set up error logging (Sentry, LogRocket)
- [ ] Monitor server resources
- [ ] Set up uptime monitoring
- [ ] Configure alerts

### 2. Backups
- [ ] Set up automated database backups
- [ ] Test backup restoration
- [ ] Document backup process

### 3. Maintenance
- [ ] Set up CI/CD pipeline
- [ ] Document deployment process
- [ ] Create runbook for common issues

---

## Environment Variables Reference

### Backend (.env)
```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
JWT_SECRET=your-secure-secret
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-api-key
SMTP_FROM="CashBack Rewards" <noreply@yourdomain.com>
```

### Frontend
- Update API base URL in `src/api/client.ts`
- Set production API URL

---

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `FRONTEND_URL` in backend `.env`
   - Check CORS configuration in `server.ts`

2. **Database Errors**
   - Ensure database file is writable
   - Check database path in production
   - Verify migrations ran

3. **Email Not Sending**
   - Verify SMTP credentials
   - Check email service limits
   - Review email service logs

4. **Build Errors**
   - Check Node.js version (18+)
   - Clear node_modules and reinstall
   - Verify all dependencies installed

---

## Security Checklist

- [ ] HTTPS enabled
- [ ] Strong JWT secret
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Security headers enabled
- [ ] Admin password changed
- [ ] Environment variables secured
- [ ] Database backups encrypted

---

## Performance Optimization

- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Enable browser caching
- [ ] Optimize images
- [ ] Database indexes created
- [ ] Monitor query performance

---

## Support

For issues, check:
- `TROUBLESHOOTING.md`
- Backend logs: `pm2 logs cashback-backend`
- Nginx logs: `/var/log/nginx/error.log`
