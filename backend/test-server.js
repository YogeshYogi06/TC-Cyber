const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// In-memory storage for testing (will be replaced with MongoDB)
let logs = [];

// Helper function to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         req.connection.remoteAddress ||
         req.ip ||
         '127.0.0.1';
};

// Helper function to get client hostname
const getClientHostname = (req) => {
  try {
    const host = req.headers.host || req.hostname || 'localhost';
    return host.split(':')[0]; // Remove port if present
  } catch (error) {
    return 'localhost';
  }
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'in-memory (testing mode)'
  });
});

// Page load logging endpoint
app.post('/api/page-load', (req, res) => {
  try {
    const log = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'page_load',
      ip: getClientIP(req),
      hostname: getClientHostname(req),
      userAgent: req.get('User-Agent') || 'Unknown'
    };
    
    logs.push(log);
    console.log('Page load logged:', { ip: log.ip, hostname: log.hostname });
    res.json({ success: true, message: 'Page load logged' });
  } catch (error) {
    console.error('Page load logging error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset request endpoint
app.post('/api/reset-request', (req, res) => {
  try {
    const { userIdProvided } = req.body;
    
    const log = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'reset_request',
      userIdProvided: userIdProvided || 'empty',
      ip: getClientIP(req),
      hostname: getClientHostname(req),
      userAgent: req.get('User-Agent') || 'Unknown'
    };
    
    logs.push(log);
    console.log('Reset request logged:', { ip: log.ip, hostname: log.hostname, userId: log.userIdProvided });
    
    // Generic success response
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
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin123') {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get statistics endpoint
app.get('/api/stats', (req, res) => {
  try {
    const totalRequests = logs.length;
    const resetRequests = logs.filter(log => log.type === 'reset_request').length;
    const pageLoads = logs.filter(log => log.type === 'page_load').length;
    const uniqueIPs = [...new Set(logs.map(log => log.ip))].length;
    const uniqueUsers = [...new Set(logs.filter(log => log.userIdProvided && log.userIdProvided !== 'empty').map(log => log.userIdProvided))].length;
    
    res.json({
      totalRequests,
      resetRequests,
      pageLoads,
      uniqueIPs,
      uniqueUsers
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get logs endpoint
app.get('/api/logs', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type || null;
    
    let filteredLogs = logs;
    if (type && type !== 'all') {
      filteredLogs = logs.filter(log => log.type === type);
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
    
    res.json({
      logs: paginatedLogs,
      total: filteredLogs.length,
      page,
      totalPages: Math.ceil(filteredLogs.length / limit)
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear logs endpoint
app.delete('/api/logs', (req, res) => {
  try {
    logs = [];
    res.json({ success: true, message: 'All logs cleared' });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export logs endpoint
app.get('/api/logs/export', (req, res) => {
  try {
    const csv = [
      'Timestamp,Type,User ID,IP Address,Hostname,User Agent',
      ...logs.map(log => 
        `"${log.timestamp}","${log.type}","${log.userIdProvided || ''}","${log.ip}","${log.hostname}","${log.userAgent}"`
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="reset-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
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
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📊 Access the application at: http://localhost:${PORT}`);
  console.log(`📝 Logs are stored in memory (testing mode)`);
  console.log(`🔗 Frontend will be available at: http://localhost:${PORT}`);
});

module.exports = app;
