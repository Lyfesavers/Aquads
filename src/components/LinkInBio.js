import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_URL } from '../services/api';
import { FaExternalLinkAlt } from 'react-icons/fa';

// Load distinctive fonts (Syne + DM Sans) for this page only
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap';
if (!document.querySelector('link[href*="Syne"]')) document.head.appendChild(fontLink);

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 }
  }
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 }
};

const LinkInBio = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) {
      setError('Invalid page');
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/users/links/${encodeURIComponent(username)}`);
        if (!res.ok) {
          if (res.status === 404) setError('Page not found');
          else setError('Failed to load');
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, #0c0f1a 0%, #0a0e18 40%, #060910 100%)',
          fontFamily: "'DM Sans', sans-serif"
        }}
      >
        {/* Soft orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[80%] rounded-full bg-cyan-500/[0.04] blur-[80px]" />
          <div className="absolute bottom-0 right-0 w-[70%] h-[50%] rounded-full bg-blue-500/[0.03] blur-[100px]" />
        </div>
        <div className="relative flex flex-col items-center gap-6">
          <div className="w-28 h-28 rounded-full bg-white/5 animate-pulse" style={{ boxShadow: '0 0 60px rgba(34, 211, 238, 0.08)' }} />
          <div className="h-6 w-44 rounded-full bg-white/10 animate-pulse" />
          <div className="flex flex-col gap-3 w-full max-w-sm">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background: 'linear-gradient(165deg, #0c0f1a 0%, #0a0e18 100%)',
          fontFamily: "'DM Sans', sans-serif"
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-slate-400 text-lg mb-4">{error || 'Page not found'}</p>
          <a
            href="https://www.aquads.xyz"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors text-sm font-medium"
          >
            Go to Aquads.xyz
          </a>
        </motion.div>
      </div>
    );
  }

  const { displayName, image, bioLinks } = data;
  const hasLinks = Array.isArray(bioLinks) && bioLinks.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center px-4 py-12 pb-20 relative overflow-hidden"
      style={{
        background: 'linear-gradient(165deg, #0c0f1a 0%, #0a0e18 40%, #060910 100%)',
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      {/* Layered background orbs for depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[140%] h-[90%] rounded-full bg-cyan-500/[0.06] blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[90%] h-[60%] rounded-full bg-blue-500/[0.04] blur-[120px] translate-y-1/4" />
        <div className="absolute bottom-1/3 left-0 w-[60%] h-[40%] rounded-full bg-teal-500/[0.03] blur-[80px]" />
        {/* Subtle grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />
      </div>

      <div className="relative w-full max-w-md flex flex-col items-center">
        {/* Avatar with soft glow ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6"
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.4) 0%, rgba(59, 130, 246, 0.2) 50%, transparent 100%)',
              filter: 'blur(20px)',
              opacity: 0.6
            }}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <img
            src={image}
            alt=""
            className="relative w-28 h-28 rounded-full object-cover border-2 border-white/10 shadow-xl"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 80px rgba(34, 211, 238, 0.12)' }}
          />
        </motion.div>

        {/* Display name — distinctive typography */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-2xl font-semibold text-white tracking-tight mb-10 text-center"
          style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.02em' }}
        >
          {displayName}
        </motion.h1>

        {/* Links — staggered entrance + premium hover */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full space-y-3"
        >
          {hasLinks ? (
            bioLinks.map((link, i) => (
              <motion.a
                key={i}
                variants={item}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between w-full px-5 py-4 rounded-2xl text-left relative overflow-hidden transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(12px)'
                }}
                whileHover={{
                  scale: 1.02,
                  y: -2,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Hover shine sweep */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(105deg, transparent 0%, rgba(34, 211, 238, 0.06) 45%, rgba(34, 211, 238, 0.03) 55%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'linkInBioShine 0.6s ease-out'
                  }}
                />
                <span className="relative text-white font-medium truncate pr-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {link.title}
                </span>
                <span
                  className="relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-400"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <FaExternalLinkAlt className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </motion.a>
            ))
          ) : (
            <motion.p variants={item} className="text-slate-500 text-center py-10 text-sm">
              No links yet.
            </motion.p>
          )}
        </motion.div>

        {/* Powered by — premium pill badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-auto pt-14 flex flex-col items-center gap-3"
        >
          <a
            href="https://www.aquads.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-white/10 transition-all duration-300 hover:border-cyan-500/30 hover:bg-cyan-500/5"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <span className="text-slate-500 text-xs font-medium">Powered by</span>
            <span className="text-cyan-400/90 font-semibold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
              Aquads.xyz
            </span>
            <img
              src="/Aquadsnewlogo.png"
              alt="Aquads"
              className="h-5 opacity-70"
              style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.25))' }}
            />
          </a>
        </motion.div>
      </div>

      {/* Keyframe for hover shine — inject once */}
      <style>{`
        @keyframes linkInBioShine {
          from { background-position: 200% 0; }
          to   { background-position: -100% 0; }
        }
      `}</style>
    </motion.div>
  );
};

export default LinkInBio;
