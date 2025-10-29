import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ children, onClose, fullScreen = false }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Handle backdrop click (close when clicking outside the modal)
  const handleBackdropClick = (e) => {
    // Only close if clicking directly on the backdrop, not on modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Stop propagation for all clicks inside the modal content
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  // Simplified style to ensure proper z-index and pointer events
  const modalStyles = `
    .modal-backdrop {
      pointer-events: all !important;
    }
    .modal-content {
      pointer-events: all !important;
    }
  `;

  const modalContent = (
    <>
      {/* Style tag for modal */}
      <style>{modalStyles}</style>
      {fullScreen ? (
        <div 
          className="fixed inset-0 bg-gray-900 z-[2147483647] modal-backdrop"
          onClick={handleBackdropClick}
        >
          <div 
            className="w-full h-full relative modal-content"
            onClick={handleModalContentClick}
          >
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-3xl focus:outline-none p-2 bg-gray-800 rounded-full"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="w-full h-full overflow-y-auto p-4 sm:p-6">
              {children}
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2147483647] p-2 sm:p-4 overflow-y-auto modal-backdrop"
          onClick={handleBackdropClick}
        >
          <div 
            className="bg-gray-800 rounded-lg p-3 sm:p-6 w-full max-w-md mx-auto my-4 sm:my-8 relative modal-content"
            onClick={handleModalContentClick}
          >
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
      )}
    </>
  );

  // Use createPortal to render the modal at the document body level
  return createPortal(modalContent, document.body);
};

export default Modal; 