import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL, socket } from '../services/api';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import Footer from './Footer';
import NotificationBell from './NotificationBell';
import { getDisplayName } from '../utils/nameUtils';

const CATEGORIES = [
  { id: 'development', label: 'Development', icon: '💻' },
  { id: 'design', label: 'Design', icon: '🎨' },
  { id: 'content', label: 'Content', icon: '✍️' },
  { id: 'marketing', label: 'Marketing', icon: '📣' },
  { id: 'community', label: 'Community', icon: '🤝' },
  { id: 'research', label: 'Research', icon: '🔬' },
  { id: 'other', label: 'Other', icon: '⭐' }
];

const categoryMeta = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const statusBadge = (status) => {
  switch (status) {
    case 'open': return { label: 'Open', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
    case 'completed': return { label: 'Awarded', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
    case 'cancelled': return { label: 'Cancelled', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/30' };
    default: return { label: status, cls: 'bg-gray-500/15 text-gray-400 border-gray-500/30' };
  }
};

const timeAgo = (date) => {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
};

const initialOf = (name) => (name || '?').trim().charAt(0).toUpperCase();

// Static class maps so Tailwind keeps them (no dynamic string concatenation).
const URGENCY = {
  green: { text: 'text-emerald-400', bar: 'bg-emerald-500' },
  amber: { text: 'text-amber-400', bar: 'bg-amber-500' },
  red: { text: 'text-red-400', bar: 'bg-red-500' },
  slate: { text: 'text-slate-500', bar: 'bg-slate-600' }
};

// Deadline urgency: green when plenty of time, amber as it nears, red when close/over.
const deadlineInfo = (bounty) => {
  if (!bounty?.deadline) return { text: 'No deadline', color: 'slate', pct: 0, hasBar: false };
  const end = new Date(bounty.deadline).getTime();
  const start = new Date(bounty.createdAt || Date.now()).getTime();
  const now = Date.now();
  if (now >= end) return { text: 'Ended', color: 'red', pct: 100, hasBar: true };
  const total = Math.max(end - start, 1);
  const elapsed = Math.min(Math.max(now - start, 0), total);
  const pct = Math.min(100, Math.round((elapsed / total) * 100));
  const remainFrac = (end - now) / total;
  const days = Math.ceil((end - now) / 86400000);
  let color = 'green';
  if (remainFrac <= 0.2) color = 'red';
  else if (remainFrac <= 0.5) color = 'amber';
  return { text: days <= 1 ? 'Ends today' : `${days} days left`, color, pct, hasBar: true };
};

const Bounties = ({ currentUser, onLogin, onLogout, onCreateAccount, showNotification, openMintFunnelPlatform }) => {
  const navigate = useNavigate();

  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [myProjects, setMyProjects] = useState([]);
  const [showPostModal, setShowPostModal] = useState(false);

  const [selectedBounty, setSelectedBounty] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const notify = useCallback((msg, type = 'info') => {
    if (showNotification) showNotification(msg, type);
  }, [showNotification]);

  const fetchBounties = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const res = await axios.get(`${API_URL}/bounties`, { params });
      if (res.data.success) setBounties(res.data.bounties);
    } catch (err) {
      console.error('Failed to load bounties', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchBounties();
  }, [fetchBounties]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUser?.token) { setMyProjects([]); return; }
      try {
        const res = await axios.get(`${API_URL}/bounties/my-projects`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        if (res.data.success) setMyProjects(res.data.projects);
      } catch { /* ignore */ }
    };
    fetchProjects();
  }, [currentUser]);

  useEffect(() => {
    const onUpdate = () => fetchBounties();
    socket.on('bountyListUpdated', onUpdate);
    return () => socket.off('bountyListUpdated', onUpdate);
  }, [fetchBounties]);

  const openDetail = async (bountyId) => {
    setDetailLoading(true);
    setSelectedBounty({ _id: bountyId });
    try {
      const headers = currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {};
      const res = await axios.get(`${API_URL}/bounties/${bountyId}`, { headers });
      if (res.data.success) setSelectedBounty(res.data.bounty);
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to load bounty', 'error');
      setSelectedBounty(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePostClick = () => {
    if (!currentUser) { setShowLoginModal(true); return; }
    if (!myProjects.length) {
      notify('You need an active project listing to post a bounty.', 'error');
      return;
    }
    setShowPostModal(true);
  };

  const visibleBounties = bounties;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col">
      <Helmet>
        <title>Web3 Bounties — Earn crypto for tasks | Aquads</title>
        <meta name="description" content="Browse and complete Web3 bounties on Aquads. Projects post paid tasks with rewards held in Aquads escrow and paid out on approval." />
        <link rel="canonical" href="https://www.aquads.xyz/bounties" />
      </Helmet>

      {/* Navigation - consistent with home/marketplace header */}
      <nav className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/home" className="flex items-center">
                <img src="/alogo.png" alt="AQUADS" className="aquads-nav-logo" />
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-300 hover:text-white p-3 rounded-md"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-3">
              <Link to="/marketplace" className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400">
                Freelancer
              </Link>
              <Link to="/games" className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400">
                Games
              </Link>
              <button onClick={openMintFunnelPlatform} className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400">
                Paid Ads
              </button>
              <Link to="/learn" className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400">
                Learn
              </Link>
              <Link to="/list-token-free" className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400">
                List token free
              </Link>
              <Link to="/claim-bubble" className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400">
                Claim bubble
              </Link>

              {currentUser ? (
                <>
                  <NotificationBell currentUser={currentUser} />

                  {/* User Dropdown */}
                  <div className="relative user-dropdown">
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                    >
                      <span className="mr-1">{getDisplayName(currentUser)}</span>
                      <svg className={`w-4 h-4 ml-1 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {showUserDropdown && (
                      <div className="absolute right-0 mt-2 w-52 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 z-[60]">
                        <div className="py-2">
                          <Link to="/dashboard" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/50 transition-colors">📊 Dashboard</Link>
                          <Link to="/claim-bubble" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-teal-600/50 transition-colors">🫧 Claim your bubble</Link>
                          <hr className="my-2 border-gray-700" />
                          <Link to="/aquafi" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">💧 AquaFi</Link>
                          <Link to="/aquaswap" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">💱 AquaSwap</Link>
                          <Link to="/partner-rewards" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">🤝 Partners</Link>
                          <Link to="/telegram-bot" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">🤖 Telegram Bot</Link>
                          <Link to="/aquapay" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">💸 AquaPay</Link>
                          <Link to="/hyperspace" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">🚀 HyperSpace</Link>
                          <hr className="my-2 border-gray-700" />
                          <button onClick={() => { onLogout(); setShowUserDropdown(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-600/50 transition-colors">🚪 Logout</button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => setShowLoginModal(true)} className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400">
                    Login
                  </button>
                  <button onClick={() => setShowCreateAccountModal(true)} className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400">
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden py-2 relative z-50`}>
            <div className="flex flex-col space-y-2">
              <Link to="/home" onClick={() => setIsMobileMenuOpen(false)} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-center text-yellow-400">
                Home
              </Link>
              <Link to="/marketplace" onClick={() => setIsMobileMenuOpen(false)} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-center text-yellow-400">
                Freelancer
              </Link>
              <Link to="/games" onClick={() => setIsMobileMenuOpen(false)} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-center text-yellow-400">
                GameHub
              </Link>
              <button onClick={() => { openMintFunnelPlatform(); setIsMobileMenuOpen(false); }} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-center text-yellow-400">
                Paid Ads
              </button>
              <Link to="/learn" onClick={() => setIsMobileMenuOpen(false)} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-center text-yellow-400">
                Learn
              </Link>
              <Link to="/list-token-free" onClick={() => setIsMobileMenuOpen(false)} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-center text-yellow-400">
                List token free
              </Link>
              <Link to="/claim-bubble" onClick={() => setIsMobileMenuOpen(false)} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-center text-yellow-400">
                Claim bubble
              </Link>
              {currentUser ? (
                <>
                  <div className="flex justify-center">
                    <NotificationBell currentUser={currentUser} />
                  </div>
                  <span className="text-blue-300 text-center">Welcome, {getDisplayName(currentUser)}!</span>
                  <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400 block text-center">
                    Dashboard
                  </Link>
                  <Link to="/aquafi" onClick={() => setIsMobileMenuOpen(false)} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400 block text-center">
                    AquaFi
                  </Link>
                  <Link to="/aquaswap" onClick={() => setIsMobileMenuOpen(false)} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400 block text-center">
                    AquaSwap
                  </Link>
                  <Link to="/aquapay" onClick={() => setIsMobileMenuOpen(false)} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400 block text-center">
                    AquaPay
                  </Link>
                  <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setShowLoginModal(true); setIsMobileMenuOpen(false); }} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400">
                    Login
                  </button>
                  <button onClick={() => { setShowCreateAccountModal(true); setIsMobileMenuOpen(false); }} className="bg-gray-700/90 hover:bg-gray-600/90 px-4 py-2 rounded shadow-lg transition-all duration-300 backdrop-blur-sm text-yellow-400">
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Web3 Bounties
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl">
              Projects post paid tasks. Complete a bounty, submit your work, and get paid in crypto — rewards are secured in Aquads escrow and released when your submission is approved.
            </p>
          </div>
          <button
            onClick={handlePostClick}
            className="self-start md:self-auto px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-semibold shadow-lg transition-all whitespace-nowrap"
          >
            + Post a Bounty
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex bg-slate-800/60 rounded-lg overflow-hidden border border-slate-700/50">
            {['open', 'completed', 'all'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-sm capitalize transition-colors ${statusFilter === s ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700/60'}`}>
                {s === 'all' ? 'All' : s === 'completed' ? 'Awarded' : 'Open'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${categoryFilter === 'all' ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'}`}>
              All categories
            </button>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategoryFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${categoryFilter === c.id ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'}`}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bounty grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : visibleBounties.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-slate-300">No bounties yet</h3>
            <p className="text-slate-500 mt-2">Be the first project to post a bounty and attract top talent.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {visibleBounties.map((b, i) => {
              const cat = categoryMeta(b.category);
              const badge = statusBadge(b.status);
              const di = deadlineInfo(b);
              const u = URGENCY[di.color];
              return (
                <motion.button key={b._id} onClick={() => openDetail(b._id)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                  className="text-left bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-cyan-500/40 rounded-xl overflow-hidden transition-all group flex flex-col">
                  {/* Escrow trust ribbon */}
                  <div className={`flex items-center gap-1 px-3 py-1 text-[10px] font-medium border-b ${
                    b.status === 'completed'
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  }`}>
                    <span>{b.status === 'completed' ? '✓' : '🔒'}</span>
                    <span className="truncate">{b.status === 'completed' ? 'Released from escrow' : 'Secured in escrow'}</span>
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    {/* Poster header: big logo/avatar + status */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-14 h-14 rounded-xl flex-shrink-0 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-slate-600/50 flex items-center justify-center text-xl font-bold text-cyan-200 relative overflow-hidden">
                        <span>{initialOf(b.projectName || b.posterUsername)}</span>
                        {(b.projectLogo || b.posterImage) && (
                          <img src={b.projectLogo || b.posterImage} alt="" className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
                        <p className="text-xs text-slate-400 truncate mt-1.5" title={b.projectName || b.posterUsername}>{b.projectName || b.posterUsername}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{cat.icon} {cat.label}</p>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mt-2.5 leading-snug">{b.title}</h3>

                    <div className="mt-auto pt-2.5">
                      <div className="flex items-end justify-between gap-2">
                        <span className="text-lg font-bold text-emerald-400 leading-none">${b.amount} <span className="text-[10px] text-slate-500 font-normal">{b.currency}</span></span>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">{b.submissionCount || 0} subs</span>
                      </div>
                      {/* Deadline urgency + progress bar */}
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={u.text}>{di.text}</span>
                        </div>
                        {di.hasBar && (
                          <div className="h-1 rounded-full bg-slate-700/60 overflow-hidden">
                            <div className={`h-full rounded-full ${u.bar}`} style={{ width: `${di.pct}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      {showPostModal && (
        <PostBountyModal
          currentUser={currentUser}
          projects={myProjects}
          onClose={() => setShowPostModal(false)}
          onCreated={(escrowId) => { setShowPostModal(false); navigate(`/bounty-pay/${escrowId}`); }}
          notify={notify}
        />
      )}

      <AnimatePresence>
        {selectedBounty && (
          <BountyDetailModal
            key="bounty-detail"
            bountyId={selectedBounty._id}
            bounty={selectedBounty}
            loading={detailLoading}
            currentUser={currentUser}
            onClose={() => setSelectedBounty(null)}
            onRequireLogin={() => { setSelectedBounty(null); setShowLoginModal(true); }}
            onChanged={() => { openDetail(selectedBounty._id); fetchBounties(); }}
            navigate={navigate}
            notify={notify}
          />
        )}
      </AnimatePresence>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={async (creds) => { await onLogin(creds); setShowLoginModal(false); }}
          onCreateAccount={() => { setShowLoginModal(false); setShowCreateAccountModal(true); }}
        />
      )}
      {showCreateAccountModal && (
        <CreateAccountModal
          onClose={() => setShowCreateAccountModal(false)}
          onCreateAccount={async (data) => { await onCreateAccount(data); setShowCreateAccountModal(false); }}
          onLogin={() => { setShowCreateAccountModal(false); setShowLoginModal(true); }}
        />
      )}
    </div>
  );
};

const PostBountyModal = ({ currentUser, projects, onClose, onCreated, notify }) => {
  const [form, setForm] = useState({
    title: '', description: '', deliverables: '', rules: '', category: 'development',
    amount: '', deadline: '', projectAdId: projects[0]?.id || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.amount) {
      notify('Title, description and reward amount are required.', 'error');
      return;
    }
    if (parseFloat(form.amount) < 1) {
      notify('Reward must be at least 1 USDC.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/bounties`, {
        ...form,
        amount: parseFloat(form.amount)
      }, { headers: { Authorization: `Bearer ${currentUser.token}` } });
      if (res.data.success) {
        notify('Bounty created — fund the escrow to publish it.', 'success');
        onCreated(res.data.escrowId);
      }
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to create bounty', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-lg w-full my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="text-xl font-semibold">Post a Bounty</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Title *</label>
            <input value={form.title} onChange={e => update('title', e.target.value)} maxLength={140}
              placeholder="e.g. Design a logo for our token launch"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none" />
          </div>
          {projects.length > 0 && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Project</label>
              <select value={form.projectAdId} onChange={e => update('projectAdId', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none">
                <option value="">— No specific project —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4}
              placeholder="Describe the task and what a great result looks like."
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Deliverables</label>
            <textarea value={form.deliverables} onChange={e => update('deliverables', e.target.value)} rows={3}
              placeholder="What must be submitted to win (files, links, format...)"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Rules & Eligibility</label>
            <textarea value={form.rules} onChange={e => update('rules', e.target.value)} rows={3}
              placeholder="Rules participants must follow — eligibility, judging criteria, do's & don'ts, deadlines, originality, etc."
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Category</label>
              <select value={form.category} onChange={e => update('category', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none">
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Reward (USDC) *</label>
              <input type="number" min="1" step="1" value={form.amount} onChange={e => update('amount', e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Deadline (optional)</label>
            <input type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none" />
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 text-xs text-cyan-200/80">
            After creating, you'll fund the reward into Aquads escrow. The bounty goes live once the deposit is confirmed. Funds are released to the winner you approve, minus a 1.25% platform fee.
          </div>
        </div>
        <div className="p-5 border-t border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={submit} disabled={submitting}
            className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg text-sm font-semibold disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create & Fund'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditBountyModal = ({ bountyId, bounty, currentUser, onClose, onSaved, notify }) => {
  const toDateInput = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toISOString().slice(0, 10);
  };
  const [form, setForm] = useState({
    title: bounty.title || '',
    description: bounty.description || '',
    deliverables: bounty.deliverables || '',
    rules: bounty.rules || '',
    category: bounty.category || 'other',
    deadline: toDateInput(bounty.deadline)
  });
  const [saving, setSaving] = useState(false);
  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      notify('Title and description are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await axios.patch(`${API_URL}/bounties/${bountyId}`, {
        title: form.title,
        description: form.description,
        deliverables: form.deliverables,
        rules: form.rules,
        category: form.category,
        deadline: form.deadline || null
      }, { headers: { Authorization: `Bearer ${currentUser.token}` } });
      notify('Bounty updated.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update bounty', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-lg w-full my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="text-xl font-semibold">Edit Bounty</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Title *</label>
            <input value={form.title} onChange={e => update('title', e.target.value)} maxLength={140}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Deliverables</label>
            <textarea value={form.deliverables} onChange={e => update('deliverables', e.target.value)} rows={3}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Rules & Eligibility</label>
            <textarea value={form.rules} onChange={e => update('rules', e.target.value)} rows={3}
              placeholder="Rules participants must follow — eligibility, judging criteria, do's & don'ts, deadlines, originality, etc."
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Category</label>
              <select value={form.category} onChange={e => update('category', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none">
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Reward (locked)</label>
              <div className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-slate-400 text-sm flex items-center gap-1">
                🔒 ${bounty.amount} {bounty.currency}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Deadline (can only be extended)</label>
            <input type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none" />
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 text-xs text-slate-400">
            The reward amount can't be changed — it's already secured in escrow. If you edit the scope after hunters have submitted, the bounty will be marked as edited for transparency.
          </div>
        </div>
        <div className="p-5 border-t border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const BountyDetailModal = ({ bountyId, bounty, loading, currentUser, onClose, onRequireLogin, onChanged, navigate, notify }) => {
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionDesc, setSubmissionDesc] = useState('');
  const [working, setWorking] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);

  const myId = (currentUser?.userId || currentUser?._id || currentUser?.id)?.toString();
  const isPoster = currentUser && bounty?.posterId && bounty.posterId.toString() === myId;

  const loadComments = useCallback(async () => {
    if (!bountyId) return;
    try {
      const res = await axios.get(`${API_URL}/bounties/${bountyId}/comments`);
      if (res.data.success) setComments(res.data.comments);
    } catch { /* ignore */ }
  }, [bountyId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  useEffect(() => {
    const onComment = (data) => {
      if (data?.bountyId === bountyId?.toString()) loadComments();
    };
    socket.on('bountyCommentUpdated', onComment);
    return () => socket.off('bountyCommentUpdated', onComment);
  }, [bountyId, loadComments]);

  const authHeader = currentUser?.token ? { headers: { Authorization: `Bearer ${currentUser.token}` } } : {};

  const postComment = async (text, parentId = null) => {
    if (!currentUser) { onRequireLogin(); return; }
    if (!text.trim()) return;
    setPosting(true);
    try {
      await axios.post(`${API_URL}/bounties/${bountyId}/comments`, { text: text.trim(), parentId }, authHeader);
      setCommentText(''); setReplyText(''); setReplyTo(null);
      loadComments();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to post comment', 'error');
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await axios.delete(`${API_URL}/bounties/${bountyId}/comments/${commentId}`, authHeader);
      loadComments();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to delete comment', 'error');
    }
  };

  const topLevel = comments.filter(c => !c.parentId);
  const repliesOf = (id) => comments.filter(c => c.parentId && c.parentId.toString() === id.toString());
  const canDelete = (c) => currentUser && (c.authorId?.toString() === myId || isPoster || currentUser.isAdmin);
  const discussionLocked = ['completed', 'cancelled'].includes(bounty?.status);

  const renderComment = (c) => (
    <div className="flex gap-3">
      {c.authorImage ? (
        <img src={c.authorImage} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">{initialOf(c.authorUsername)}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">{c.authorUsername || 'User'}</span>
          {c.isPoster && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">POSTER</span>}
          <span className="text-xs text-slate-500">{timeAgo(c.createdAt)}</span>
        </div>
        <p className="text-sm text-slate-300 mt-0.5 whitespace-pre-wrap break-words">{c.text}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {currentUser && !c.parentId && !discussionLocked && (
            <button onClick={() => { setReplyTo(c._id.toString()); setReplyText(''); }} className="text-xs text-slate-500 hover:text-cyan-400">Reply</button>
          )}
          {canDelete(c) && (
            <button onClick={() => deleteComment(c._id)} className="text-xs text-slate-500 hover:text-red-400">Delete</button>
          )}
        </div>
      </div>
    </div>
  );
  const cat = categoryMeta(bounty?.category);
  const badge = statusBadge(bounty?.status);

  const submitWork = async () => {
    if (!currentUser) { onRequireLogin(); return; }
    if (!submissionUrl.trim()) { notify('Add a link to your work.', 'error'); return; }
    setWorking(true);
    try {
      await axios.post(`${API_URL}/bounties/${bountyId}/submit`, {
        submissionUrl: submissionUrl.trim(), description: submissionDesc
      }, { headers: { Authorization: `Bearer ${currentUser.token}` } });
      notify('Submission sent!', 'success');
      setSubmissionUrl(''); setSubmissionDesc('');
      onChanged();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to submit', 'error');
    } finally {
      setWorking(false);
    }
  };

  const approve = async (submissionId) => {
    if (!window.confirm('Approve this submission and release the reward to this hunter? This cannot be undone.')) return;
    setWorking(true);
    try {
      await axios.post(`${API_URL}/bounties/${bountyId}/approve`, { submissionId },
        { headers: { Authorization: `Bearer ${currentUser.token}` } });
      notify('Winner approved and reward released.', 'success');
      onChanged();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to approve', 'error');
    } finally {
      setWorking(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this bounty? If funded, the reward will be refunded to you (minus fee).')) return;
    setWorking(true);
    try {
      await axios.post(`${API_URL}/bounties/${bountyId}/cancel`, {},
        { headers: { Authorization: `Bearer ${currentUser.token}` } });
      notify('Bounty cancelled.', 'success');
      onChanged();
      onClose();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to cancel', 'error');
    } finally {
      setWorking(false);
    }
  };

  const alreadySubmitted = bounty?.mySubmission || (bounty?.submissions || []).some(
    s => currentUser && s.hunterId?.toString() === (currentUser.userId || currentUser._id || currentUser.id)?.toString()
  );

  return (
    <motion.div className="fixed inset-0 z-[90] flex justify-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative h-full w-full sm:w-[540px] max-w-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}>
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-800 flex-shrink-0">
              <div className="pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 rounded-md bg-slate-700/60 text-slate-300">{cat.icon} {cat.label}</span>
                  <span className={`text-xs px-2 py-1 rounded-md border ${badge.cls}`}>{badge.label}</span>
                </div>
                <h3 className="text-xl font-semibold text-white">{bounty.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {(bounty.projectLogo || bounty.posterImage) && (
                    <img src={bounty.projectLogo || bounty.posterImage} alt="" className="w-5 h-5 rounded-full object-cover bg-slate-700"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  )}
                  <span className="text-sm text-slate-400">{bounty.projectName || bounty.posterUsername}</span>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white text-xl flex-shrink-0">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {(() => {
                const di = deadlineInfo(bounty);
                const u = URGENCY[di.color];
                return (
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium mb-3 text-emerald-300">
                      <span>{bounty.status === 'completed' ? '✓' : '🔒'}</span>
                      <span>{bounty.status === 'completed' ? 'Reward released from escrow' : 'Reward secured in Aquads escrow'}</span>
                    </div>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Reward</p>
                        <p className="text-2xl font-bold text-emerald-400">${bounty.amount} <span className="text-sm text-slate-500 font-normal">{bounty.currency}</span></p>
                      </div>
                      <div className="text-right flex-1 max-w-[55%]">
                        <p className={`text-sm font-medium ${u.text}`}>{di.text}</p>
                        {di.hasBar && (
                          <div className="h-1 rounded-full bg-slate-700/60 overflow-hidden mt-1.5">
                            <div className={`h-full rounded-full ${u.bar}`} style={{ width: `${di.pct}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {bounty.editedAfterSubmissions && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-300">
                  ✏️ This bounty was edited after submissions were received{bounty.lastEditedAt ? ` (last edited ${new Date(bounty.lastEditedAt).toLocaleDateString()})` : ''}.
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-1">Description</h4>
                <p className="text-sm text-slate-400 whitespace-pre-wrap">{bounty.description}</p>
              </div>
              {bounty.deliverables && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-1">Deliverables</h4>
                  <p className="text-sm text-slate-400 whitespace-pre-wrap">{bounty.deliverables}</p>
                </div>
              )}
              {bounty.rules && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                    <span>📋</span> Rules & Eligibility
                  </h4>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{bounty.rules}</p>
                </div>
              )}

              {/* Hunter submit form */}
              {!isPoster && bounty.status === 'open' && (
                <div className="border-t border-slate-800 pt-4">
                  {alreadySubmitted ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-emerald-300">
                      You've submitted to this bounty. The poster will review submissions and approve a winner.
                    </div>
                  ) : (
                    <>
                      <h4 className="text-sm font-semibold text-slate-300 mb-2">Submit your work</h4>
                      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 mb-3 text-xs text-amber-200">
                        <span className="text-base leading-none mt-0.5">💸</span>
                        <p>
                          To participate and receive your reward, you must have{' '}
                          <Link to="/aquapay" className="font-semibold text-amber-100 underline hover:text-white">AquaPay</Link>{' '}
                          set up and activated on your account. Winners are paid out through AquaPay escrow — set it up before submitting.
                        </p>
                      </div>
                      <input value={submissionUrl} onChange={e => setSubmissionUrl(e.target.value)}
                        placeholder="Link to your deliverable (GitHub, Figma, tweet, doc...)"
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none mb-2" />
                      <textarea value={submissionDesc} onChange={e => setSubmissionDesc(e.target.value)} rows={2}
                        placeholder="Notes for the poster (optional)"
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none resize-none mb-2" />
                      <button onClick={submitWork} disabled={working}
                        className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg text-sm font-semibold disabled:opacity-50">
                        {working ? 'Submitting...' : 'Submit Work'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Poster submissions review */}
              {isPoster && (
                <div className="border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-300">Submissions ({(bounty.submissions || []).length})</h4>
                    {bounty.status === 'open' && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setShowEdit(true)} disabled={working} className="text-xs text-cyan-400 hover:text-cyan-300">Edit</button>
                        <button onClick={cancel} disabled={working} className="text-xs text-red-400 hover:text-red-300">Cancel bounty</button>
                      </div>
                    )}
                  </div>
                  {(bounty.submissions || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No submissions yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {bounty.submissions.map(s => (
                        <div key={s._id} className={`rounded-lg p-3 border ${s.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">{s.hunterUsername || 'Hunter'}</span>
                            {s.status === 'approved' && <span className="text-xs text-emerald-400">✓ Winner</span>}
                          </div>
                          <a href={s.submissionUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 break-all">{s.submissionUrl}</a>
                          {s.description && <p className="text-xs text-slate-400 mt-1">{s.description}</p>}
                          {bounty.status === 'open' && (
                            <button onClick={() => approve(s._id)} disabled={working}
                              className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold disabled:opacity-50">
                              Approve & Pay ${bounty.amount}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Discussion / Q&A */}
              <div className="border-t border-slate-800 pt-5">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">💬 Discussion <span className="text-slate-500 font-normal">({comments.length})</span></h4>

                {discussionLocked ? (
                  <div className="mb-5 py-2.5 px-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-400 text-center">
                    🔒 Discussion is closed — this bounty is {bounty.status === 'completed' ? 'awarded' : 'cancelled'}.
                  </div>
                ) : currentUser ? (
                  <div className="flex gap-3 mb-5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">{initialOf(currentUser.username || currentUser.name)}</div>
                    <div className="flex-1">
                      <textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={2}
                        placeholder="Ask a question or leave a comment..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-xl text-white text-sm focus:outline-none resize-none" />
                      <div className="flex justify-end mt-2">
                        <button onClick={() => postComment(commentText)} disabled={posting || !commentText.trim()}
                          className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg text-sm font-semibold disabled:opacity-40">Post</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button onClick={onRequireLogin} className="w-full mb-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm text-slate-300">Log in to join the discussion</button>
                )}

                {topLevel.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No comments yet. Start the conversation.</p>
                ) : (
                  <div className="space-y-5">
                    {topLevel.map(c => (
                      <div key={c._id}>
                        {renderComment(c)}
                        {(repliesOf(c._id).length > 0 || (currentUser && replyTo === c._id.toString())) && (
                          <div className="ml-11 mt-3 space-y-3 border-l border-slate-800 pl-4">
                            {repliesOf(c._id).map(r => <div key={r._id}>{renderComment(r)}</div>)}
                            {currentUser && replyTo === c._id.toString() && (
                              <div className="flex gap-2 items-start pt-1">
                                <input value={replyText} onChange={e => setReplyText(e.target.value)} autoFocus
                                  placeholder="Write a reply..."
                                  onKeyDown={e => { if (e.key === 'Enter' && replyText.trim()) postComment(replyText, c._id); }}
                                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 focus:border-cyan-500 rounded-lg text-white text-sm focus:outline-none" />
                                <button onClick={() => postComment(replyText, c._id)} disabled={posting || !replyText.trim()}
                                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-semibold disabled:opacity-40 whitespace-nowrap">Reply</button>
                                <button onClick={() => { setReplyTo(null); setReplyText(''); }} className="px-2 py-2 text-slate-500 hover:text-white text-xs">✕</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unfunded poster reminder */}
              {isPoster && bounty.status === 'unfunded' && bounty.escrowId && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-sm text-amber-300 mb-2">This bounty isn't funded yet — it won't appear publicly until you deposit the reward.</p>
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/bounty-pay/${bounty.escrowId}`)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-sm font-semibold">
                      Fund escrow
                    </button>
                    <button onClick={() => setShowEdit(true)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold">
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>

      {showEdit && (
        <EditBountyModal
          bountyId={bountyId}
          bounty={bounty}
          currentUser={currentUser}
          onClose={() => setShowEdit(false)}
          onSaved={onChanged}
          notify={notify}
        />
      )}
    </motion.div>
  );
};

export default Bounties;
