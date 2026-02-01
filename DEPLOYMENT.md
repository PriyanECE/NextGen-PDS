# Smart PDS - Production Deployment Checklist

## Pre-Deployment Checklist

### 1. Code Preparation
- [ ] Update API URLs to use environment variables
- [ ] Test build process locally (`npm run build`)
- [ ] Verify all dependencies are in `package.json`
- [ ] Remove console.logs from production code (optional)

### 2. Database Setup (MongoDB Atlas)
- [ ] Create MongoDB Atlas account
- [ ] Create free M0 cluster
- [ ] Get connection string
- [ ] Whitelist IP addresses (0.0.0.0/0 for now)
- [ ] Test connection locally

### 3. Backend Deployment (Railway)
- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Add environment variables:
  - [ ] MONGO_URI
  - [ ] JWT_SECRET
  - [ ] PORT=5000
  - [ ] NODE_ENV=production
  - [ ] LIVENESS_THRESHOLD=0.6
- [ ] Deploy and verify
- [ ] Copy backend URL (e.g., `https://your-app.railway.app`)

### 4. Frontend Deployment (Vercel)
- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Configure build settings:
  - [ ] Framework: Vite
  - [ ] Root Directory: `frontend`
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `dist`
- [ ] Add environment variable:
  - [ ] VITE_API_URL=https://your-backend.railway.app
- [ ] Deploy and verify
- [ ] Copy frontend URL (e.g., `https://your-app.vercel.app`)

### 5. Update Backend CORS
- [ ] Update CORS origin in `server.js` to include production frontend URL
- [ ] Redeploy backend

### 6. Testing
- [ ] Test login functionality
- [ ] Test face verification
- [ ] Test voice assistant
- [ ] Test camera access
- [ ] Verify SSL certificate (green padlock)
- [ ] Test on mobile devices

### 7. Custom Domain (Optional)
- [ ] Purchase domain or use existing
- [ ] Add domain to Vercel (frontend)
- [ ] Add subdomain to Railway (backend, e.g., api.yourdomain.com)
- [ ] Update DNS records
- [ ] Wait for SSL provisioning (5-10 minutes)
- [ ] Update CORS and environment variables

## Deployment Commands

### Backend (Railway)
```bash
# Railway will auto-deploy from GitHub
# Or use Railway CLI:
railway up
```

### Frontend (Vercel)
```bash
# Vercel will auto-deploy from GitHub
# Or use Vercel CLI:
vercel --prod
```

## Environment Variables Reference

### Backend (.env)
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
PORT=5000
NODE_ENV=production
LIVENESS_THRESHOLD=0.6
```

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend.railway.app
```

## Troubleshooting

### Build Fails
- Check `package.json` for missing dependencies
- Verify Node.js version compatibility
- Check build logs for specific errors

### CORS Errors
- Verify CORS origin includes production frontend URL
- Check credentials: true in CORS config
- Ensure HTTPS on both frontend and backend

### Database Connection Fails
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Ensure database user has correct permissions

### SSL Certificate Issues
- Wait 5-10 minutes for auto-provisioning
- Verify domain DNS records are correct
- Check platform status page

## Post-Deployment

- [ ] Monitor application logs
- [ ] Set up error tracking (optional: Sentry)
- [ ] Set up uptime monitoring (optional: UptimeRobot)
- [ ] Document production URLs
- [ ] Share with team/stakeholders

## Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
