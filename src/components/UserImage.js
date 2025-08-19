import React from 'react';

const UserImage = ({ src, alt, className = "w-10 h-10 rounded-full object-cover" }) => {
  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return 'https://placehold.co/400x400?text=User';
    }
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return 'https://placehold.co/400x400?text=User';
  };

  return (
    <img
      src={getImageUrl(src)}
      alt={alt || 'User'}
      className={className}
      onError={(e) => {
        e.target.src = 'https://placehold.co/400x400?text=User';
      }}
    />
  );
};

export default UserImage;
