const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const dns = require('dns').promises;
const geoip = require('geoip-lite');
const path = require('path');
const PasswordResetRequest = require('./models/PasswordResetRequest');

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
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://thoughtscrest.com']
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
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
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         req.connection.remoteAddress ||
         req.ip ||
         '127.0.0.1';
};

// Helper function to resolve hostname
const resolveHostname = async (ip) => {
  try {
    // Skip private IPs and localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return 'localhost';
    }
    
    const hostnames = await dns.reverse(ip);
    return hostnames[0] || ip;
  } catch (error) {
    return ip;
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
      userIdProvided: userIdProvided || 'page_load',
      clientIpAddress: clientIP,
      clientHostname: hostname,
      userAgent: req.get('User-Agent') || 'Unknown',
      requestType,
      country,
      sessionId: req.sessionID || null
    };

    const log = new PasswordResetRequest(logData);
    await log.save();
    
    console.log(`✅ ${requestType.toUpperCase()} logged:`, {
      userId: userIdProvided,
      ip: clientIP,
      hostname: hostname,
      country: country
    });
    
    return log;
  } catch (error) {
    console.error('❌ Failed to log request:', error);
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
    
    await mongoose.connect(mongoURI);
    
    console.log('🔗 MongoDB Atlas connected successfully');
    
    // Create indexes
    await PasswordResetRequest.createIndexes();
    console.log('📊 Database indexes created');
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('🔄 Falling back to in-memory mode for testing...');
    
    // Fallback to in-memory mode for testing
    global.inMemoryMode = true;
    global.memoryLogs = [];
  }
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: global.inMemoryMode ? 'in-memory (fallback)' : (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected')
  });
});

// Page load logging endpoint
app.post('/api/page-load', async (req, res) => {
  try {
    if (global.inMemoryMode) {
      // Fallback to in-memory storage
      const log = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'page_load',
        userIdProvided: 'page_load',
        clientIpAddress: getClientIP(req),
        clientHostname: await resolveHostname(getClientIP(req)),
        userAgent: req.get('User-Agent') || 'Unknown',
        requestType: 'page_load',
        country: getCountryFromIP(getClientIP(req))
      };
      global.memoryLogs.push(log);
    } else {
      await logRequest(req, 'page_load');
    }
    
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
    if (global.inMemoryMode) {
      // Fallback to in-memory storage
      const log = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'reset_request',
        userIdProvided: userIdProvided || 'empty',
        clientIpAddress: getClientIP(req),
        clientHostname: await resolveHostname(getClientIP(req)),
        userAgent: req.get('User-Agent') || 'Unknown',
        requestType: 'reset_request',
        country: getCountryFromIP(getClientIP(req))
      };
      global.memoryLogs.push(log);
      console.log('✅ Reset request logged (in-memory):', { userId: userIdProvided, ip: getClientIP(req) });
    } else {
      await logRequest(req, 'reset_request', userIdProvided);
    }
    
    // Generic success response - never reveals if user exists
    res.json({ 
      success: true, 
      message: 'Password reset link has been sent.',
      redirectUrl: 'https://thoughtscrest.com'
    });
    
  } catch (error) {
    console.error('Reset request error:', error);
    // Still return success to maintain security
    res.json({ 
      success: true, 
      message: 'Password reset link has been sent.',
      redirectUrl: 'https://thoughtscrest.com'
    });
  }
});

// Get statistics endpoint
app.get('/api/stats', async (req, res) => {
  try {
    let stats;
    if (global.inMemoryMode) {
      const logs = global.memoryLogs || [];
      stats = {
        totalRequests: logs.length,
        resetRequests: logs.filter(log => log.requestType === 'reset_request').length,
        pageLoads: logs.filter(log => log.requestType === 'page_load').length,
        uniqueIPs: [...new Set(logs.map(log => log.clientIpAddress))].length,
        uniqueUsers: [...new Set(logs.filter(log => log.userIdProvided && log.userIdProvided !== 'empty').map(log => log.userIdProvided))].length
      };
    } else {
      stats = await PasswordResetRequest.getStatistics();
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get logs endpoint
app.get('/api/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type || null;
    
    let result;
    if (global.inMemoryMode) {
      let logs = global.memoryLogs || [];
      if (type && type !== 'all') {
        logs = logs.filter(log => log.requestType === type);
      }
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLogs = logs.slice(startIndex, endIndex);
      
      result = {
        logs: paginatedLogs,
        total: logs.length,
        page,
        totalPages: Math.ceil(logs.length / limit)
      };
    } else {
      result = await PasswordResetRequest.getPaginatedLogs(page, limit, type);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Handle React routing
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
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Access the application at: http://localhost:${PORT}`);
    console.log(`📊 Database: ${global.inMemoryMode ? 'in-memory (fallback)' : 'MongoDB Atlas'}`);
    console.log(`🔗 Redirect URL: https://thoughtscrest.com`);
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (!global.inMemoryMode) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (!global.inMemoryMode) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

startServer().catch(console.error);

module.exports = app;
