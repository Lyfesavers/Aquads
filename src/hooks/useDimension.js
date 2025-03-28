import { useState, useEffect } from 'react';

/**
 * Custom hook to track window dimensions 
 * @param {'width'|'height'} dimension - The dimension to track
 * @return {number} The current dimension value
 */
export function useDimension(dimension) {
  const [size, setSize] = useState(() => {
    // Initial size based on window's current size
    if (dimension === 'width') {
      return window.innerWidth;
    } else if (dimension === 'height') {
      return window.innerHeight;
    }
    return 0;
  });

  useEffect(() => {
    // Handler to call on window resize
    const updateSize = () => {
      if (dimension === 'width') {
        setSize(window.innerWidth);
      } else if (dimension === 'height') {
        setSize(window.innerHeight);
      }
    };

    // Add event listener
    window.addEventListener('resize', updateSize);
    
    // Call handler right away to initialize size
    updateSize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', updateSize);
  }, [dimension]); // Re-run effect if dimension changes

  return size;
}

// Also export as default for backwards compatibility
export default useDimension; 