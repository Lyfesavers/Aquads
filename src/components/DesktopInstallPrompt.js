import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import usePWAInstall from '../hooks/usePWAInstall';
import { FaDownload, FaTimes } from 'react-icons/fa';

const DISMISS_KEY = 'aquads-desktop-install-dismissed';

const DesktopInstallPrompt = () => {
  const location = useLocation();
  const { isInstallable, isDesktop, handleInstallClick } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    setIsDismissed(wasDismissed);
  }, []);

  useEffect(() => {
    const onHomePage = location.pathname === '/home';
    const shouldShow = onHomePage && isDesktop && isInstallable && !isDismissed;
    setIsVisible(shouldShow);
  }, [location.pathname, isDesktop, isInstallable, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  const handleInstall = () => {
    handleInstallClick();
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-6 z-[199999] max-w-sm"
        >
          <div className="bg-gray-800/95 backdrop-blur-md border border-gray-600/50 rounded-xl shadow-xl p-4 flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <FaDownload className="text-cyan-400 text-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Get the desktop app</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Install Aquads for quick access and a better experience.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-gray-400 hover:text-gray-300 text-xs transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-500 hover:text-gray-300 p-1 -mt-1 -mr-1 transition-colors"
              aria-label="Close"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DesktopInstallPrompt;
