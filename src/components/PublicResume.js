import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FaCheckCircle, 
  FaExternalLinkAlt, 
  FaCopy, 
  FaStar, 
  FaBriefcase,
  FaShieldAlt,
  FaClock,
  FaLink,
  FaArrowLeft,
  FaMedal,
  FaChartLine,
  FaChevronDown,
  FaUserCheck,
  FaClipboardCheck,
  FaIdCard,
  FaAward,
  FaSync,
  FaDownload
} from 'react-icons/fa';
import { API_URL } from '../services/api';
import ResumeBadge from './ResumeBadge';

const PublicResume = () => {
  const { username } = useParams();
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [expandedMetrics, setExpandedMetrics] = useState({});
  const [justMinted, setJustMinted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showBadge, setShowBadge] = useState(false);

  const toggleMetric = (metric) => {
    setExpandedMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  const fetchResume = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await fetch(`${API_URL}/on-chain-resume/public/${username}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Resume not found. This user may not have minted their on-chain resume yet.');
        } else {
          setError('Failed to load resume. Please try again.');
        }
        return;
      }

      const data = await response.json();
      setResumeData(data);
      
      // Clear justMinted if data is now up to date
      if (isRefresh) {
        const lastMint = localStorage.getItem('lastResumeMint');
        if (lastMint) {
          const mintData = JSON.parse(lastMint);
          if (mintData.username?.toLowerCase() === username?.toLowerCase() && 
              data.verified?.trustScore === mintData.score) {
            setJustMinted(false);
            localStorage.removeItem('lastResumeMint');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching resume:', err);
      setError('Failed to load resume. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResume();
    
    // Check if user just minted (within last 2 minutes)
    const lastMint = localStorage.getItem('lastResumeMint');
    if (lastMint) {
      try {
        const mintData = JSON.parse(lastMint);
        const timeSinceMint = Date.now() - mintData.timestamp;
        const twoMinutes = 2 * 60 * 1000;
        
        if (mintData.username?.toLowerCase() === username?.toLowerCase() && timeSinceMint < twoMinutes) {
          setJustMinted(true);
          
          // Auto-clear after 2 minutes
          const timeout = setTimeout(() => {
            setJustMinted(false);
            localStorage.removeItem('lastResumeMint');
          }, twoMinutes - timeSinceMint);
          
          return () => clearTimeout(timeout);
        } else if (timeSinceMint >= twoMinutes) {
          // Clean up old mint data
          localStorage.removeItem('lastResumeMint');
        }
      } catch (e) {
        localStorage.removeItem('lastResumeMint');
      }
    }
  }, [username]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score) => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading verified resume...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/50 rounded-2xl p-8 max-w-md text-center border border-gray-700">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-2">Resume Not Found</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FaArrowLeft /> Back to Aquads
          </Link>
        </div>
      </div>
    );
  }

  const { current, verified } = resumeData;
  const scoreMatch = current.trustScore === verified.trustScore;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <FaArrowLeft />
            <span className="hidden sm:inline">Back to Aquads</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full flex items-center gap-1">
              <FaLink className="text-xs" /> On-Chain Verified
            </span>
            <button
              onClick={copyLink}
              className="p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
              title="Copy resume link"
            >
              {copied ? <FaCheckCircle className="text-green-400" /> : <FaCopy />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Just Minted Banner */}
        {justMinted && (
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-4 border border-green-500/30 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎉</div>
              <div>
                <p className="text-green-400 font-semibold">Resume Just Updated!</p>
                <p className="text-gray-400 text-sm">If you see old data, click refresh to see the latest version.</p>
              </div>
            </div>
            <button
              onClick={() => fetchResume(true)}
              disabled={refreshing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <FaSync className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-6 md:p-8 border border-blue-500/20 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <img
                src={resumeData.image || `https://api.dicebear.com/7.x/initials/svg?seed=${resumeData.username}`}
                alt={resumeData.username}
                className="w-28 h-28 rounded-full border-4 border-blue-500/50 object-cover"
              />
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2">
                <FaCheckCircle className="text-white text-lg" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-white">
                  {resumeData.cv?.fullName || resumeData.username}
                </h1>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
                  <FaShieldAlt /> Verified on Base
                </span>
              </div>
              
              {resumeData.cv?.title && (
                <p className="text-xl text-blue-300 mb-2">{resumeData.cv.title}</p>
              )}
              
              <p className="text-gray-400 mb-4">@{resumeData.username}</p>
              
              {resumeData.bio && (
                <p className="text-gray-300 max-w-2xl">{resumeData.bio}</p>
              )}

              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <FaClock /> Member since {formatDate(resumeData.memberSince)}
                </span>
                <span className="flex items-center gap-1">
                  <FaBriefcase /> {current.stats.completedJobs} jobs completed
                </span>
                <span className="flex items-center gap-1">
                  <FaStar className="text-yellow-400" /> {(current.stats.avgRating / 10).toFixed(1)} ({current.stats.totalReviews} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Score Card */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Current Score */}
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FaChartLine className="text-blue-400" /> Live Trust Score
              </h2>
              <span className="text-xs text-gray-500">Real-time from Aquads</span>
            </div>

            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div 
                  className="w-36 h-36 rounded-full border-8 border-gray-700 flex items-center justify-center"
                  style={{
                    background: `conic-gradient(
                      ${current.trustScore >= 80 ? '#22c55e' : current.trustScore >= 60 ? '#eab308' : '#ef4444'} ${current.trustScore * 3.6}deg,
                      #374151 ${current.trustScore * 3.6}deg
                    )`
                  }}
                >
                  <div className="w-28 h-28 rounded-full bg-gray-900 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${getScoreColor(current.trustScore)}`}>
                      {current.trustScore}
                    </span>
                    <span className="text-xs text-gray-400">/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Breakdown - Expandable */}
            <div className="space-y-2">
              {/* Rating */}
              <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleMetric('rating')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FaStar className="text-yellow-400" />
                    <span className="text-gray-300 text-sm">Rating</span>
                    <span className="text-yellow-400 font-semibold text-sm">{current.breakdown.ratingScore}/50</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${(current.breakdown.ratingScore / 50) * 100}%` }}></div>
                    </div>
                    <FaChevronDown className={`text-gray-500 text-xs transition-transform ${expandedMetrics.rating ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expandedMetrics.rating && (
                  <div className="px-3 pb-3 text-sm border-t border-gray-700/50">
                    <div className="pt-3 space-y-2">
                      <p className="text-gray-400">
                        <span className="text-gray-300 font-medium">What it measures:</span> Average rating received from clients on completed jobs.
                      </p>
                      <div className="flex justify-between text-gray-400">
                        <span>Current Rating:</span>
                        <span className="text-yellow-400 font-medium">{(current.stats.avgRating / 10).toFixed(1)}★</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Total Reviews:</span>
                        <span className="text-white">{current.stats.totalReviews}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Higher ratings from more reviews = higher score. 4.8★+ with reviews = max 50 points.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Completion */}
              <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleMetric('completion')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FaClipboardCheck className="text-green-400" />
                    <span className="text-gray-300 text-sm">Completion</span>
                    <span className="text-green-400 font-semibold text-sm">{current.breakdown.completionScore}/20</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full" style={{ width: `${(current.breakdown.completionScore / 20) * 100}%` }}></div>
                    </div>
                    <FaChevronDown className={`text-gray-500 text-xs transition-transform ${expandedMetrics.completion ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expandedMetrics.completion && (
                  <div className="px-3 pb-3 text-sm border-t border-gray-700/50">
                    <div className="pt-3 space-y-2">
                      <p className="text-gray-400">
                        <span className="text-gray-300 font-medium">What it measures:</span> Percentage of accepted jobs that were completed successfully.
                      </p>
                      <div className="flex justify-between text-gray-400">
                        <span>Completion Rate:</span>
                        <span className="text-green-400 font-medium">{current.stats.completionRate}%</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Jobs Completed:</span>
                        <span className="text-white">{current.stats.completedJobs}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Shows reliability. 95%+ completion rate = max 20 points. Cancelled jobs lower this score.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleMetric('profile')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FaIdCard className="text-blue-400" />
                    <span className="text-gray-300 text-sm">Profile</span>
                    <span className="text-blue-400 font-semibold text-sm">{current.breakdown.profileScore}/5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${(current.breakdown.profileScore / 5) * 100}%` }}></div>
                    </div>
                    <FaChevronDown className={`text-gray-500 text-xs transition-transform ${expandedMetrics.profile ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expandedMetrics.profile && (
                  <div className="px-3 pb-3 text-sm border-t border-gray-700/50">
                    <div className="pt-3 space-y-2">
                      <p className="text-gray-400">
                        <span className="text-gray-300 font-medium">What it measures:</span> Completeness of professional CV/profile information.
                      </p>
                      <div className="flex justify-between text-gray-400">
                        <span>CV Status:</span>
                        <span className={current.breakdown.profileScore >= 5 ? 'text-green-400' : 'text-yellow-400'}>
                          {current.breakdown.profileScore >= 5 ? 'Complete' : 'Incomplete'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 A complete CV with name, summary, experience, education, and skills = 5 points.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Verification */}
              <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleMetric('verification')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FaUserCheck className="text-purple-400" />
                    <span className="text-gray-300 text-sm">Verification</span>
                    <span className="text-purple-400 font-semibold text-sm">{current.breakdown.verificationScore}/20</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${(current.breakdown.verificationScore / 20) * 100}%` }}></div>
                    </div>
                    <FaChevronDown className={`text-gray-500 text-xs transition-transform ${expandedMetrics.verification ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expandedMetrics.verification && (
                  <div className="px-3 pb-3 text-sm border-t border-gray-700/50">
                    <div className="pt-3 space-y-2">
                      <p className="text-gray-400">
                        <span className="text-gray-300 font-medium">What it measures:</span> Account verification level and identity confirmation.
                      </p>
                      <div className="flex justify-between text-gray-400">
                        <span>Freelancer Account:</span>
                        <span className={current.breakdown.verificationScore >= 10 ? 'text-green-400' : 'text-gray-500'}>
                          {current.breakdown.verificationScore >= 10 ? '✓ Verified' : '✗ Not verified'}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>KYC (Premium Service):</span>
                        <span className={current.breakdown.verificationScore >= 20 ? 'text-green-400' : 'text-gray-500'}>
                          {current.breakdown.verificationScore >= 20 ? '✓ Verified' : '✗ Not verified'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Freelancer account = 10pts. Premium service (requires KYC & vetting) = additional 10pts for full 20/20.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleMetric('badges')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FaAward className="text-orange-400" />
                    <span className="text-gray-300 text-sm">Badges</span>
                    <span className="text-orange-400 font-semibold text-sm">{current.breakdown.badgeScore}/5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${(current.breakdown.badgeScore / 5) * 100}%` }}></div>
                    </div>
                    <FaChevronDown className={`text-gray-500 text-xs transition-transform ${expandedMetrics.badges ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expandedMetrics.badges && (
                  <div className="px-3 pb-3 text-sm border-t border-gray-700/50">
                    <div className="pt-3 space-y-2">
                      <p className="text-gray-400">
                        <span className="text-gray-300 font-medium">What it measures:</span> Skill badges earned through assessments on Aquads.
                      </p>
                      <div className="flex justify-between text-gray-400">
                        <span>Badges Earned:</span>
                        <span className="text-orange-400 font-medium">{current.stats.badgeCount}</span>
                      </div>
                      {resumeData.skillBadges && resumeData.skillBadges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {resumeData.skillBadges.slice(0, 4).map((badge, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-orange-500/20 text-orange-300 text-xs rounded-full">
                              {badge.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Skill badges prove expertise. 1-2 badges = 2.5pts, 3+ badges = max 5 points.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Verified On-Chain */}
          <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-2xl p-6 border border-green-500/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FaShieldAlt className="text-green-400" /> On-Chain Verification
              </h2>
              <a
                href={resumeData.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                View on EAS <FaExternalLinkAlt />
              </a>
            </div>

            <div className="text-center mb-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                scoreMatch 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                <FaCheckCircle />
                {scoreMatch 
                  ? 'Score matches blockchain record' 
                  : `Score changed since last mint (+${current.trustScore - verified.trustScore})`
                }
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Verified Score</span>
                <span className={`font-bold ${getScoreColor(verified.trustScore)}`}>{verified.trustScore}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Minted On</span>
                <span className="text-white">{formatDate(verified.mintedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Wallet</span>
                <span className="text-white font-mono text-sm">
                  {verified.walletAddress?.slice(0, 6)}...{verified.walletAddress?.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Chain</span>
                <span className="text-blue-400">Base</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Attestation UID</span>
                <a 
                  href={resumeData.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-mono text-sm flex items-center gap-1"
                >
                  {verified.uid?.slice(0, 8)}...{verified.uid?.slice(-6)} <FaExternalLinkAlt className="text-xs" />
                </a>
              </div>
            </div>

            {resumeData.historyCount > 0 && (
              <p className="text-xs text-gray-500 text-center mt-4">
                This resume has been updated {resumeData.historyCount} time{resumeData.historyCount > 1 ? 's' : ''} on-chain
              </p>
            )}
          </div>
        </div>

        {/* Credential Badge Download Section */}
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-2xl border border-purple-500/20 mb-8 overflow-hidden">
          <button
            onClick={() => setShowBadge(!showBadge)}
            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                <FaDownload className="text-white text-lg" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-white">Download Credential Badge</h3>
                <p className="text-gray-400 text-sm">Get a shareable badge to showcase this verified resume</p>
              </div>
            </div>
            <FaChevronDown className={`text-gray-400 transition-transform ${showBadge ? 'rotate-180' : ''}`} />
          </button>
          
          {showBadge && (
            <div className="px-6 pb-6 border-t border-purple-500/20">
              <div className="pt-6">
                <ResumeBadge 
                  username={resumeData.username}
                  score={verified.trustScore}
                  resumeUrl={window.location.href}
                  showEmbed={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Skill Badges */}
        {resumeData.skillBadges && resumeData.skillBadges.length > 0 && (
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 mb-8">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <FaMedal className="text-yellow-400" /> Verified Skill Badges
            </h2>
            <div className="flex flex-wrap gap-3">
              {resumeData.skillBadges.map((badge, idx) => (
                <div 
                  key={idx}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full flex items-center gap-2"
                >
                  <FaMedal className="text-yellow-400" />
                  <span className="text-white font-medium">{badge.name}</span>
                  <span className="text-xs text-yellow-400/80">{badge.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CV Summary */}
        {resumeData.cv && (
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 mb-8">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <FaBriefcase className="text-blue-400" /> Professional Summary
            </h2>
            
            {resumeData.cv.summary && (
              <p className="text-gray-300 mb-4">{resumeData.cv.summary}</p>
            )}

            {resumeData.cv.skills && resumeData.cv.skills.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm text-gray-300 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {resumeData.cv.skills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Work Experience */}
        {resumeData.cv && resumeData.cv.experience && resumeData.cv.experience.length > 0 && (
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 mb-8">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <FaBriefcase className="text-purple-400" /> Work Experience
            </h2>
            <div className="space-y-4">
              {resumeData.cv.experience.map((exp, idx) => (
                <div key={idx} className="border-l-2 border-purple-500/50 pl-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{exp.position}</h3>
                    {exp.current && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Current</span>
                    )}
                  </div>
                  <p className="text-purple-400 text-sm">{exp.company}</p>
                  <p className="text-gray-500 text-xs mb-2">
                    {exp.startDate && new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    {' — '}
                    {exp.current ? 'Present' : (exp.endDate && new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }))}
                  </p>
                  {exp.description && (
                    <p className="text-gray-400 text-sm">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {resumeData.cv && resumeData.cv.education && resumeData.cv.education.length > 0 && (
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 mb-8">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <FaAward className="text-green-400" /> Education
            </h2>
            <div className="space-y-4">
              {resumeData.cv.education.map((edu, idx) => (
                <div key={idx} className="border-l-2 border-green-500/50 pl-4">
                  <h3 className="font-semibold text-white">{edu.degree}{edu.field && ` in ${edu.field}`}</h3>
                  <p className="text-green-400 text-sm">{edu.institution}</p>
                  <p className="text-gray-500 text-xs mb-2">
                    {edu.startDate && new Date(edu.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    {edu.endDate && (
                      <>
                        {' — '}
                        {new Date(edu.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </>
                    )}
                  </p>
                  {edu.description && (
                    <p className="text-gray-400 text-sm">{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {resumeData.services && resumeData.services.length > 0 && (
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 mb-8">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <FaBriefcase className="text-purple-400" /> Active Services
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumeData.services.map((service, idx) => (
                <div key={idx} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                  <h3 className="font-medium text-white mb-1 line-clamp-2">{service.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{service.category}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-semibold">${service.price}</span>
                    {service.reviews > 0 && (
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <FaStar className="text-yellow-400" />
                        {service.rating?.toFixed(1)} ({service.reviews})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-6 border border-blue-500/20 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Want to work with {resumeData.username}?</h3>
          <p className="text-gray-400 mb-4">Their credentials are verified on the blockchain and can't be faked.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to={`/?search=${resumeData.username}`}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-semibold text-white transition-all"
            >
              View on Aquads Marketplace
            </Link>
            <a
              href={resumeData.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg font-semibold text-white transition-all flex items-center gap-2"
            >
              <FaExternalLinkAlt /> Verify on Blockchain
            </a>
          </div>
        </div>

        {/* Powered By */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>
            Verified with <FaShieldAlt className="inline text-green-400" /> Ethereum Attestation Service on{' '}
            <span className="text-blue-400">Base</span>
          </p>
          <p className="mt-1">
            Powered by <Link to="/" className="text-blue-400 hover:text-blue-300">Aquads</Link> - The Web3 Freelance Marketplace
          </p>
        </div>
      </main>
    </div>
  );
};

export default PublicResume;

