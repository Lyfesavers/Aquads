import React, { useState, useEffect, useRef } from 'react';
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

class ToastContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      toasts: []
    };
    this.containerRef = React.createRef();
  }
  
  // Add a new toast
  addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    this.setState(prevState => ({
      toasts: [...prevState.toasts, { id, message, type, duration }]
    }));
    return id;
  };
  
  // Remove a toast by id
  removeToast = (id) => {
    this.setState(prevState => ({
      toasts: prevState.toasts.filter(toast => toast.id !== id)
    }));
  };
  
  componentDidMount() {
    // Ensure the container exists in DOM
    if (!document.getElementById('toast-container')) {
      const containerDiv = document.createElement('div');
      containerDiv.id = 'toast-container';
      document.body.appendChild(containerDiv);
    }
  }
  
  render() {
    const toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
      return null;
    }
    
    return ReactDOM.createPortal(
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {this.state.toasts.map(toast => (
          <Toast 
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => this.removeToast(toast.id)}
          />
        ))}
      </div>,
      toastContainer
    );
  }
}

// Singleton for toast management
let toastContainerInstance = null;

// Create the toast container once on initial import
const initToastContainer = () => {
  if (!toastContainerInstance) {
    const containerElement = document.createElement('div');
    document.body.appendChild(containerElement);
    
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    
    const toastContainerComponent = ReactDOM.render(
      <ToastContainer />, 
      containerElement
    );
    
    toastContainerInstance = toastContainerComponent;
  }
  
  return toastContainerInstance;
};

// Initialize on import
initToastContainer();

export const showToast = (message, type = 'info', duration = 3000) => {
  const instance = initToastContainer();
  if (instance && instance.addToast) {
    return instance.addToast(message, type, duration);
  }
  // Fallback to alert if the toast system fails
  console.warn('Toast system unavailable, falling back to alert');
  alert(`${type.toUpperCase()}: ${message}`);
};

export default Toast; 