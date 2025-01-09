import React, { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa';
import { submitReview } from '../services/api';

const ReviewsModal = ({ isOpen, onClose, reviews, averageRating }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>
        
        <h2 className="text-2xl font-bold mb-4">Reviews</h2>
        
        {/* Average Rating in Modal */}
        <div className="flex items-center mb-6">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar
                key={star}
                className={star <= averageRating ? 'text-yellow-400' : 'text-gray-400'}
                size={24}
              />
            ))}
          </div>
          <span className="ml-2 text-lg">({reviews.length} reviews)</span>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="font-bold">{review.username}</span>
                  <div className="flex ml-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={star <= review.rating ? 'text-yellow-400' : 'text-gray-400'}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.comment && (
                <p className="mt-2 text-gray-300">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TokenReviews = ({ tokenSymbol, currentUser, showNotification }) => {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [userReview, setUserReview] = useState({ rating: 5, comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [tokenSymbol]);

  const fetchReviews = async () => {
    try {
      const normalizedSymbol = tokenSymbol.toLowerCase();
      const response = await fetch(`http://localhost:5000/api/reviews/token/${normalizedSymbol}`);
      const data = await response.json();
      console.log('Fetched reviews for symbol:', normalizedSymbol);
      console.log('Fetched reviews:', data);
      setReviews(data.reviews);
      setAverageRating(data.averageRating);
    } catch (error) {
      console.error('Error fetching reviews:', error);
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
      await submitReview({
        tokenSymbol: tokenSymbol.toLowerCase(),
        rating: userReview.rating,
        comment: userReview.comment
      }, currentUser.token);

      showNotification('Review submitted successfully!', 'success');
      setUserReview({ rating: 5, comment: '' });
      setShowReviewForm(false);
      await fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      showNotification(error.message || 'Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inline-flex items-center space-x-2">
      {/* Compact Rating Display */}
      <div 
        className="flex items-center cursor-pointer" 
        onClick={() => setShowReviewModal(true)}
        title="Click to see all reviews"
      >
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <FaStar
              key={star}
              className={star <= averageRating ? 'text-yellow-400' : 'text-gray-400'}
              size={16}
            />
          ))}
        </div>
        <span className="ml-1 text-sm text-gray-400">({reviews.length})</span>
      </div>

      {/* Add Review Button */}
      {currentUser && !showReviewForm && (
        <button
          onClick={() => setShowReviewForm(true)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          + Review
        </button>
      )}

      {/* Review Form Popover */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full relative">
            <button 
              onClick={() => setShowReviewForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            
            <h3 className="text-xl font-bold mb-4">Write a Review</h3>
            <form onSubmit={handleSubmitReview}>
              <div className="flex mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    className={`cursor-pointer ${
                      star <= userReview.rating ? 'text-yellow-400' : 'text-gray-400'
                    }`}
                    size={24}
                    onClick={() => setUserReview({ ...userReview, rating: star })}
                  />
                ))}
              </div>
              <textarea
                className="w-full p-2 bg-gray-700 rounded"
                value={userReview.comment}
                onChange={(e) => setUserReview({ ...userReview, comment: e.target.value })}
                placeholder="Write your review..."
                maxLength={500}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      <ReviewsModal 
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        reviews={reviews}
        averageRating={averageRating}
      />
    </div>
  );
};

export default TokenReviews; 