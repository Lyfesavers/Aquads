const crypto = require('crypto');

// Simple email service - for production, replace with actual email service like SendGrid, Nodemailer, etc.
const emailService = {
  // For now, just console log - replace with actual email sending in production
  sendVerificationEmail: async (email, verificationCode, username) => {
    try {
      console.log('='.repeat(60));
      console.log('📧 EMAIL VERIFICATION CODE');
      console.log('='.repeat(60));
      console.log(`To: ${email}`);
      console.log(`Username: ${username}`);
      console.log(`Code: ${verificationCode}`);
      console.log('='.repeat(60));
      console.log('⚠️  In production, integrate with actual email service!');
      console.log('='.repeat(60));
      
      // In production, replace this with actual email sending:
      /*
      const transporter = nodemailer.createTransporter({
        // Your email service configuration
      });
      
      await transporter.sendMail({
        from: 'noreply@aquads.xyz',
        to: email,
        subject: 'Verify Your Aquads Account',
        html: `
          <h2>Welcome to Aquads!</h2>
          <p>Hello ${username},</p>
          <p>Please use this code to verify your email address:</p>
          <h1 style="color: #4F46E5; font-size: 32px; text-align: center; letter-spacing: 8px;">${verificationCode}</h1>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't create this account, please ignore this email.</p>
        `
      });
      */
      
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }
};

module.exports = emailService; 