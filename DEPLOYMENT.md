# Deployment Guide

This guide covers deployment options for the password reset website.

## Deployment Options

### 1. Vercel (Frontend) + Render (Backend) - Recommended

#### Frontend Deployment (Vercel)

1. **Prepare for Deployment**
```bash
cd frontend
npm run build
```

2. **Deploy to Vercel**
   - Create a Vercel account at [vercel.com](https://vercel.com)
   - Connect your GitHub repository
   - Configure build settings:
     - **Build Command**: `cd frontend && npm run build`
     - **Output Directory**: `frontend/dist`
     - **Install Command**: `cd frontend && npm install`

3. **Environment Variables**
   - Add `VITE_API_URL` pointing to your backend URL
   - Example: `VITE_API_URL=https://your-backend.onrender.com`

#### Backend Deployment (Render)

1. **Prepare Repository**
   - Ensure your backend is in the `backend/` directory
   - Add `start` script to package.json: `"start": "node server.js"`

2. **Deploy to Render**
   - Create a Render account at [render.com](https://render.com)
   - Connect your GitHub repository
   - Create a new "Web Service"
   - Configure:
     - **Root Directory**: `backend`
     - **Runtime**: Node.js
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

3. **Environment Variables**
   ```
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/passdb
   NODE_ENV=production
   ADMIN_USERNAME=your-secure-username
   ADMIN_PASSWORD=your-secure-password
   PORT=3000
   ```

### 2. Netlify (Frontend) + Railway (Backend)

#### Frontend Deployment (Netlify)

1. **Build Configuration**
```bash
cd frontend
npm run build
```

2. **Netlify Settings**
   - **Build command**: `cd frontend && npm run build`
   - **Publish directory**: `frontend/dist`
   - Add redirect rule for SPA:
     ```
     /*    /index.html   200
     ```

#### Backend Deployment (Railway)

1. **Railway Setup**
   - Create Railway account at [railway.app](https://railway.app)
   - Connect GitHub repository
   - Set service type to "Dockerfile" or "Node.js"

2. **Dockerfile (Optional)**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
EXPOSE 3000
CMD ["npm", "start"]
```

### 3. VPS Deployment (DigitalOcean, Linode, etc.)

#### Server Setup

1. **Initial Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

2. **Deploy Application**
```bash
# Clone repository
git clone <your-repo-url>
cd password-reset-website

# Install dependencies
cd backend && npm install
cd ../frontend && npm install && npm run build

# Setup environment
cd ../backend
cp .env.example .env
# Edit .env with your values

# Start with PM2
pm2 start server.js --name password-reset-api
pm2 startup
pm2 save
```

3. **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/password-reset-website/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Docker Deployment

#### Dockerfile (Multi-stage)
```dockerfile
# Frontend build stage
FROM node:18-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Backend stage
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3000
CMD ["npm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGO_URI=${MONGO_URI}
      - NODE_ENV=production
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    restart: unless-stopped
```

## Environment Configuration

### Production Environment Variables

```env
# MongoDB Atlas
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/passdb

# Server
NODE_ENV=production
PORT=3000

# Admin
ADMIN_USERNAME=your-secure-admin-username
ADMIN_PASSWORD=your-secure-admin-password

# Frontend URL (for CORS)
FRONTEND_URL=https://yourdomain.com
```

### Security Considerations

1. **Change Default Credentials**
   - Always change admin username and password
   - Use strong, unique passwords

2. **HTTPS Configuration**
   - Use SSL certificates (Let's Encrypt is free)
   - Redirect HTTP to HTTPS

3. **IP Whitelisting**
   - Restrict MongoDB Atlas access to your server IPs
   - Use firewall rules to limit access

4. **Rate Limiting**
   - Adjust rate limits based on your needs
   - Monitor for abuse patterns

## Monitoring and Maintenance

### Health Checks

Add health check endpoint monitoring:
```bash
# Using curl in cron
curl -f https://yourdomain.com/api/health || echo "Server down" | mail -s "Alert" admin@yourdomain.com
```

### Log Management

1. **Application Logs**
```bash
# PM2 logs
pm2 logs password-reset-api

# System logs
sudo journalctl -u nginx
```

2. **Database Monitoring**
   - Use MongoDB Atlas metrics
   - Set up alerts for unusual activity

### Backup Strategy

1. **Database Backups**
   - Enable MongoDB Atlas automatic backups
   - Test restore procedures regularly

2. **Code Backups**
   - Use Git for version control
   - Tag releases for easy rollback

## Performance Optimization

### Frontend Optimization

1. **Build Optimization**
```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  }
});
```

2. **Caching Headers**
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Backend Optimization

1. **Database Indexing**
   - Ensure all indexes are created
   - Monitor query performance

2. **Caching**
   - Consider Redis for frequently accessed data
   - Implement response caching where appropriate

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancing**
   - Use multiple backend instances
   - Configure load balancer

2. **Database Scaling**
   - Consider MongoDB Atlas scaling tiers
   - Implement read replicas for read-heavy workloads

### Vertical Scaling

1. **Resource Monitoring**
   - Monitor CPU and memory usage
   - Scale up resources as needed

2. **Performance Testing**
   - Load test before production deployment
   - Monitor performance metrics

## Troubleshooting

### Common Deployment Issues

1. **CORS Errors**
   - Verify FRONTEND_URL environment variable
   - Check browser console for specific errors

2. **Database Connection**
   - Verify MONGO_URI is correct
   - Check IP whitelist in MongoDB Atlas

3. **Build Failures**
   - Check build logs for specific errors
   - Ensure all dependencies are installed

### Debug Commands

```bash
# Check application status
pm2 status
pm2 logs

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# Check network connectivity
curl -I https://yourdomain.com/api/health
```

## Security Post-Deployment

1. **Regular Updates**
   - Keep Node.js and dependencies updated
   - Monitor security advisories

2. **Security Audits**
   - Regular security scans
   - Penetration testing

3. **Access Control**
   - Limit SSH access
   - Use key-based authentication

---

**Remember**: Always test deployments in a staging environment before production.
