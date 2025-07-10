import emailjs from '@emailjs/browser';
import logger from '../utils/logger';

const emailService = {
  sendWelcomeEmail: async (email, username, referralCode) => {
    try {
      // Log all environment variables to verify they're correct
      logger.log('EmailJS Config:', {
        serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID,
        templateId: process.env.REACT_APP_EMAILJS_WELCOME_TEMPLATE,
        publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      });

      const templateParams = {
        to_email: email,
        username: username,
        referralCode: referralCode
      };

      const response = await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_WELCOME_TEMPLATE,
        templateParams,
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      );

      if (response.status === 200) {
        logger.log('Welcome email sent successfully');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('EmailJS Error:', error.text || error.message);
      return false;
    }
  },

  sendBookingNotification: async (sellerEmail, bookingDetails) => {
    try {
      logger.log('EmailJS Config for booking:', {
        serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID,
        templateId: process.env.REACT_APP_EMAILJS_NEW_BOOKING_TEMPLATE,
        publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      });

      const templateParams = {
        to_email: sellerEmail,
        sellerUsername: bookingDetails.sellerUsername,
        serviceTitle: bookingDetails.serviceTitle,
        bookingId: bookingDetails.bookingId,
        price: bookingDetails.price,
        currency: bookingDetails.currency,
        buyerUsername: bookingDetails.buyerUsername,
        requirements: bookingDetails.requirements
      };

      logger.log('Sending booking email with data:', templateParams);

      const response = await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_NEW_BOOKING_TEMPLATE,
        templateParams,
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      );

      if (response.status === 200) {
        logger.log('Booking notification sent successfully');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('EmailJS Error for booking:', error.text || error.message);
      return false;
    }
  },

  sendVerificationEmail: async (email, username, verificationCode) => {
    try {
      logger.log('EmailJS Config for verification:', {
        serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID,
        templateId: process.env.REACT_APP_EMAILJS_VERIFICATION_TEMPLATE,
        publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      });

      const templateParams = {
        to_email: email,
        username: username,
        verification_code: verificationCode,
        site_name: 'Aquads'
      };

      logger.log('Sending verification email with data:', templateParams);

      const response = await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_VERIFICATION_TEMPLATE,
        templateParams,
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      );

      if (response.status === 200) {
        logger.log('Verification email sent successfully');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('EmailJS Error for verification:', error.text || error.message);
      return false;
    }
  },

  sendBuyerAcceptanceEmail: async (buyerEmail, bookingDetails) => {
    try {
      logger.log('EmailJS Config for buyer acceptance:', {
        serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID,
        templateId: process.env.REACT_APP_EMAILJS_BUYER_ACCEPTANCE_TEMPLATE,
        publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      });

      const templateParams = {
        to_email: buyerEmail,
        buyerUsername: bookingDetails.buyerUsername,
        serviceTitle: bookingDetails.serviceTitle,
        bookingId: bookingDetails.bookingId,
        price: bookingDetails.price,
        currency: bookingDetails.currency,
        sellerUsername: bookingDetails.sellerUsername,
        requirements: bookingDetails.requirements,
        dashboard_link: `${process.env.REACT_APP_FRONTEND_URL || 'https://aquads.xyz'}/dashboard?tab=bookings&booking=${bookingDetails.bookingId}`
      };

      logger.log('Sending buyer acceptance email with data:', templateParams);

      const response = await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_BUYER_ACCEPTANCE_TEMPLATE,
        templateParams,
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      );

      if (response.status === 200) {
        logger.log('Buyer acceptance email sent successfully');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('EmailJS Error for buyer acceptance:', error.text || error.message);
      return false;
    }
  }
};

export default emailService; 