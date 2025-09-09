import React, { useEffect, useRef } from 'react';

const RippleEffect = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const createRipple = (e) => {
      // Don't create ripples on mobile to respect user preference
      if (window.innerWidth <= 768) return;
      
      // Don't create ripples on form elements to avoid interference
      const target = e.target;
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.closest('button') ||
          target.closest('input') ||
          target.closest('textarea') ||
          target.closest('select')) {
        return;
      }

      // Get click coordinates relative to viewport
      const rect = document.documentElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Create ripple element
      const ripple = document.createElement('div');
      ripple.className = 'ripple-effect';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      // Add to container
      container.appendChild(ripple);

      // Remove after animation completes
      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 1000); // Match CSS animation duration
    };

    // Add event listener with passive option for better performance
    document.addEventListener('click', createRipple, { passive: true });

    // Cleanup
    return () => {
      document.removeEventListener('click', createRipple);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="ripple-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 999999, // High z-index to appear above everything
        overflow: 'hidden'
      }}
    />
  );
};

export default RippleEffect;
