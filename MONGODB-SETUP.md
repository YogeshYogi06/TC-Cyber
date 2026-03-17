# MongoDB Atlas Setup Guide

This guide will help you set up MongoDB Atlas for the password reset website.

## Prerequisites

- MongoDB Atlas account (free tier available)
- Basic understanding of MongoDB concepts

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Start Free" or "Sign Up"
3. Choose the "Shared" (free) cluster option
4. Complete the registration process

## Step 2: Create a Cluster

1. After logging in, click "Build a Cluster"
2. Choose "Shared" (free) cluster type
3. Select a cloud provider and region (choose one closest to your users)
4. Cluster name: Leave as default or change to "password-reset-cluster"
5. Click "Create Cluster"

## Step 3: Create Database User

1. While the cluster is being created, go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Fill in the details:
   - **Username**: `password-reset-admin` (or your preferred username)
   - **Password**: Generate a strong password (save this securely)
   - **Database User Privileges**: Read and write to any database
4. Click "Add User"

## Step 4: Configure Network Access

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Choose one of the following:
   - **For Development**: "Allow Access from Anywhere" (0.0.0.0/0)
   - **For Production**: "Add Your Current IP Address"
4. Click "Confirm"

## Step 5: Get Connection String

1. Go to "Clusters" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select **Node.js** and version **4.1 or later**
5. Copy the connection string

## Step 6: Update Environment Variables

In your `backend/.env` file, update the MONGO_URI:

```env
MONGO_URI=mongodb+srv://password-reset-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/passdb?retryWrites=true&w=majority
```

Replace:
- `password-reset-admin` with your username
- `YOUR_PASSWORD` with your password
- `cluster0.xxxxx` with your cluster name

## Step 7: Create the Database

The database and collection will be created automatically when the first request is made. However, you can create them manually:

1. Go to "Collections" under your cluster
2. Click "Add My Own Data"
3. **Database Name**: `passdb`
4. **Collection Name**: `reset_requests`
5. Click "Create"

## Step 8: Verify Connection

1. Start your backend server:
```bash
cd backend
npm run dev
```

2. You should see:
```
MongoDB Atlas connected successfully
Database indexes created
Server running on port 3000
```

## Security Best Practices

### Production Environment

1. **Use Specific IP Whitelist**
   - Remove "Allow Access from Anywhere"
   - Add only your server's IP addresses

2. **Strong Authentication**
   - Use complex passwords
   - Enable SCRAM-SHA-256 authentication
   - Consider using X.509 certificates for enterprise

3. **Network Encryption**
   - Always use `mongodb+srv://` (SSL/TLS enabled)
   - Never use `mongodb://` in production

4. **Database Access Control**
   - Create specific users for specific applications
   - Use role-based access control
   - Limit privileges to minimum required

### Monitoring and Alerts

1. **Set Up Alerts**
   - Go to "Alerts" in the left sidebar
   - Configure alerts for:
     - High CPU usage
     - High memory usage
     - Slow queries
     - Connection failures

2. **Monitor Performance**
   - Use the "Metrics" tab to monitor performance
   - Check the "Performance Advisor" for optimization suggestions

## Backup Strategy

### Free Tier (Automatic)
- 36-hour retention for point-in-time restores
- Daily snapshots for 30 days

### Paid Tiers
- Configure continuous backups
- Set retention period based on compliance requirements
- Test restore procedures regularly

## Troubleshooting

### Connection Issues

1. **Authentication Failed**
   - Verify username and password
   - Check if user has correct permissions
   - Ensure database name is correct in connection string

2. **Network Access Denied**
   - Check IP whitelist
   - Verify firewall settings
   - Ensure SSL/TLS is enabled

3. **Cluster Not Ready**
   - Wait for cluster creation to complete
   - Check cluster status in the dashboard

### Performance Issues

1. **Slow Queries**
   - Check query performance in the "Performance Advisor"
   - Add appropriate indexes
   - Consider query optimization

2. **High CPU Usage**
   - Monitor query patterns
   - Consider scaling up cluster tier
   - Optimize indexes

## Cost Management

### Free Tier Limits
- 512MB storage
- Shared RAM
- 100 connections per cluster
- Basic monitoring

### When to Upgrade
- Storage approaching 512MB
- High connection count
- Need for dedicated resources
- Compliance requirements for backups

## Advanced Configuration

### Index Management
```javascript
// Create indexes manually in MongoDB Shell
db.reset_requests.createIndex({ "createdAt": -1 })
db.reset_requests.createIndex({ "clientIpAddress": 1 })
db.reset_requests.createIndex({ "requestType": 1 })
```

### Data Retention
```javascript
// Set TTL index for automatic deletion after 30 days
db.reset_requests.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 2592000 })
```

### Aggregation Pipeline Example
```javascript
// Get statistics by country
db.reset_requests.aggregate([
  { $match: { country: { $ne: null } } },
  { $group: { _id: "$country", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

## Support Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB University](https://university.mongodb.com/)
- [Community Forums](https://community.mongodb.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/mongodb-atlas)

---

**Note**: Always test your connection string and configuration in development before deploying to production.
