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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none"></div>
      
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm border ${
          notification.type === 'success' ? 'bg-emerald-600/90 border-emerald-500/50' :
          notification.type === 'error' ? 'bg-red-600/90 border-red-500/50' :
          notification.type === 'info' ? 'bg-blue-600/90 border-blue-500/50' :
          'bg-gray-600/90 border-gray-500/50'
        } text-white animate-fade-in flex items-center gap-3`}>
          <span className="text-xl">
            {notification.type === 'success' ? '✅' :
             notification.type === 'error' ? '❌' :
             notification.type === 'info' ? 'ℹ️' : '💬'}
          </span>
          {notification.message}
        </div>
      )}

      <div className="relative z-10 p-4 lg:p-6 xl:p-8">
        {/* Compact Header */}
        <div className="max-w-[1600px] mx-auto mb-4 lg:mb-6">
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center justify-between border border-gray-700/50 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl">💬</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Booking Conversation</h1>
                <p className="text-gray-400 text-sm">
                  {booking?.serviceId?.title || 'Loading...'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="px-5 py-2.5 bg-gray-700/70 hover:bg-red-500/20 hover:text-red-400 text-gray-300 rounded-xl transition-all duration-200 flex items-center gap-2 border border-gray-600/50 hover:border-red-500/30"
              title="Close this window"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>

        {/* Main Conversation Component - Full Width */}
        <div className="max-w-[1600px] mx-auto">
          {booking && currentUser && (
            <BookingConversation
              booking={booking}
              currentUser={currentUser}
              onClose={handleClose}
              showNotification={showNotification}
              isFullScreen={true}
            />
          )}
        </div>
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

