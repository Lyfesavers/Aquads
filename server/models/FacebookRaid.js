const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const facebookRaidSchema = new Schema({
  postId: {
    type: String,
    required: true
  },
  postUrl: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    default: 50
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Payment related fields
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  txSignature: {
    type: String,
    default: null
  },
  paymentChain: {
    type: String,
    default: null
  },
  chainSymbol: {
    type: String,
    default: null
  },
  chainAddress: {
    type: String,
    default: null
  },
  // Points payment related fields
  paidWithPoints: {
    type: Boolean,
    default: false
  },
  pointsSpent: {
    type: Number,
    default: 0
  },
  completions: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    facebookUsername: {
      type: String,
      required: true
    },
    postUrl: String,
    postId: {
      type: String,
      default: null
    },
    verificationCode: String,
    verificationMethod: {
      type: String,
      enum: ['automatic', 'manual', 'post_embed', 'client_side', 'iframe_interaction', 'telegram_bot'],
      default: 'automatic'
    },
    verified: {
      type: Boolean,
      default: false
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    },
    pointsAwarded: {
      type: Boolean,
      default: false
    },
    ipAddress: {
      type: String,
      default: null
    },
    iframeVerified: {
      type: Boolean,
      default: false
    },
    iframeInteractions: {
      type: Number,
      default: 0
    },
    verificationNote: String,
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Extract post ID from URL if only URL is provided
facebookRaidSchema.pre('save', function(next) {
  if (!this.postId && this.postUrl) {
    // Extract post ID from Facebook URL using robust parsing
    const extractFacebookPostId = (url) => {
      if (!url) return null;
      
      try {
        // Handle cases where someone might paste "@URL" by mistake
        const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
        
        // Try multiple approaches to extract the post ID
        
        // Approach 1: Try to parse as a URL first
        let parsedUrl;
        try {
          // Check if URL has protocol, add if missing
          const urlWithProtocol = (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('https'))
            ? `https://${cleanUrl}` 
            : cleanUrl;
          
          parsedUrl = new URL(urlWithProtocol);
        } catch (e) {
          // Continue to fallback regex approach
        }
        
        // If we successfully parsed the URL, check the domain and extract ID
        if (parsedUrl) {
          // Check if it's a Facebook domain
          if (parsedUrl.hostname.includes('facebook.com')) {
            // Extract ID from pathname
            const match = parsedUrl.pathname.match(/\/posts\/(\d+)/);
            if (match && match[1]) {
              return match[1];
            }
          }
        }
        
        // Approach 2: Fallback to regex for all URL formats
        const standardMatch = cleanUrl.match(/facebook\.com\/[^\/]+\/posts\/(\d+)/i);
        if (standardMatch && standardMatch[1]) {
          return standardMatch[1];
        }
        
        // Approach 3: Handle groups and pages
        const groupsMatch = cleanUrl.match(/facebook\.com\/groups\/[^\/]+\/posts\/(\d+)/i);
        if (groupsMatch && groupsMatch[1]) {
          return groupsMatch[1];
        }
        
        const pagesMatch = cleanUrl.match(/facebook\.com\/[^\/]+\/posts\/(\d+)/i);
        if (pagesMatch && pagesMatch[1]) {
          return pagesMatch[1];
        }
        
        // Approach 4: Try to handle direct posts URLs with just numbers
        const directPostsMatch = cleanUrl.match(/\/posts\/(\d+)/i);
        if (directPostsMatch && directPostsMatch[1]) {
          return directPostsMatch[1];
        }
        
        return null;
      } catch (error) {
        return null;
      }
    };

    const postId = extractFacebookPostId(this.postUrl);
    if (postId) {
      this.postId = postId;
    }
  }
  next();
});

module.exports = mongoose.model('FacebookRaid', facebookRaidSchema);
