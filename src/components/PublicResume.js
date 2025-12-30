import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FaCheckCircle, 
  FaExternalLinkAlt, 
  FaCopy, 
  FaStar, 
  FaBriefcase,
  FaGraduationCap,
  FaShieldAlt,
  FaClock,
  FaLink,
  FaArrowLeft,
  FaMedal,
  FaChartLine
} from 'react-icons/fa';
import { API_URL } from '../services/api';

const PublicResume = () => {
  const { username } = useParams();
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        setLoading(true);
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
      } catch (err) {
        console.error('Error fetching resume:', err);
        setError('Failed to load resume. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
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

            {/* Score Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rating ({current.breakdown.ratingScore}/50)</span>
                <div className="w-32 bg-gray-700 rounded-full h-2 my-auto">
                  <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${(current.breakdown.ratingScore / 50) * 100}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Completion ({current.breakdown.completionScore}/30)</span>
                <div className="w-32 bg-gray-700 rounded-full h-2 my-auto">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: `${(current.breakdown.completionScore / 30) * 100}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Profile ({current.breakdown.profileScore}/10)</span>
                <div className="w-32 bg-gray-700 rounded-full h-2 my-auto">
                  <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${(current.breakdown.profileScore / 10) * 100}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Verification ({current.breakdown.verificationScore}/5)</span>
                <div className="w-32 bg-gray-700 rounded-full h-2 my-auto">
                  <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${(current.breakdown.verificationScore / 5) * 100}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Badges ({current.breakdown.badgeScore}/5)</span>
                <div className="w-32 bg-gray-700 rounded-full h-2 my-auto">
                  <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${(current.breakdown.badgeScore / 5) * 100}%` }}></div>
                </div>
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

            <div className="grid sm:grid-cols-2 gap-4">
              {resumeData.cv.skills && resumeData.cv.skills.length > 0 && (
                <div>
                  <h3 className="text-sm text-gray-300 mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {resumeData.cv.skills.slice(0, 8).map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">
                        {skill}
                      </span>
                    ))}
                    {resumeData.cv.skills.length > 8 && (
                      <span className="px-3 py-1 bg-gray-700/50 text-gray-400 text-sm rounded-full">
                        +{resumeData.cv.skills.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-6">
                {resumeData.cv.experienceCount > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">{resumeData.cv.experienceCount}</div>
                    <div className="text-xs text-gray-400">Work Experience</div>
                  </div>
                )}
                {resumeData.cv.educationCount > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{resumeData.cv.educationCount}</div>
                    <div className="text-xs text-gray-400">Education</div>
                  </div>
                )}
              </div>
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

