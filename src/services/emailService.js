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
  }
};

export default emailService; 