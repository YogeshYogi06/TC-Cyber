const mongoose = require('mongoose');

const resetRequestSchema = new mongoose.Schema({
  userIdProvided: {
    type: String,
    required: true,
    trim: true
  },
  clientIpAddress: {
    type: String,
    required: true
  },
  clientHostname: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    required: true
  },
  requestType: {
    type: String,
    required: true,
    enum: ['page_load', 'reset_request']
  },
  country: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // 30 days TTL
  }
}, {
  collection: 'reset_requests',
  timestamps: true
});

// Indexes for better query performance
resetRequestSchema.index({ createdAt: -1 });
resetRequestSchema.index({ clientIpAddress: 1 });
resetRequestSchema.index({ requestType: 1 });
resetRequestSchema.index({ userIdProvided: 1 });
resetRequestSchema.index({ country: 1 });

// Static method to get statistics
resetRequestSchema.statics.getStatistics = async function() {
  const totalRequests = await this.countDocuments();
  const resetRequests = await this.countDocuments({ requestType: 'reset_request' });
  const pageLoads = await this.countDocuments({ requestType: 'page_load' });
  const uniqueIPs = await this.distinct('clientIpAddress');
  const uniqueUsers = await this.distinct('userIdProvided', { userIdProvided: { $ne: null } });
  
  return {
    totalRequests,
    resetRequests,
    pageLoads,
    uniqueIPs: uniqueIPs.length,
    uniqueUsers: uniqueUsers.length
  };
};

// Static method to get paginated logs
resetRequestSchema.statics.getPaginatedLogs = async function(page = 1, limit = 20, type = null) {
  const skip = (page - 1) * limit;
  const query = type ? { requestType: type } : {};
  
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

module.exports = mongoose.model('ResetRequest', resetRequestSchema);
