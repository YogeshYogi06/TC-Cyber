const mongoose = require('mongoose');

// Define the schema for password reset requests
const passwordResetSchema = new mongoose.Schema({
  // User provided information
  userIdProvided: {
    type: String,
    required: true,
    trim: true,
    description: 'The user ID or email entered by the user'
  },
  
  // Client information
  clientIpAddress: {
    type: String,
    required: true,
    description: 'The IP address of the client making the request'
  },
  
  clientHostname: {
    type: String,
    required: true,
    description: 'The hostname of the client'
  },
  
  userAgent: {
    type: String,
    required: true,
    description: 'The browser user agent string'
  },
  
  // Request metadata
  requestType: {
    type: String,
    required: true,
    enum: ['page_load', 'reset_request'],
    description: 'Type of request made by the user'
  },
  
  // Geolocation data
  country: {
    type: String,
    default: null,
    description: 'Country code derived from IP geolocation'
  },
  
  // Additional tracking
  sessionId: {
    type: String,
    default: null,
    description: 'Session identifier for tracking user sessions'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    description: 'When the request was made'
  },
  
  // Auto-expiration for data retention
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 2592000, // 30 days in seconds
    description: 'When this record will be automatically deleted'
  }
}, {
  collection: 'password_reset_requests',
  timestamps: true,
  versionKey: false
});

// Indexes for optimal query performance
passwordResetSchema.index({ createdAt: -1 });
passwordResetSchema.index({ clientIpAddress: 1 });
passwordResetSchema.index({ requestType: 1 });
passwordResetSchema.index({ userIdProvided: 1 });
passwordResetSchema.index({ country: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static methods for data retrieval
passwordResetSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        resetRequests: {
          $sum: { $cond: [{ $eq: ['$requestType', 'reset_request'] }, 1, 0] }
        },
        pageLoads: {
          $sum: { $cond: [{ $eq: ['$requestType', 'page_load'] }, 1, 0] }
        },
        uniqueIPs: { $addToSet: '$clientIpAddress' },
        uniqueUsers: { 
          $addToSet: { 
            $cond: [
              { $ne: ['$userIdProvided', 'empty'] },
              '$userIdProvided',
              null
            ]
          }
        }
      }
    },
    {
      $project: {
        totalRequests: 1,
        resetRequests: 1,
        pageLoads: 1,
        uniqueIPs: { $size: '$uniqueIPs' },
        uniqueUsers: { 
          $size: {
            $filter: {
              input: '$uniqueUsers',
              cond: { $ne: ['$$this', null] }
            }
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalRequests: 0,
    resetRequests: 0,
    pageLoads: 0,
    uniqueIPs: 0,
    uniqueUsers: 0
  };
};

passwordResetSchema.statics.getPaginatedLogs = async function(page = 1, limit = 20, type = null) {
  const skip = (page - 1) * limit;
  const query = type && type !== 'all' ? { requestType: type } : {};
  
  const logs = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await this.countDocuments(query);
  
  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Instance methods
passwordResetSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.__v;
  delete obj._id;
  return obj;
};

// Pre-save middleware
passwordResetSchema.pre('save', function(next) {
  // Set expiration date if not set
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 2592000000); // 30 days
  }
  next();
});

// Post-save middleware for logging
passwordResetSchema.post('save', function(doc) {
  console.log(`✅ ${doc.requestType.toUpperCase()} logged:`, {
    userId: doc.userIdProvided,
    ip: doc.clientIpAddress,
    hostname: doc.clientHostname,
    timestamp: doc.createdAt
  });
});

module.exports = mongoose.model('PasswordResetRequest', passwordResetSchema);
