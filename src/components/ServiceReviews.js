import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { API_URL } from '../services/api';
import { FaSpinner } from 'react-icons/fa';

const ServiceReviews = ({ service, onClose, currentUser, showNotification, onReviewsUpdate, viewOnly = false }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [interactionDate, setInteractionDate] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const validateReviewLength = (text) => {
    if (!text) return false;
    // Count sentences by splitting on period, exclamation, or question mark followed by space
    const sentences = text.split(/[.!?]\s+/).filter(sentence => sentence.trim().length > 0);
    // Count lines by splitting on newline
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return sentences.length >= 3 || lines.length >= 3;
  };

  useEffect(() => {
    if (!service || !service._id) {
      return;
    }
    fetchReviews();
    if (currentUser) {
      checkReviewEligibility();
    }
  }, [service?._id, currentUser]);

  const checkReviewEligibility = async () => {
    try {
      const response = await fetch(`${API_URL}/service-reviews/${service._id}/bookings`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      const bookings = await response.json();
      setUserBookings(bookings);
      
      // Check if user has any completed bookings that haven't been reviewed
      const unreviewedBookings = bookings.filter(booking => !booking.isReviewed);
      setCanReview(unreviewedBookings.length > 0);
      
      if (unreviewedBookings.length > 0) {
        setSelectedBookingId(unreviewedBookings[0]._id);
        setInteractionDate(unreviewedBookings[0].completedAt);
      }
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setCanReview(false);
    }
  };

  const fetchReviews = async () => {
    try {
      if (!service || !service._id) {
        return;
      }
      setIsLoading(true);
      const response = await fetch(`${API_URL}/service-reviews/${service._id}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(data);
      
      // Calculate average rating
      if (data && data.length > 0) {
        const totalRating = data.reduce((sum, review) => sum + Number(review.rating), 0);
        const avgRating = totalRating / data.length;
        setAverageRating(avgRating);
        setTotalReviews(data.length);
        
        // Update the service's rating in the parent component
        if (onReviewsUpdate) {
          const updatedService = {
            ...service,
            rating: avgRating,
            reviews: data.length
          };
          onReviewsUpdate(updatedService);
        }
      } else {
        setAverageRating(0);
        setTotalReviews(0);
        
        // Update parent with zero rating when no reviews
        if (onReviewsUpdate) {
          const updatedService = {
            ...service,
            rating: 0,
            reviews: 0
          };
          onReviewsUpdate(updatedService);
        }
      }
    } catch (error) {
      setError('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  // Add polling for review updates
  useEffect(() => {
    if (!service || !service._id) {
      return;
    }
    const pollInterval = setInterval(() => {
      fetchReviews();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [service?._id]);


  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!validateReviewLength(newReview.comment)) {
      setError('Please write a more detailed review (at least 2 sentences)');
      return;
    }

    if (!selectedBookingId) {
      setError('Please select a booking to review');
      return;
    }

    setError(null);
    setIsSubmitting(true); // Set submitting state to true

    try {
      const token = currentUser?.token;
      if (!token) {
        throw new Error('You must be logged in to leave a review');
      }

      const response = await fetch(`${API_URL}/service-reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceId: service._id,
          bookingId: selectedBookingId,
          rating: newReview.rating,
          comment: newReview.comment
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }

      const savedReview = await response.json();
      
      // Add the new review to the list
      setReviews(prevReviews => [savedReview, ...prevReviews]);
      
      // Reset the form
      setNewReview({ rating: 5, comment: '' });
      setSelectedBookingId(null);
      
      // Refresh eligibility to update available bookings
      await checkReviewEligibility();
      
      // Update totals
      setTotalReviews(prev => prev + 1);
      
      // Calculate new average
      const newTotal = reviews.reduce((sum, r) => sum + r.rating, 0) + savedReview.rating;
      setAverageRating(newTotal / (reviews.length + 1));
      
      // Show success notification
      showNotification('Review submitted successfully!', 'success');
      
      // Call the update callback if provided
      if (onReviewsUpdate) {
        const updatedService = {
          ...service,
          rating: (newTotal / (reviews.length + 1)),
          reviews: reviews.length + 1
        };
        onReviewsUpdate(updatedService);
      }
      
         } catch (error) {
       setError(error.message);
     } finally {
      setIsSubmitting(false); // Reset submitting state regardless of outcome
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-white p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Reviews for {service.title}</h2>
          <div className="text-right">
            <div className="text-yellow-400 text-xl">
              {'★'.repeat(Math.round(averageRating))}
              {'☆'.repeat(5 - Math.round(averageRating))}
            </div>
            <div className="text-sm text-gray-400">
              {averageRating.toFixed(1)} / 5.0 ({totalReviews} reviews)
            </div>
          </div>
        </div>
        
        {!viewOnly && currentUser && currentUser.username !== service.seller?.username && (
          <>
            {!canReview ? (
              <div className="mb-8 bg-gray-800 p-4 rounded-lg">
                <p className="text-yellow-400 mb-2">⚠️ Review Requirements:</p>
                <ul className="list-disc list-inside text-gray-400">
                  <li>You must interact with the service provider first</li>
                  <li>Submit review within 30 days of interaction</li>
                  <li>Write at least 3 sentences or lines in your review</li>
                </ul>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="mb-8 bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                
                {/* Booking Selection */}
                {userBookings.filter(booking => !booking.isReviewed).length > 1 && (
                  <div className="mb-4">
                    <label className="block mb-2">Select Booking to Review</label>
                    <select
                      value={selectedBookingId || ''}
                      onChange={(e) => {
                        setSelectedBookingId(e.target.value);
                        const selectedBooking = userBookings.find(b => b._id === e.target.value);
                        if (selectedBooking) {
                          setInteractionDate(selectedBooking.completedAt);
                        }
                      }}
                      className="w-full bg-gray-700 rounded p-2"
                    >
                      {userBookings
                        .filter(booking => !booking.isReviewed)
                        .map(booking => (
                          <option key={booking._id} value={booking._id}>
                            Booking completed on {new Date(booking.completedAt).toLocaleDateString()}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                
                <div className="mb-4">
                  <label className="block mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[5, 4, 3, 2, 1].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNewReview(prev => ({ ...prev, rating: num }))}
                        className={`p-2 rounded ${
                          newReview.rating === num ? 'bg-blue-500' : 'bg-gray-700'
                        }`}
                      >
                        {num} ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block mb-2">Comment (minimum 3 sentences or lines)</label>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    className="w-full bg-gray-700 rounded p-2 min-h-[100px]"
                    placeholder="Please write at least 3 sentences or lines describing your experience with this service..."
                    required
                  />
                  <div className="mt-2 text-sm text-gray-400">
                    {validateReviewLength(newReview.comment) ? (
                      <span className="text-green-400">✓ Review length requirement met</span>
                    ) : (
                      <span>Write at least 3 sentences or lines</span>
                    )}
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {viewOnly && (
          <div className="mb-6 bg-blue-900/20 border border-blue-500/40 p-4 rounded-lg">
            <p className="text-blue-400 text-center">
              💡 To leave a review, book their service through the dashboard
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-4">Loading reviews...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-4">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-4 text-gray-400">No reviews yet. Be the first to review!</div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review._id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-yellow-400">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}
                    </div>
                    <div className="text-sm text-gray-400">by {review.username}</div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <p className="text-gray-300">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ServiceReviews; 