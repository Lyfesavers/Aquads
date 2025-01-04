import React from 'react';

const Modal = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md mx-auto my-8 relative">
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl focus:outline-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 