import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const TokenReviews = ({ token, onClose, currentUser, showNotification }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [token.symbol]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reviews/${token.symbol}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(data);
      
      // Calculate average rating
      if (data.length > 0) {
        const avg = data.reduce((acc, rev) => acc + rev.rating, 0) / data.length;
        setAverageRating(avg);
        setTotalReviews(data.length);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showNotification('Please login to submit a review', 'error');
      return;
    }

    try {
      const savedUser = localStorage.getItem('currentUser');
      const userData = JSON.parse(savedUser);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.token}`
        },
        body: JSON.stringify({
          tokenSymbol: token.symbol,
          rating: newReview.rating,
          comment: newReview.comment
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit review');
      }

      const data = await response.json();
      setReviews([data, ...reviews]);
      setNewReview({ rating: 5, comment: '' });
      showNotification('Review submitted successfully!', 'success');
      
      // Refresh reviews to update average
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
          <h2 className="text-2xl font-bold">Reviews for {token.name}</h2>
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
        
        {currentUser && (
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
              <label className="block mb-2">Comment</label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                className="w-full bg-gray-700 rounded p-2 min-h-[100px]"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded w-full"
            >
              Submit Review
            </button>
          </form>
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

export default TokenReviews; 