import React, { useState } from 'react';
import Modal from './Modal';
import emailService from '../services/emailService';

const BookingButton = ({ service, currentUser, onBookingCreate, showNotification }) => {
  const [showModal, setShowModal] = useState(false);
  const [requirements, setRequirements] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await onBookingCreate(service._id, requirements);

      
      // Send booking notification to seller
      await emailService.sendBookingNotification(
        service.email,
        {
          sellerUsername: service.seller.username,
          serviceTitle: service.title,
          bookingId: response._id,
          price: service.price,
          currency: service.currency,
          buyerUsername: currentUser.username,
          requirements: requirements
        }
      );

      setShowModal(false);
      showNotification('Booking request sent successfully!', 'success');
    } catch (error) {
      // Handle different types of errors, including content filtering
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.blockedContent) {
          // Show specific error for blocked content in requirements
          showNotification(errorData.error, 'error');
        } else {
          showNotification(errorData.error || error.message || 'Failed to create booking', 'error');
        }
      } else {
        showNotification(error.message || 'Failed to create booking', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <button
        onClick={() => showNotification('Please login to book this service', 'info')}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
      >
        Contact {service.seller?.username || 'Seller'}
      </button>
    );
  }

  if (service.seller._id === currentUser.userId) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
      >
        Contact {service.seller?.username || 'Seller'}
      </button>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-4">Book Service</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Service Details</h3>
                <p className="text-gray-300">{service.title}</p>
                <p className="text-gray-300">Price: {service.price} {service.currency}</p>
              </div>
              
              <div>
                <label className="block mb-2">
                  Project Requirements
                  <span className="text-gray-400 text-sm ml-2">(optional)</span>
                </label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Describe your project requirements..."
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-400"
                >
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
};

export default BookingButton; 