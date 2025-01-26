import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { API_URL } from '../services/api';

const ServiceReviews = ({ service, onClose, currentUser, showNotification, onReviewsUpdate }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [interactionDate, setInteractionDate] = useState(null);

  const validateReviewLength = (text) => {
    if (!text) return false;
    // Count sentences by splitting on period, exclamation, or question mark followed by space
    const sentences = text.split(/[.!?]\s+/).filter(sentence => sentence.trim().length > 0);
    // Count lines by splitting on newline
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return sentences.length >= 3 || lines.length >= 3;
  };

  useEffect(() => {
    fetchReviews();
    if (currentUser) {
      checkReviewEligibility();
    }
  }, [service._id, currentUser]);

  const checkReviewEligibility = async () => {
    // Temporary: Allow reviews without backend check
    setCanReview(true);
    setInteractionDate(new Date().toISOString());
    
    // TODO: Uncomment when backend endpoint is implemented
    /*
    try {
      const response = await fetch(`${API_URL}/service-interactions/${service._id}/check`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      const data = await response.json();
      setCanReview(data.canReview);
      setInteractionDate(data.interactionDate);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setCanReview(false);
    }
    */
  };

  const fetchReviews = async () => {
    try {
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
      } else {
        setAverageRating(0);
        setTotalReviews(0);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Failed to load reviews');
    } finally {
      setIsLoading(false);
      // Call onReviewsUpdate after all state updates are complete
      onReviewsUpdate?.();
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showNotification('Please login to submit a review', 'error');
      return;
    }

    if (!canReview) {
      showNotification('You must interact with this service before leaving a review', 'error');
      return;
    }

    const comment = newReview.comment.trim();
    if (!validateReviewLength(comment)) {
      showNotification('Please write at least 3 sentences or lines in your review', 'error');
      return;
    }

    try {
      const reviewData = {
        serviceId: service._id,
        rating: parseInt(newReview.rating),
        comment: comment,
        interactionDate: interactionDate
      };

      const response = await fetch(`${API_URL}/service-reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(reviewData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setReviews([data, ...reviews]);
      setNewReview({ rating: 5, comment: '' });
      showNotification('Review submitted successfully!', 'success');
      
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      showNotification(error.message || 'Failed to submit review', 'error');
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
        
        {currentUser && currentUser.username !== service.seller?.username && (
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
                  className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded w-full"
                  disabled={!validateReviewLength(newReview.comment)}
                >
                  Submit Review
                </button>
              </form>
            )}
          </>
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