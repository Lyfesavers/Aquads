import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        onClose && onClose();
      }, 300); // Allow fade-out animation to complete
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const getBackgroundColor = () => {
    switch(type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };
  
  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 p-4 rounded-md shadow-lg text-white ${getBackgroundColor()} 
        transition-opacity duration-300 ease-in-out ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {message}
    </div>
  );
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  
  // Add a new toast
  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  };
  
  // Remove a toast by id
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  // Create a container if it doesn't exist
  useEffect(() => {
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    return () => {
      if (toastContainer && document.body.contains(toastContainer)) {
        document.body.removeChild(toastContainer);
      }
    };
  }, []);
  
  return ReactDOM.createPortal(
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map(toast => (
        <Toast 
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>,
    document.getElementById('toast-container')
  );
};

// Singleton for toast management
let toastManager = null;

export const showToast = (message, type = 'info', duration = 3000) => {
  if (!toastManager) {
    // Create a container element
    const containerElement = document.createElement('div');
    document.body.appendChild(containerElement);
    
    // Render the ToastContainer into it
    ReactDOM.render(<ToastContainer ref={ref => { toastManager = ref; }} />, containerElement);
  }
  
  // Use the instance to show a toast
  return toastManager?.addToast(message, type, duration);
};

export default Toast; 