import emailjs from '@emailjs/browser';

const emailService = {
  sendWelcomeEmail: async (email, username, referralCode) => {
    try {
      console.log('Sending email with data:', {
        to_email: email,
        username: username,
        secret_code: referralCode,
        referral_link: `https://aquads.xyz?ref=${username}`
      });

      const response = await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_WELCOME_TEMPLATE,
        {
          to_email: email,
          username: username,
          secret_code: referralCode,
          referral_link: `https://aquads.xyz?ref=${username}`
        },
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY
      );

      if (response.status === 200) {
        console.log('Welcome email sent successfully');
        return true;
      } else {
        throw new Error(`EmailJS responded with status: ${response.status}`);
      }
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