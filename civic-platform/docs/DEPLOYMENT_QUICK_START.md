# Quick Start Deployment Guide

This guide provides step-by-step instructions for the **fastest deployment option**: Vercel (Frontend) + Railway (Backend).

## Prerequisites

- GitHub account
- Vercel account (free): https://vercel.com
- Railway account (free): https://railway.app
- PostgreSQL database (Railway provides this)

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project

1. Go to https://railway.app
2. Sign up/login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `civic-platform` repository
6. Select the root directory

### 1.2 Add PostgreSQL Database

1. In Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will create a PostgreSQL instance
4. Note the connection details (you'll need the DATABASE_URL)

### 1.3 Configure Backend Service

1. Railway should auto-detect your backend
2. If not, click "+ New" → "GitHub Repo" → Select your repo
3. Set root directory to: `apps/api`
4. Set start command: `npm run start:prod`

### 1.4 Set Environment Variables

In Railway backend service, add these variables:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-very-strong-secret-key-here-min-32-chars
NODE_ENV=production
PORT=3001
```

**To get DATABASE_URL**:
1. Click on PostgreSQL service
2. Go to "Variables" tab
3. Copy `DATABASE_URL` value
4. Use it in backend service variables

### 1.5 Deploy Backend

1. Railway will automatically deploy
2. Wait for deployment to complete
3. Click on backend service → "Settings" → "Generate Domain"
4. Copy the generated URL (e.g., `https://your-api.up.railway.app`)

### 1.6 Run Database Migrations

1. In Railway backend service, go to "Deployments"
2. Click on latest deployment → "View Logs"
3. Or use Railway CLI:
   ```bash
   railway run npm run prisma:migrate deploy
   ```

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Project

1. Go to https://vercel.com
2. Sign up/login with GitHub
3. Click "Add New Project"
4. Import your `civic-platform` repository
5. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 2.2 Set Environment Variables

In Vercel project settings → Environment Variables, add:

```bash
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
```

Replace with your actual Railway backend URL.

### 2.3 Deploy

1. Click "Deploy"
2. Vercel will build and deploy automatically
3. Wait for deployment to complete
4. Your app will be live at: `https://your-app.vercel.app`

---

## Step 3: Configure CORS

### 3.1 Update Backend CORS

In your backend code, ensure CORS allows your Vercel domain:

```typescript
// In apps/api/src/main.ts
app.enableCors({
  origin: [
    'https://your-app.vercel.app',
    'http://localhost:3000', // for local dev
  ],
  credentials: true,
});
```

Or set via environment variable:
```bash
CORS_ORIGIN=https://your-app.vercel.app
```

---

## Step 4: Verify Deployment

### 4.1 Test Backend

1. Visit: `https://your-api.up.railway.app/graphql`
2. Should see GraphQL Playground (if enabled) or API response

### 4.2 Test Frontend

1. Visit: `https://your-app.vercel.app`
2. Should redirect to login
3. Test login functionality
4. Verify API connection works

### 4.3 Test Database

1. Check Railway PostgreSQL logs
2. Verify migrations ran successfully
3. Test creating a record via frontend

---

## Step 5: Custom Domain (Optional)

### 5.1 Frontend Domain (Vercel)

1. Go to Vercel project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL will be automatic

### 5.2 Backend Domain (Railway)

1. Go to Railway backend service → Settings
2. Click "Generate Domain" or add custom domain
3. Configure DNS as instructed
4. SSL will be automatic

---

## Environment Variables Summary

### Backend (Railway)
```bash
DATABASE_URL=postgresql://... (from Railway PostgreSQL)
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-app.vercel.app
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
```

---

## Troubleshooting

### Backend won't start
- Check Railway logs
- Verify DATABASE_URL is correct
- Ensure migrations ran
- Check PORT is set correctly

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS configuration
- Verify backend is running (check Railway logs)
- Test backend URL directly in browser

### Database connection errors
- Verify DATABASE_URL format
- Check PostgreSQL is running in Railway
- Ensure migrations completed
- Check network connectivity

### Build failures
- Check build logs in Vercel/Railway
- Verify all dependencies are in package.json
- Check Node.js version compatibility
- Review error messages in logs

---

## Updating Deployment

### Automatic (Recommended)

Both Vercel and Railway support automatic deployments:
- Push to `main` branch → Auto-deploy
- Push to other branches → Preview deployments

### Manual

1. **Backend**: Railway auto-deploys on git push
2. **Frontend**: Vercel auto-deploys on git push
3. Or trigger manually from dashboard

---

## Monitoring

### Railway
- View logs in service dashboard
- Monitor resource usage
- Set up alerts

### Vercel
- View deployment logs
- Monitor analytics
- Check function logs

---

## Cost

### Free Tier
- **Vercel**: Free for personal projects
- **Railway**: $5 free credit/month (enough for small apps)

### Paid
- **Vercel**: $20/month (Pro)
- **Railway**: Pay-as-you-go (~$5-20/month for small apps)

---

## Next Steps

1. ✅ Set up monitoring (Sentry, etc.)
2. ✅ Configure backups for database
3. ✅ Set up staging environment
4. ✅ Configure CI/CD pipelines
5. ✅ Add custom domains
6. ✅ Set up error alerts

---

**Your app should now be live! 🎉**

Visit your Vercel URL to see it in action.

