const contentFilter = {
  // Regular expressions for detecting contact information
  patterns: {
    // Email patterns
    email: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      /\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b/gi,
      /\b[A-Za-z0-9._%+-]+\s*\[\s*at\s*\]\s*[A-Za-z0-9.-]+\s*\[\s*dot\s*\]\s*[A-Z|a-z]{2,}\b/gi,
      /\b[A-Za-z0-9._%+-]+\s*\(\s*at\s*\)\s*[A-Za-z0-9.-]+\s*\(\s*dot\s*\)\s*[A-Z|a-z]{2,}\b/gi
    ],
    
    // Phone number patterns (various formats)
    phone: [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // 123-456-7890, 123.456.7890, 1234567890
      /\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/g, // (123) 456-7890
      /\b\+?1?\s*\d{3}\s*\d{3}\s*\d{4}\b/g, // +1 123 456 7890
      /\b\d{10,}\b/g, // 10+ consecutive digits
      /\b\+\d{1,3}\s*\d{3,4}\s*\d{3,4}\s*\d{3,4}\b/g, // International format
      /\bcall\s+me\s+at\s+\d/gi,
      /\btext\s+me\s+at\s+\d/gi,
      /\bphone\s*:?\s*\d/gi,
      /\bmobile\s*:?\s*\d/gi,
      /\bwhatsapp\s*:?\s*\d/gi
    ],
    
    // Social media usernames and handles
    social: [
      /@[A-Za-z0-9_]+/g, // @username
      /\binstagram\s*:?\s*@?[A-Za-z0-9_]+/gi,
      /\btwitter\s*:?\s*@?[A-Za-z0-9_]+/gi,
      /\btiktok\s*:?\s*@?[A-Za-z0-9_]+/gi,
      /\bfacebook\s*:?\s*@?[A-Za-z0-9_]+/gi,
      /\blinkedin\s*:?\s*@?[A-Za-z0-9_]+/gi,
      /\bsnap\s*:?\s*@?[A-Za-z0-9_]+/gi,
      /\bsnapchat\s*:?\s*@?[A-Za-z0-9_]+/gi,
      /\bdiscord\s*:?\s*@?[A-Za-z0-9_#]+/gi,
      /\btelegram\s*:?\s*@?[A-Za-z0-9_]+/gi,
      /\bfollow\s+me\s+@/gi,
      /\badd\s+me\s+@/gi,
      /\bcontact\s+me\s+@/gi,
      /\bfind\s+me\s+@/gi,
      /\bmessage\s+me\s+@/gi
    ],
    
    // Additional patterns for bypassing attempts
    contactAttempts: [
      /\bcontact\s+me\s+outside/gi,
      /\boff\s+platform/gi,
      /\boffplatform/gi,
      /\bdirect\s+contact/gi,
      /\bprivate\s+message/gi,
      /\boutside\s+aquads/gi,
      /\bskype\s*:?/gi,
      /\bzoom\s*:?/gi,
      /\bgmail\s*:?/gi,
      /\byahoo\s*:?/gi,
      /\boutlook\s*:?/gi,
      /\bhotmail\s*:?/gi
    ]
  },

  // Check if message contains blocked content
  containsBlockedContent: function(message) {
    if (!message || typeof message !== 'string') {
      return { blocked: false, reasons: [] };
    }

    const reasons = [];
    const lowerMessage = message.toLowerCase();

    // Check for emails
    for (const pattern of this.patterns.email) {
      if (pattern.test(message)) {
        reasons.push('email addresses');
        break;
      }
    }

    // Check for phone numbers
    for (const pattern of this.patterns.phone) {
      if (pattern.test(message)) {
        reasons.push('phone numbers');
        break;
      }
    }

    // Check for social media handles
    for (const pattern of this.patterns.social) {
      if (pattern.test(message)) {
        reasons.push('social media usernames');
        break;
      }
    }

    // Check for contact attempts
    for (const pattern of this.patterns.contactAttempts) {
      if (pattern.test(message)) {
        reasons.push('off-platform contact attempts');
        break;
      }
    }

    return {
      blocked: reasons.length > 0,
      reasons: reasons
    };
  },

  // Generate user-friendly error message
  getBlockedContentMessage: function(reasons) {
    if (!reasons || reasons.length === 0) {
      return 'Your message contains blocked content.';
    }

    const reasonsText = reasons.join(', ');
    return `Your message was blocked because it contains ${reasonsText}. To maintain platform security, please use our booking system for all communications.`;
  }
};

module.exports = contentFilter; 