const mongoose = require('mongoose');

const clickTrackingSchema = new mongoose.Schema({
  // Type of element clicked
  elementType: {
    type: String,
    required: true,
    enum: ['paid_ads_button', 'free_marketing_banner'],
    index: true
  },
  // Page where the click occurred
  pagePath: {
    type: String,
    default: '/'
  },
  // User info (optional - for logged in users)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  username: {
    type: String,
    default: null
  },
  // Device/browser info
  userAgent: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  // Referrer (where they came from)
  referrer: {
    type: String,
    default: null
  },
  // Device type detection
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for efficient querying
clickTrackingSchema.index({ elementType: 1, createdAt: -1 });
clickTrackingSchema.index({ createdAt: -1 });

// Static method to get click stats
clickTrackingSchema.statics.getStats = async function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$elementType',
        totalClicks: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueIPs: { $addToSet: '$ipAddress' },
        deviceTypes: {
          $push: '$deviceType'
        }
      }
    },
    {
      $project: {
        elementType: '$_id',
        totalClicks: 1,
        uniqueUsers: { $size: { $filter: { input: '$uniqueUsers', as: 'u', cond: { $ne: ['$$u', null] } } } },
        uniqueIPs: { $size: { $filter: { input: '$uniqueIPs', as: 'ip', cond: { $ne: ['$$ip', null] } } } },
        desktopClicks: {
          $size: { $filter: { input: '$deviceTypes', as: 'd', cond: { $eq: ['$$d', 'desktop'] } } }
        },
        mobileClicks: {
          $size: { $filter: { input: '$deviceTypes', as: 'd', cond: { $eq: ['$$d', 'mobile'] } } }
        },
        tabletClicks: {
          $size: { $filter: { input: '$deviceTypes', as: 'd', cond: { $eq: ['$$d', 'tablet'] } } }
        }
      }
    }
  ]);

  return stats;
};

// Static method to get daily click trends
clickTrackingSchema.statics.getDailyTrends = async function(elementType, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const match = { createdAt: { $gte: startDate } };
  if (elementType) {
    match.elementType = elementType;
  }

  const trends = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          elementType: '$elementType'
        },
        clicks: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } },
    {
      $group: {
        _id: '$_id.elementType',
        dailyData: {
          $push: {
            date: '$_id.date',
            clicks: '$clicks'
          }
        }
      }
    }
  ]);

  return trends;
};

module.exports = mongoose.model('ClickTracking', clickTrackingSchema);

