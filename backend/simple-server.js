const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Simple storage array (will be replaced with MongoDB later)
let requests = [];

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         req.connection.remoteAddress ||
         req.ip ||
         '127.0.0.1';
};

// Get hostname
const getHostname = (req) => {
  try {
    const host = req.headers.host || req.hostname || 'localhost';
    return host.split(':')[0];
  } catch (error) {
    return 'localhost';
  }
};

// Page load logging
app.post('/api/page-load', (req, res) => {
  try {
    const log = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'page_load',
      ip: getClientIP(req),
      hostname: getHostname(req),
      userAgent: req.get('User-Agent') || 'Unknown'
    };
    
    requests.push(log);
    console.log('✅ Page load logged:', { ip: log.ip, hostname: log.hostname });
    res.json({ success: true, message: 'Page load logged' });
  } catch (error) {
    console.error('Page load error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset request
app.post('/api/reset-request', (req, res) => {
  try {
    const { userIdProvided } = req.body;
    
    const log = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'reset_request',
      userIdProvided: userIdProvided || 'empty',
      ip: getClientIP(req),
      hostname: getHostname(req),
      userAgent: req.get('User-Agent') || 'Unknown'
    };
    
    requests.push(log);
    console.log('✅ Reset request logged:', { 
      userId: log.userIdProvided, 
      ip: log.ip, 
      hostname: log.hostname 
    });
    
    // Always return success
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'in-memory (working)',
    totalRequests: requests.length
  });
});

// Get all data
app.get('/api/data', (req, res) => {
  try {
    res.json({
      success: true,
      data: requests,
      total: requests.length
    });
  } catch (error) {
    console.error('Data fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear data
app.delete('/api/data', (req, res) => {
  try {
    requests = [];
    res.json({ success: true, message: 'All data cleared' });
  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Handle React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`🌐 Access application at: http://localhost:${PORT}`);
  console.log(`📊 All data stored in memory (no authentication needed)`);
  console.log(`🔗 Redirect URL: https://thoughtscrest.com`);
  console.log(`✅ Ready to accept any user ID and redirect`);
});

module.exports = app;
