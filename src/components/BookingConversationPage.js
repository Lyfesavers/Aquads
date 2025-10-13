import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BookingConversation from './BookingConversation';
import { API_URL } from '../services/api';

/**
 * Standalone page for booking conversations
 * Opens in a new window for better multitasking
 * Includes real-time socket messaging support
 */
const BookingConversationPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Get auth data from sessionStorage (set by parent window)
    const authData = sessionStorage.getItem('bookingConversationAuth');
    
    if (!authData) {
      setError('Authentication required. Please open this from the dashboard.');
      setLoading(false);
      return;
    }

    try {
      const parsedAuth = JSON.parse(authData);
      setCurrentUser(parsedAuth);
      
      // Fetch the booking data
      fetchBooking(parsedAuth.token);
    } catch (err) {
      setError('Invalid authentication data');
      setLoading(false);
    }
  }, [bookingId]);

  const fetchBooking = async (token) => {
    try {
      const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch booking');
      }

      const bookingData = await response.json();
      setBooking(bookingData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load booking. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Close the window
    window.close();
    
    // If window.close() doesn't work (some browsers prevent it), navigate back
    setTimeout(() => {
      if (!window.closed) {
        navigate('/');
      }
    }, 100);
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl text-white font-semibold mb-2">Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-600' :
          notification.type === 'error' ? 'bg-red-600' :
          notification.type === 'info' ? 'bg-blue-600' :
          'bg-gray-600'
        } text-white animate-fade-in`}>
          {notification.message}
        </div>
      )}

      {/* Header with window controls */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">💬</span>
            <div>
              <h1 className="text-white font-semibold">Booking Conversation</h1>
              <p className="text-gray-400 text-sm">
                {booking?.serviceId?.title || 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            title="Close this window"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Main Conversation Component */}
      <div className="max-w-6xl mx-auto">
        {booking && currentUser && (
          <BookingConversation
            booking={booking}
            currentUser={currentUser}
            onClose={handleClose}
            showNotification={showNotification}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BookingConversationPage;

