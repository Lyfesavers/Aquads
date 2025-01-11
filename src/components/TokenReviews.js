import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const TokenReviews = ({ token, onClose, currentUser, showNotification }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [token.id]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reviews/${token.id}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(data);
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
          tokenId: token.id,
          ...newReview
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
    } catch (error) {
      console.error('Error submitting review:', error);
      showNotification(error.message || 'Failed to submit review', 'error');
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-white">
        <h2 className="text-2xl font-bold mb-4">Reviews for {token.name}</h2>
        
        {currentUser && (
          <form onSubmit={handleSubmitReview} className="mb-6">
            <div className="mb-4">
              <label className="block mb-2">Rating</label>
              <select
                value={newReview.rating}
                onChange={(e) => setNewReview(prev => ({ ...prev, rating: Number(e.target.value) }))}
                className="w-full bg-gray-700 rounded p-2"
              >
                {[5, 4, 3, 2, 1].map(num => (
                  <option key={num} value={num}>{num} Stars</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-2">Comment</label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                className="w-full bg-gray-700 rounded p-2"
                rows="3"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
            >
              Submit Review
            </button>
          </form>
        )}

        {isLoading ? (
          <p>Loading reviews...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : reviews.length === 0 ? (
          <p>No reviews yet. Be the first to review!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review._id} className="bg-gray-700 rounded p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{review.username}</p>
                    <p className="text-yellow-400">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</p>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TokenReviews; 