import React from 'react';

const BookingManagement = ({ bookings, currentUser, onStatusUpdate, showNotification, onShowReviews, onOpenConversation }) => {
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'accepted_by_seller':
      case 'accepted_by_buyer':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'completed':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'cancelled':
      case 'declined':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'accepted_by_seller':
        return 'Accepted by Seller';
      case 'accepted_by_buyer':
        return 'Accepted by Buyer';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await onStatusUpdate(bookingId, newStatus);
      showNotification('Booking status updated successfully', 'success');
    } catch (error) {
      showNotification(error.message || 'Failed to update booking status', 'error');
    }
  };

  const renderActions = (booking) => {
    const isSeller = booking.sellerId._id === currentUser.userId;
    const isBuyer = booking.buyerId._id === currentUser.userId;

    // For completed bookings, show review button only to buyers
    if (booking.status === 'completed') {
      if (isBuyer && !booking.isReviewed) {
        return (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onShowReviews(booking.serviceId, booking, false)}
              className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
            >
              Leave Review
            </button>
          </div>
        );
      }
      return null;
    }

    // For cancelled or declined bookings
    if (booking.status === 'cancelled' || booking.status === 'declined') {
      return null;
    }

    return (
      <div className="flex gap-2 mt-2">
        {isSeller && booking.status === 'pending' && (
          <>
            <button
              onClick={() => handleStatusUpdate(booking._id, 'accepted_by_seller')}
              className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
            >
              Accept
            </button>
            <button
              onClick={() => handleStatusUpdate(booking._id, 'declined')}
              className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
            >
              Decline
            </button>
          </>
        )}

        {isBuyer && booking.status === 'pending' && (
          <button
            onClick={() => handleStatusUpdate(booking._id, 'cancelled')}
            className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
          >
            Cancel
          </button>
        )}

        {isBuyer && booking.status === 'accepted_by_seller' && (
          <button
            onClick={() => handleStatusUpdate(booking._id, 'accepted_by_buyer')}
            className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
          >
            Accept
          </button>
        )}

        {isSeller && booking.status === 'accepted_by_buyer' && (
          <button
            onClick={() => handleStatusUpdate(booking._id, 'accepted_by_seller')}
            className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
          >
            Accept
          </button>
        )}

        {isSeller && booking.status === 'confirmed' && (
          <button
            onClick={() => handleStatusUpdate(booking._id, 'completed')}
            className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
          >
            Mark Completed
          </button>
        )}
      </div>
    );
  };

  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No bookings found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div key={booking._id} className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {booking.serviceId.title}
              </h3>
              <p className="text-sm text-gray-400">
                {booking.sellerId._id === currentUser.userId ? 'Buyer' : 'Seller'}: {
                  booking.sellerId._id === currentUser.userId 
                    ? booking.buyerName
                    : booking.sellerId.username
                }
              </p>
              {booking.sellerId._id === currentUser.userId && booking.buyerId.email && (
                <p className="text-sm text-gray-400">
                  Buyer Email: {booking.buyerId.email}
                </p>
              )}
              <p className="text-sm text-gray-400">
                Price: {booking.price} {booking.currency}
              </p>
              {booking.requirements && (
                <p className="text-sm text-gray-400 mt-2">
                  Requirements: {booking.requirements}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-sm border ${getStatusBadgeClass(booking.status)}`}>
                {getStatusText(booking.status)}
              </span>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(booking.createdAt).toLocaleDateString()}
              </p>
              
              {/* Messages button */}
              <button
                onClick={() => onOpenConversation(booking)}
                className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center"
              >
                <span className="mr-1">💬</span> Messages
              </button>
              
              {/* View service reviews button */}
              {booking.serviceId && (
                <button
                  onClick={() => onShowReviews(booking.serviceId, null, true)}
                  className="mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm flex items-center"
                >
                  <span className="mr-1">⭐</span> View Reviews
                </button>
              )}
            </div>
          </div>
          {renderActions(booking)}
        </div>
      ))}
    </div>
  );
};

export default BookingManagement; 