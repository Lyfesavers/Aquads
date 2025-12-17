import React, { useEffect } from 'react';

const BuyCryptoModal = ({ isOpen, onClose }) => {
  // Open SimpleSwap page in popup window when modal opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Small delay to ensure modal state is set before opening popup
    const timer = setTimeout(() => {
      // Calculate popup window dimensions (Chrome extension style)
      const width = 700;
      const height = 850;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      // Open popup window with SimpleSwap page
      const popup = window.open(
        '/simpleswap',
        'SimpleSwapOnRamp',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        alert('Please allow popups to open the On/Off Ramp window');
        onClose();
        return;
      }

      // Close the modal immediately after opening popup
      // This prevents the overlay from interfering with the popup
      onClose();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  // Don't render anything - just handle the popup opening
  return null;
};

export default BuyCryptoModal;

