import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import logger from '../utils/logger';

const PWAInstallContext = createContext(null);

/**
 * Single app-wide listener for beforeinstallprompt (Chrome/Edge).
 * Footer + DesktopInstallPrompt must not each register their own — duplicate handlers
 * double-preventDefault and break deferredPrompt; Chrome also logs install-banner noise.
 */
export const PWAInstallProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    const isDesktopDevice = !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsDesktop(isDesktopDevice);

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstallable(false);
      return undefined;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (iOS && !isStandalone) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (isIOS) {
      window.alert(
        'To install Aquads on your iOS device:\n\n' +
          '1. Tap the Share button (square with arrow)\n' +
          '2. Scroll down and tap "Add to Home Screen"\n' +
          '3. Tap "Add" to confirm\n\n' +
          'The Aquads app will then appear on your home screen!'
      );
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      logger.info('User accepted the install prompt');
    } else {
      logger.info('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  }, [deferredPrompt, isIOS]);

  const value = useMemo(
    () => ({
      isInstallable,
      isIOS,
      isDesktop,
      handleInstallClick,
    }),
    [isInstallable, isIOS, isDesktop, handleInstallClick]
  );

  return <PWAInstallContext.Provider value={value}>{children}</PWAInstallContext.Provider>;
};

export const usePWAInstall = () => {
  const ctx = useContext(PWAInstallContext);
  if (!ctx) {
    throw new Error('usePWAInstall must be used within PWAInstallProvider');
  }
  return ctx;
};
