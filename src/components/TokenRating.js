import React, { useState, useEffect } from 'react';

const TokenRating = ({ symbol }) => {
  const [rating, setRating] = useState('0.0');

  useEffect(() => {
    fetchTokenRating();
  }, [symbol]);

  const fetchTokenRating = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/reviews/${symbol.toLowerCase()}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const reviews = await response.json();
      
      if (reviews && reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + Number(review.rating), 0);
        const avgRating = (totalRating / reviews.length).toFixed(1);
        setRating(avgRating);
      }
    } catch (error) {
      console.error('Error fetching token rating:', error);
    }
  };

  return (
    <span>
      {rating}
    </span>
  );
};

export default TokenRating; 