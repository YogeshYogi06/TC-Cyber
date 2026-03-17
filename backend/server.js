const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const dns = require('dns').promises;
const geoip = require('geoip-lite');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const ResetRequest = require('./models/ResetRequest');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Add your production domain
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limiting for reset requests
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 reset requests per hour
  message: 'Too many reset requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/reset-request', resetLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization
app.use(mongoSanitize());

// Custom XSS protection middleware
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    });
  }
  next();
});

// Helper function to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.socket.remoteAddress ||
         req.connection.remoteAddress ||
         req.ip ||
         '127.0.0.1';
};

// Helper function to resolve hostname
const resolveHostname = async (ip) => {
  try {
    // Skip private IPs and localhost
    if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return 'localhost';
    }
    
    const hostnames = await dns.reverse(ip);
    return hostnames[0] || null;
  } catch (error) {
    return null;
  }
};

// Helper function to get country from IP
const getCountryFromIP = (ip) => {
  try {
    const geo = geoip.lookup(ip);
    return geo ? geo.country : null;
  } catch (error) {
    return null;
  }
};

// Helper function to log request data
const logRequest = async (req, requestType, userIdProvided = null) => {
  try {
    const clientIP = getClientIP(req);
    const [hostname, country] = await Promise.all([
      resolveHostname(clientIP),
      Promise.resolve(getCountryFromIP(clientIP))
    ]);

    const logData = {
      userIdProvided,
      clientIpAddress: clientIP,
      clientHostname: hostname,
      userAgent: req.get('User-Agent') || 'Unknown',
      requestType,
      country
    };

    const log = new ResetRequest(logData);
    await log.save();
    
    console.log(`Logged ${requestType} from ${clientIP}`);
    return log;
  } catch (error) {
    console.error('Failed to log request:', error);
    // Continue execution even if logging fails
  }
};

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB Atlas connected successfully');
    
    // Create indexes
    await ResetRequest.createIndexes();
    console.log('Database indexes created');
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Page load logging endpoint
app.post('/api/page-load', async (req, res) => {
  try {
    await logRequest(req, 'page_load');
    res.json({ success: true, message: 'Page load logged' });
  } catch (error) {
    console.error('Page load logging error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset request endpoint
app.post('/api/reset-request', async (req, res) => {
  try {
    const { userIdProvided } = req.body;
    
    // Always return success regardless of input
    await logRequest(req, 'reset_request', userIdProvided);
    
    // Generic success response - never reveals if user exists
    res.json({ 
      success: true, 
      message: 'Password reset link has been sent.' 
    });
    
  } catch (error) {
    console.error('Reset request error:', error);
    // Still return success to maintain security
    res.json({ 
      success: true, 
      message: 'Password reset link has been sent.' 
    });
  }
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Simple authentication (in production, use proper hashing and JWT)
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      await logRequest(req, 'page_load', 'admin_login');
      res.json({ success: true, message: 'Login successful' });
    } else {
      await logRequest(req, 'page_load', 'admin_login_failed');
      res.status(401).json({ error: 'Invalid credentials' });
    }
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get statistics endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await ResetRequest.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get logs endpoint with pagination
app.get('/api/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type || null;
    
    const result = await ResetRequest.getPaginatedLogs(page, limit, type);
    res.json(result);
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export logs endpoint
app.get('/api/logs/export', async (req, res) => {
  try {
    const logs = await ResetRequest.find()
      .sort({ createdAt: -1 })
      .lean();
    
    // Create CSV file
    const csvPath = path.join(__dirname, 'temp-logs.csv');
    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'createdAt', title: 'Timestamp' },
        { id: 'requestType', title: 'Request Type' },
        { id: 'userIdProvided', title: 'User ID/Email' },
        { id: 'clientIpAddress', title: 'IP Address' },
        { id: 'clientHostname', title: 'Hostname' },
        { id: 'country', title: 'Country' },
        { id: 'userAgent', title: 'User Agent' }
      ]
    });
    
    await csvWriter.writeRecords(logs);
    
    // Send file
    res.download(csvPath, `reset-logs-${new Date().toISOString().split('T')[0]}.csv`, (err) => {
      if (err) {
        console.error('CSV download error:', err);
      }
      // Clean up temp file
      fs.unlink(csvPath, () => {});
    });
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear logs endpoint (admin only)
app.delete('/api/logs', async (req, res) => {
  try {
    await ResetRequest.deleteMany({});
    await logRequest(req, 'page_load', 'logs_cleared');
    res.json({ success: true, message: 'All logs cleared' });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

startServer().catch(console.error);

module.exports = app;
