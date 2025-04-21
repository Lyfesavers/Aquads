import React, { useState, useEffect } from 'react';

const TokenRating = ({ symbol }) => {
  const [rating, setRating] = useState('0.0');
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [symbol]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/reviews/${symbol.toLowerCase()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        // Calculate average rating
        const totalRating = data.reduce((acc, review) => acc + review.rating, 0);
        const avgRating = totalRating / data.length;
        setRating(avgRating);
        setCount(data.length);
      } else {
        setRating(0);
        setCount(0);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span>
      {loading ? 'Loading...' : rating}
    </span>
  );
};

export default TokenRating; 