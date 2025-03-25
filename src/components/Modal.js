import React, { useEffect } from 'react';

const Modal = ({ children, onClose }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[99999] p-2 sm:p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg p-3 sm:p-6 w-full max-w-md mx-auto my-4 sm:my-8 relative shadow-xl">
        <div className="flex justify-end mb-2 sm:mb-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl focus:outline-none p-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto pb-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 