import React, { useEffect } from 'react';

const Modal = ({ children, onClose }) => {
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

  // Add style to restore normal cursor behavior in modals and ensure no pointer events bleed through
  const modalStyles = `
    .fixed[class*="z-[999999]"] *,
    .fixed[class*="z-[999999]"] {
      cursor: auto !important;
    }
    .fixed[class*="z-[999999]"] button,
    .fixed[class*="z-[999999]"] a,
    .fixed[class*="z-[999999]"] [role="button"],
    .fixed[class*="z-[999999]"] [type="button"],
    .fixed[class*="z-[999999]"] [type="submit"] {
      cursor: pointer !important;
    }
    .modal-backdrop {
      pointer-events: all !important;
    }
    .modal-content {
      pointer-events: all !important;
    }
  `;

  return (
    <>
      {/* Style tag to restore normal cursor behavior */}
      <style>{modalStyles}</style>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999] p-2 sm:p-4 overflow-y-auto modal-backdrop"
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
    </>
  );
};

export default Modal; 