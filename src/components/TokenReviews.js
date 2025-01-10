import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const TokenReviews = ({ token, onClose, currentUser, showNotification }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [token.symbol]);

  useEffect(() => {
    socket.on('reviewAdded', (newReview) => {
      if (newReview.tokenSymbol === token.symbol) {
        setReviews(prevReviews => [newReview, ...prevReviews]);
      }
    });

    return () => {
      socket.off('reviewAdded');
    };
  }, [token.symbol]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reviews/${token.symbol}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      
      const data = await response.json();
      
      // Cache the reviews
      localStorage.setItem(`reviews_${token.symbol}`, JSON.stringify(data));
      setReviews(data);

      // Calculate average rating
      if (data.length > 0) {
        const avg = data.reduce((acc, review) => acc + review.rating, 0) / data.length;
        setAverageRating(avg);
        setTotalReviews(data.length);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Try to use cached reviews
      const cachedReviews = localStorage.getItem(`reviews_${token.symbol}`);
      if (cachedReviews) {
        const data = JSON.parse(cachedReviews);
        setReviews(data);
        if (data.length > 0) {
          const avg = data.reduce((acc, review) => acc + review.rating, 0) / data.length;
          setAverageRating(avg);
          setTotalReviews(data.length);
        }
      }
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showNotification('Please login to submit a review', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          tokenSymbol: token.symbol,
          rating: newReview.rating,
          comment: newReview.comment
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit review');
      }

      const savedReview = await response.json();
      setReviews(prevReviews => [savedReview, ...prevReviews]);
      setNewReview({ rating: 5, comment: '' });
      showNotification('Review submitted successfully!', 'success');
      
      // Update average rating
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      showNotification(error.message || 'Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Reviews for {token.name}</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className="text-yellow-400 text-2xl mr-2">★</span>
              <span className="text-xl">{averageRating.toFixed(1)}</span>
            </div>
            <span className="text-gray-400">({totalReviews} reviews)</span>
          </div>
          {currentUser && !showAddReview && (
            <button
              onClick={() => setShowAddReview(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              Add Review
            </button>
          )}
        </div>

        {/* Add Review Form */}
        {showAddReview && (
          <form onSubmit={handleSubmitReview} className="mb-8 bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
            <div className="mb-4">
              <label className="block mb-2">Rating</label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                    className={`text-2xl ${
                      star <= newReview.rating ? 'text-yellow-400' : 'text-gray-400'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block mb-2">Comment</label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 rounded resize-none"
                rows="4"
                maxLength="500"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddReview(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 rounded ${
                  isSubmitting 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {reviews.length === 0 ? (
            <p className="text-gray-400 text-center">No reviews yet. Be the first to review!</p>
          ) : (
            reviews.map((review) => (
              <div key={review._id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center">
                      <span className="text-yellow-400 mr-1">{'★'.repeat(review.rating)}</span>
                      <span className="text-gray-400">{'★'.repeat(5 - review.rating)}</span>
                    </div>
                    <p className="text-sm text-gray-400">by {review.username}</p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-300">{review.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TokenReviews; 