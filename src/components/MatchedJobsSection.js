import React, { useState, useEffect } from 'react';
import { API_URL } from '../services/api';
import { FaBriefcase, FaMapMarkerAlt, FaDollarSign, FaExternalLinkAlt, FaArrowRight } from 'react-icons/fa';

/**
 * MatchedJobsSection - Shows up to 3 jobs matched to the user's CV skills
 * Displays below "How It Works" section on the Marketplace page
 * 
 * @param {Object} currentUser - Current logged in user
 * @param {Function} onOpenCV - Callback to open CV builder
 * @param {Function} onViewJobs - Callback to switch to jobs view
 * @param {Function} onViewJob - Callback to view a specific job (jobId)
 */
const MatchedJobsSection = ({ currentUser, onOpenCV, onViewJobs, onViewJob }) => {
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canMatch, setCanMatch] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (currentUser?.userType === 'freelancer') {
      fetchMatchedJobs();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchMatchedJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/jobs/matched?limit=3`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMatchedJobs(data.matched || []);
        setCanMatch(data.canMatch);
        setReason(data.reason || '');
      }
    } catch (error) {
      console.error('Error fetching matched jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render for non-freelancers or if still loading
  if (!currentUser || currentUser.userType !== 'freelancer') {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="mb-12 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-blue-500/20">
        <div className="flex items-center gap-3 mb-4">
          <FaBriefcase className="text-blue-400 text-xl" />
          <h2 className="text-xl font-bold text-white">Jobs Matched to Your Skills</h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Show message if user has no CV skills
  if (!canMatch) {
    return (
      <div className="mb-12 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-blue-500/20">
        <div className="flex items-center gap-3 mb-4">
          <FaBriefcase className="text-blue-400 text-xl" />
          <h2 className="text-xl font-bold text-white">Jobs Matched to Your Skills</h2>
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
            Setup Required
          </span>
        </div>
        <div className="text-center py-8">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-white text-lg font-semibold mb-2">Complete Your CV for AI Job Matching</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Add your skills, education, and experience to your CV. Our AI will automatically match you with relevant jobs from our job board!
          </p>
          <button
            onClick={onOpenCV}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/25"
          >
            <span>Complete Your CV Now</span>
            <FaArrowRight className="text-sm" />
          </button>
          <p className="text-gray-500 text-xs mt-4">
            💡 The more skills you add, the better your job matches will be!
          </p>
        </div>
      </div>
    );
  }

  // Show message if no matches found
  if (matchedJobs.length === 0) {
    return (
      <div className="mb-12 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-blue-500/20">
        <div className="flex items-center gap-3 mb-4">
          <FaBriefcase className="text-blue-400 text-xl" />
          <h2 className="text-xl font-bold text-white">Jobs Matched to Your Skills</h2>
        </div>
        <div className="text-center py-6">
          <p className="text-gray-400 mb-2">No matching jobs found at the moment.</p>
          <p className="text-gray-500 text-sm">Check back soon - new jobs are added regularly!</p>
        </div>
      </div>
    );
  }

  // Format pay display
  const formatPay = (job) => {
    if (!job.payAmount) return 'Competitive';
    
    const amount = job.payAmount.toLocaleString();
    switch (job.payType) {
      case 'hour':
        return `$${amount}/hr`;
      case 'month':
        return `$${amount}/mo`;
      case 'year':
        return `$${amount}/yr`;
      case 'percentage':
        return `${amount}%`;
      default:
        return `$${amount}`;
    }
  };

  // Format date
  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - d);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="mb-12 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 border border-blue-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaBriefcase className="text-blue-400 text-xl" />
          <h2 className="text-xl font-bold text-white">Jobs Matched to Your Skills</h2>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
            Based on your CV
          </span>
        </div>
        <button
          onClick={onViewJobs}
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition-colors"
        >
          View All Jobs
          <FaArrowRight className="text-xs" />
        </button>
      </div>

      {/* Matched Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {matchedJobs.map(({ job, matchedKeywords, matchCount }) => (
          <div
            key={job._id}
            onClick={() => onViewJob && onViewJob(job._id)}
            className="bg-gray-800/60 hover:bg-gray-800/80 rounded-lg p-4 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 group cursor-pointer"
          >
            {/* Job Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-700 overflow-hidden flex-shrink-0">
                <img
                  src={
                    job.companyLogo || 
                    job.ownerImage || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(job.ownerUsername)}&background=random`
                  }
                  alt={job.ownerUsername}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.ownerUsername)}&background=random`;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-sm truncate group-hover:text-blue-300 transition-colors">
                  {job.title}
                </h3>
                <p className="text-gray-400 text-xs truncate">{job.ownerUsername}</p>
              </div>
            </div>

            {/* Job Details */}
            <div className="flex flex-wrap gap-2 mb-3 text-xs">
              {/* Pay */}
              <span className="flex items-center gap-1 text-green-400">
                <FaDollarSign className="text-[10px]" />
                {formatPay(job)}
              </span>
              
              {/* Location */}
              <span className="flex items-center gap-1 text-gray-400">
                <FaMapMarkerAlt className="text-[10px]" />
                {job.workArrangement === 'remote' ? 'Remote' : job.location?.country || 'Remote'}
              </span>

              {/* Source badge */}
              {job.source !== 'user' && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  job.source === 'remotive' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {job.source === 'remotive' ? 'Remotive' : 'CryptoJobs'}
                </span>
              )}
            </div>

            {/* Matched Skills */}
            <div className="mb-2">
              <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">Matched Skills:</p>
              <div className="flex flex-wrap gap-1">
                {matchedKeywords.slice(0, 4).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-full border border-green-500/30"
                  >
                    {keyword}
                  </span>
                ))}
                {matchedKeywords.length > 4 && (
                  <span className="px-2 py-0.5 text-gray-500 text-[10px]">
                    +{matchedKeywords.length - 4} more
                  </span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
              <span className="text-gray-500 text-[10px]">{formatDate(job.createdAt)}</span>
              <span className="text-blue-400 text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                View Job <FaExternalLinkAlt className="text-[10px]" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer tip */}
      <div className="mt-4 text-center">
        <p className="text-gray-500 text-xs">
          💡 Tip: Add more skills to your CV for better job matches
        </p>
      </div>
    </div>
  );
};

export default MatchedJobsSection;

