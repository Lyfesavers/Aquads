import emailjs from '@emailjs/browser';

const emailService = {
  sendWelcomeEmail: async (email, username, referralCode) => {
    try {
      // Log all environment variables to verify they're correct
      console.log('EmailJS Config:', {
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
        console.log('Welcome email sent successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('EmailJS Error:', error.text || error.message);
      return false;
    }
  },

  sendBookingNotification: async (sellerEmail, bookingDetails) => {
    try {
      const response = await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_NEW_BOOKING_TEMPLATE,
        {
          to_email: sellerEmail,
          sellerUsername: bookingDetails.sellerUsername,
          serviceTitle: bookingDetails.serviceTitle,
          bookingId: bookingDetails.bookingId,
          price: bookingDetails.price,
          currency: bookingDetails.currency,
          buyerUsername: bookingDetails.buyerUsername,
          requirements: bookingDetails.requirements
        },
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      );
      console.log('Booking notification sent:', response);
      return true;
    } catch (error) {
      console.error('Error sending booking notification:', error);
      return false;
    }
  }
};

export default emailService; 