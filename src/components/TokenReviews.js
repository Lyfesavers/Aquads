import React, { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa';
import { submitReview } from '../services/api';

const ReviewsModal = ({ isOpen, onClose, reviews, averageRating, currentUser, onAddReview }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>
        
        <h3 className="text-xl font-bold mb-4">Reviews</h3>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
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
          
          {currentUser && (
            <button
              onClick={onAddReview}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Add Review
            </button>
          )}
        </div>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {reviews.map((review, index) => (
            <div key={index} className="border-t border-gray-700 pt-4">
              <div className="flex items-center mb-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={star <= review.rating ? 'text-yellow-400' : 'text-gray-400'}
                      size={16}
                    />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-400">
                  by {review.username}
                </span>
              </div>
              <p className="text-gray-300">{review.comment}</p>
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
      const response = await fetch(`/api/reviews/token/${normalizedSymbol}`);
      const data = await response.json();
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
      setAverageRating(0);
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
    <div className="flex items-center w-full px-2">
      <div 
        className="flex items-center cursor-pointer" 
        onClick={(e) => {
          e.stopPropagation();
          setShowReviewModal(true);
        }}
      >
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <FaStar
              key={star}
              className={star <= averageRating ? 'text-yellow-400' : 'text-gray-400'}
              size={14}
            />
          ))}
          <span className="ml-1 text-sm text-gray-400">({reviews.length})</span>
        </div>
      </div>

      {/* Reviews Modal */}
      <ReviewsModal 
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        reviews={reviews}
        averageRating={averageRating}
        currentUser={currentUser}
        onAddReview={() => setShowReviewForm(true)}
      />

      {/* Review Form Modal */}
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
                className="w-full p-2 bg-gray-700 rounded text-white"
                value={userReview.comment}
                onChange={(e) => setUserReview({ ...userReview, comment: e.target.value })}
                placeholder="Write your review..."
                maxLength={500}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenReviews; 