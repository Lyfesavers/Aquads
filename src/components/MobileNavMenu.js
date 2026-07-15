import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/** Animated cyan hamburger — matches home page (App.js). */
export function MobileHamburgerButton({ isOpen, onClick }) {
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={onClick}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm"
        aria-label="Toggle menu"
      >
        <div className="relative w-5 h-4 flex flex-col justify-between">
          <motion.span
            className="w-full h-0.5 bg-cyan-400 rounded-full origin-center"
            animate={isOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="w-full h-0.5 bg-cyan-400 rounded-full"
            animate={isOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="w-full h-0.5 bg-cyan-400 rounded-full origin-center"
            animate={isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </button>
    </div>
  );
}

/** Backdrop + animated dropdown panel — matches home page (App.js). */
export function MobileMenuPanel({
  isOpen,
  onClose,
  children,
  backdropClassName = 'md:hidden fixed inset-0 bg-black/50 z-[199999]',
  panelClassName = 'md:hidden absolute top-full left-0 right-0 mt-2 mx-4 z-[200000] max-h-[85vh] flex flex-col',
}) {
  return (
    <div className="absolute left-0 right-0 top-full pointer-events-none md:pointer-events-auto" style={{ minHeight: 0 }}>
      <div className="pointer-events-auto">
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                className={backdropClassName}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
              />
              <motion.div
                className={panelClassName}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden overscroll-contain">
                  <div className="p-2">{children}</div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function MobileNavDivider() {
  return <div className="h-px bg-white/10 my-2" />;
}

export function MobileNavLink({ to, onClick, icon, label, className = 'hover:bg-white/5' }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white transition-all w-full ${className}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export function MobileNavButton({ onClick, icon, label, className = 'hover:bg-white/5' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white transition-all w-full text-left ${className}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

/** Login/register or welcome + optional logged-in actions + logout. */
export function MobileNavAuthSection({
  currentUser,
  displayName,
  onClose,
  onLogin,
  onCreateAccount,
  onLogout,
  notificationBell,
  loggedInExtras,
}) {
  if (currentUser) {
    return (
      <>
        <MobileNavDivider />
        {notificationBell}
        {displayName && (
          <span className="block px-4 py-2 text-blue-300 text-sm">Welcome, {displayName}!</span>
        )}
        {loggedInExtras}
        <MobileNavDivider />
        <MobileNavButton
          onClick={() => {
            onLogout?.();
            onClose?.();
          }}
          icon="🚪"
          label="Logout"
          className="hover:bg-red-500/20"
        />
      </>
    );
  }

  return (
    <>
      <MobileNavDivider />
      <MobileNavButton
        onClick={() => {
          onLogin?.();
          onClose?.();
        }}
        icon="🔑"
        label="Login"
        className="hover:bg-cyan-500/10"
      />
      <MobileNavButton
        onClick={() => {
          onCreateAccount?.();
          onClose?.();
        }}
        icon="✨"
        label="Create Account"
      />
    </>
  );
}
