# Password Reset Website

A full-stack password reset website built with React, Node.js, and MongoDB Atlas. Features comprehensive logging, security measures, and an admin dashboard.

## Features

### 🔐 Password Reset System
- Accepts any user ID or email (no validation)
- Always returns generic success responses
- Modern, responsive UI with dark mode support
- Professional card-based design

### 📊 Comprehensive Logging
- Tracks page loads and reset requests
- Captures IP addresses, hostnames, user agents
- IP geolocation (country detection)
- MongoDB Atlas storage with 30-day TTL

### 🛡️ Security Features
- Rate limiting (100 req/15min, 10 reset req/hour)
- CORS protection
- XSS protection
- Input sanitization
- Helmet.js security headers

### 👨‍💼 Admin Dashboard
- Real-time statistics
- Paginated log viewing
- Export logs to CSV
- Filter by request type
- Secure authentication

## Tech Stack

- **Frontend**: React 18, Vite, CSS3
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Security**: Helmet, CORS, rate limiting
- **Additional**: IP geolocation, hostname resolution

## Quick Start

### Prerequisites
- Node.js 16.0.0 or higher
- MongoDB Atlas account
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd password-reset-website
```

### 2. Setup MongoDB Atlas
1. Create a free MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Get your connection string
5. Whitelist your IP address

### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your MongoDB Atlas credentials:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/passdb
PORT=3000
NODE_ENV=development
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

### 5. Start the Applications

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 6. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Admin Dashboard: Click "Admin Dashboard" link

## API Endpoints

### Public Endpoints
- `POST /api/page-load` - Log page access
- `POST /api/reset-request` - Submit password reset request
- `GET /api/health` - Health check

### Admin Endpoints
- `POST /api/admin/login` - Admin authentication
- `GET /api/stats` - Get system statistics
- `GET /api/logs` - Get paginated logs
- `GET /api/logs/export` - Export logs as CSV
- `DELETE /api/logs` - Clear all logs

## Database Schema

### Collection: `reset_requests`
```javascript
{
  "_id": ObjectId,
  "userIdProvided": "string",      // User input (can be null for page loads)
  "clientIpAddress": "string",     // Client IP address
  "clientHostname": "string",      // Resolved hostname (null if failed)
  "userAgent": "string",           // Browser user agent
  "requestType": "string",         // "page_load" or "reset_request"
  "country": "string",             // Country code from IP geolocation
  "createdAt": Date,               // Request timestamp
  "updatedAt": Date                // Update timestamp
}
```

### Indexes
- `createdAt: -1` - For time-based queries
- `clientIpAddress: 1` - For IP-based analytics
- `requestType: 1` - For filtering by type
- `userIdProvided: 1` - For user-based queries
- `country: 1` - For geographic analytics

## Security Implementation

### Rate Limiting
- **General API**: 100 requests per 15 minutes per IP
- **Reset Requests**: 10 requests per hour per IP
- Configurable in `backend/server.js`

### Input Sanitization
- XSS protection using `xss` library
- MongoDB injection protection using `express-mongo-sanitize`
- Input validation and trimming

### CORS Configuration
- Configured for development and production
- Whitelisted origins only
- Credentials support

### Security Headers
- Content Security Policy (CSP)
- XSS Protection
- Frame protection
- HTTPS enforcement (production)

## Deployment

### Frontend Deployment (Vercel/Netlify)
1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Deploy the `dist` folder to your hosting platform

### Backend Deployment (Render/Railway)
1. Set environment variables in your hosting platform
2. Deploy the backend directory
3. Ensure MongoDB Atlas IP whitelist includes your hosting IP

### Environment Variables for Production
```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/passdb
PORT=3000
NODE_ENV=production
ADMIN_USERNAME=your-secure-username
ADMIN_PASSWORD=your-secure-password
FRONTEND_URL=https://yourdomain.com
```

## Admin Dashboard Features

### Statistics
- Total requests
- Reset requests count
- Page loads count
- Unique IP addresses
- Unique user IDs

### Log Management
- Paginated log viewing (20 per page)
- Filter by request type (All/Page Loads/Reset Requests)
- Real-time data updates
- Detailed request information

### Export Functionality
- Export all logs to CSV
- Includes all metadata fields
- Timestamped filename
- Automatic cleanup

## Monitoring and Maintenance

### Log Retention
- Automatic document expiration after 30 days
- Configurable TTL in the schema
- Manual cleanup option available

### Performance Monitoring
- Database connection status
- Request response times
- Error tracking
- Rate limiting metrics

### Backup Strategy
- MongoDB Atlas automatic backups
- Export functionality for manual backups
- 30-day retention policy

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check connection string in `.env`
   - Verify IP whitelist in Atlas
   - Ensure database user has correct permissions

2. **CORS Errors**
   - Verify frontend URL in CORS configuration
   - Check if frontend is running on correct port

3. **Rate Limiting**
   - Check rate limit configuration
   - Verify IP detection logic
   - Monitor rate limit headers

4. **Hostname Resolution**
   - Some IPs may not resolve to hostnames
   - Private IPs return 'localhost'
   - Check DNS configuration

### Debug Mode
Enable debug logging:
```bash
DEBUG=* npm run dev
```

## Development

### Project Structure
```
password-reset-website/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── models/
│   │   └── ResetRequest.js
│   ├── server.js
│   └── package.json
└── README.md
```

### Adding New Features
1. Frontend: Modify React components in `frontend/src/`
2. Backend: Add routes in `backend/server.js`
3. Database: Update models in `backend/models/`

### Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Create an issue in the repository

---

**Built with security and privacy in mind.**
