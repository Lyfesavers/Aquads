import emailjs from '@emailjs/browser';

const emailService = {
  sendWelcomeEmail: async (email, username, referralCode) => {
    try {
      const response = await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_WELCOME_TEMPLATE,
        {
          to_email: email,
          username: username,
          secret_code: referralCode,
          referral_link: `https://aquads.xyz?ref=${username}`
        }
      );
      console.log('Welcome email sent:', response);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
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