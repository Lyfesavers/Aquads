const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Email template
const getWelcomeEmailTemplate = (username, referralCode) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #1a1a1a;
          color: #ffffff;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          background-color: #2d2d2d;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background-color: #2d2d2d;
          padding: 30px;
          border-radius: 0 0 10px 10px;
          margin-top: 2px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #3498db;
        }
        .referral-box {
          background-color: #1a1a1a;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .referral-code {
          font-size: 24px;
          color: #3498db;
          font-weight: bold;
          letter-spacing: 2px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
        .social-links {
          margin-top: 20px;
          text-align: center;
        }
        .social-links a {
          color: #3498db;
          margin: 0 10px;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AQUADS</div>
        </div>
        <div class="content">
          <h2>Welcome to Aquads, ${username}! 🎉</h2>
          <p>Thank you for joining our community. We're excited to have you on board!</p>
          
          <div class="referral-box">
            <p>Your Unique Referral Code:</p>
            <div class="referral-code">${referralCode}</div>
            <p>Share this code with your friends and earn rewards!</p>
          </div>
          
          <p>Start exploring our platform and discover amazing opportunities:</p>
          <center><a href="https://aquads.com/dashboard" class="button">Go to Dashboard</a></center>
          
          <div class="social-links">
            <a href="#">Twitter</a> |
            <a href="#">Facebook</a> |
            <a href="#">Instagram</a>
          </div>
          
          <div class="footer">
            <p>This email was sent by Aquads. Please do not reply to this email.</p>
            <p>© 2024 Aquads. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Function to send welcome email
const sendWelcomeEmail = async (userEmail, username, referralCode) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: 'Welcome to Aquads - Your Referral Code Inside! 🎉',
      html: getWelcomeEmailTemplate(username, referralCode)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail
}; 