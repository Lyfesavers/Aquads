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
        service.seller?.email,
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
      // The handleBookingCreate function throws an error with the server message
      // Check if the error message contains content filtering information
      const errorMessage = error.message || 'Failed to create booking';
      
      // Check if this is a content filtering error
      if (errorMessage.includes('blocked') || errorMessage.includes('contact')) {
        showNotification(errorMessage, 'error');
      } else {
        showNotification(errorMessage, 'error');
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
                <h3 className="font-semibold mb-3">Service Details</h3>
                <p className="text-gray-300 mb-3">{service.title}</p>
                <div className="flex justify-center gap-2">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 flex-1 max-w-[120px]">
                    <div className="text-green-400 text-sm font-bold">
                      {service.price} {service.currency}
                    </div>
                    <div className="text-green-300 text-xs">
                      Starting Price
                    </div>
                  </div>
                                      {service.hourlyRate && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 flex-1 max-w-[120px]">
                        <div className="text-orange-400 text-sm font-bold">
                          {service.hourlyRate} {service.currency}/hr
                        </div>
                      </div>
                    )}
                </div>
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