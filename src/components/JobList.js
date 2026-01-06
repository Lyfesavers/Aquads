import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaEdit, FaTrash, FaEnvelope, FaTelegram, FaDiscord, FaRedo } from 'react-icons/fa';

const JobList = ({ jobs, currentUser, onEditJob, onDeleteJob, onRefreshJob, onLoginRequired }) => {
  const [expandedJobId, setExpandedJobId] = useState(null);

  const toggleExpand = (jobId) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEmailClick = (job) => {
    const emailSubject = `Application for ${job.title} position`;
    const emailBody = `Hi ${job.ownerUsername},

I am writing to apply for the ${job.title} position posted on Aquads.

I have reviewed the requirements and I am confident I would be a great fit for this role.

Requirements mentioned:
${job.requirements}

I look forward to discussing how my skills align with your needs.

Best regards,
[Your name]`;

    const mailtoLink = `mailto:${job.contactEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
  };

  if (!jobs?.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        No jobs posted yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div
          key={job._id}
          data-job-id={job._id}
          className={`${
            job.status === 'expired' 
              ? 'bg-gray-800/30 border-red-900/30' 
              : 'bg-gray-800/50 border-gray-700/50'
          } backdrop-blur-sm border rounded-lg overflow-hidden cursor-pointer hover:bg-gray-800/70 transition-all duration-300`}
          onClick={() => toggleExpand(job._id)}
        >
          <div className="p-4">
            {/* Mobile-first responsive layout */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                {/* Profile image square */}
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gray-700 overflow-hidden flex-shrink-0 border border-gray-600/50">
                  <img
                    src={
                      (job.source === 'remotive' || job.source === 'cryptojobslist') && job.companyLogo 
                        ? job.companyLogo 
                        : job.owner?.image || job.ownerImage || `https://ui-avatars.com/api/?name=${job.ownerUsername}&background=random`
                    }
                    alt={job.ownerUsername}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${job.ownerUsername}&background=random`;
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-semibold text-white break-words">{job.title}</h3>
                    {job.status === 'expired' && (
                      <span className="px-2 py-0.5 sm:py-1 text-xs bg-red-900/50 text-red-400 rounded-full whitespace-nowrap">
                        Expired
                      </span>
                    )}
                    {job.source === 'remotive' && (
                      <a 
                        href={job.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 sm:py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full hover:bg-blue-500/30 transition-colors flex items-center gap-1 whitespace-nowrap"
                        title="View on Remotive"
                      >
                        <span>via</span>
                        <span className="font-semibold">Remotive</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {job.source === 'cryptojobslist' && (
                      <a 
                        href={job.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 sm:py-1 text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full hover:bg-orange-500/30 transition-colors flex items-center gap-1 whitespace-nowrap"
                        title="View on CryptoJobsList"
                      >
                        <span>via</span>
                        <span className="font-semibold">CryptoJobsList</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                  
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    Posted by {job.ownerUsername} on {formatDate(job.createdAt)}
                  </p>
                  
                  {/* Pay amount display - shown on mobile below title */}
                  <div className="mt-2 sm:hidden">
                    {job.payAmount && job.payType ? (
                      <div className="text-base font-semibold text-green-400">
                        💰 {job.payType === 'percentage' ? (
                          `${job.payAmount}%`
                        ) : (
                          `$${job.payAmount.toLocaleString()}/${job.payType}`
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">
                        💰 Competitive
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                    {/* Hiring Badge */}
                    <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 rounded-full whitespace-nowrap">
                      Hiring
                    </span>
                    
                    {/* Work Arrangement Badge */}
                    {job.workArrangement && (
                      <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                        job.workArrangement === 'remote' 
                          ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
                          : job.workArrangement === 'hybrid'
                          ? 'bg-blue-900/30 text-blue-300 border border-blue-500/30'
                          : 'bg-purple-900/30 text-purple-300 border border-purple-500/30'
                      }`}>
                        {job.workArrangement === 'remote' && '🌍 Remote'}
                        {job.workArrangement === 'hybrid' && '🏢 Hybrid'}
                        {job.workArrangement === 'onsite' && '🏛️ On-site'}
                      </span>
                    )}
                    
                    {/* Location Badge - Show for all jobs that have location */}
                    {job.location && (job.location.city || job.location.country) && (
                      <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold bg-gray-700/50 text-gray-300 border border-gray-600/30 rounded-full">
                        📍 {job.location.city && job.location.country 
                          ? `${job.location.city}, ${job.location.country}` 
                          : job.location.country || job.location.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop pay and actions - hidden on mobile */}
              <div className="hidden sm:flex items-center space-x-3 lg:space-x-4 flex-shrink-0">
                {/* Pay amount display - desktop */}
                {job.payAmount && job.payType ? (
                  <div className="text-base lg:text-lg font-semibold text-green-400 whitespace-nowrap">
                    {job.payType === 'percentage' ? (
                      `${job.payAmount}%`
                    ) : (
                      `$${job.payAmount.toLocaleString()}/${job.payType}`
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic whitespace-nowrap">
                    Competitive
                  </div>
                )}
                
                {currentUser && job.source === 'user' && (
                  <div className="flex space-x-2">
                    {/* Owner controls */}
                    {(currentUser.userId === job.owner || currentUser.userId === job.owner._id) && (
                      <>
                        {job.status === 'expired' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRefreshJob(job._id);
                            }}
                            className="text-blue-500 hover:text-blue-400 transition-colors"
                            title="Refresh job (will move to top of listing)"
                          >
                            <FaRedo size={18} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditJob(job);
                          }}
                          className="text-blue-500 hover:text-blue-400 transition-colors"
                          title="Edit job"
                        >
                          <FaEdit size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this job?')) {
                              onDeleteJob(job._id);
                            }
                          }}
                          className="text-red-500 hover:text-red-400 transition-colors"
                          title="Delete job"
                        >
                          <FaTrash size={18} />
                        </button>
                      </>
                    )}
                    
                    {/* Admin delete button (for user listings) */}
                    {currentUser.isAdmin && (currentUser.userId !== job.owner && currentUser.userId !== job.owner._id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this job? (Admin action)')) {
                            onDeleteJob(job._id);
                          }
                        }}
                        className="text-red-500 hover:text-red-400 transition-colors"
                        title="Delete job (Admin)"
                      >
                        <FaTrash size={18} />
                      </button>
                    )}
                  </div>
                )}
                
                {/* Admin delete button for external jobs */}
                {currentUser && currentUser.isAdmin && (job.source === 'remotive' || job.source === 'cryptojobslist') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this external job? (Admin action)')) {
                        onDeleteJob(job._id);
                      }
                    }}
                    className="text-red-500 hover:text-red-400 transition-colors"
                    title="Delete external job (Admin)"
                  >
                    <FaTrash size={18} />
                  </button>
                )}
              </div>
              
              {/* Mobile action buttons - shown at bottom on mobile */}
              {currentUser && (job.source === 'user' || (currentUser.isAdmin && (job.source === 'remotive' || job.source === 'cryptojobslist'))) && (
                <div className="sm:hidden flex justify-end space-x-2">
                  {job.source === 'user' && (currentUser.userId === job.owner || currentUser.userId === job.owner._id) && (
                    <>
                      {job.status === 'expired' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefreshJob(job._id);
                          }}
                          className="text-blue-500 hover:text-blue-400 transition-colors p-2"
                          title="Refresh job"
                        >
                          <FaRedo size={16} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditJob(job);
                        }}
                        className="text-blue-500 hover:text-blue-400 transition-colors p-2"
                        title="Edit job"
                      >
                        <FaEdit size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this job?')) {
                            onDeleteJob(job._id);
                          }
                        }}
                        className="text-red-500 hover:text-red-400 transition-colors p-2"
                        title="Delete job"
                      >
                        <FaTrash size={16} />
                      </button>
                    </>
                  )}
                  
                  {currentUser.isAdmin && (
                    (job.source === 'user' && currentUser.userId !== job.owner && currentUser.userId !== job.owner._id) || 
                    job.source === 'remotive' || job.source === 'cryptojobslist'
                  ) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this job? (Admin action)')) {
                          onDeleteJob(job._id);
                        }
                      }}
                      className="text-red-500 hover:text-red-400 transition-colors p-2"
                      title="Delete job (Admin)"
                    >
                      <FaTrash size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Expanded Content */}
          {expandedJobId === job._id && (
            <div className="p-3 sm:p-4 border-t border-gray-700 bg-gray-800/50">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Description</h4>
                  <div className="mt-1 whitespace-pre-wrap text-sm sm:text-base text-gray-200 leading-relaxed break-words">
                    {job.description}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Requirements</h4>
                  <div className="mt-1 whitespace-pre-wrap text-sm sm:text-base text-gray-200 leading-relaxed break-words">
                    {job.requirements}
                  </div>
                </div>

                {/* Work Arrangement & Location Details */}
                {job.workArrangement && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Work Arrangement</h4>
                    <div className="mt-1">
                      <span className={`inline-block px-2 sm:px-3 py-1 text-xs font-semibold rounded-full ${
                        job.workArrangement === 'remote' 
                          ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
                          : job.workArrangement === 'hybrid'
                          ? 'bg-blue-900/30 text-blue-300 border border-blue-500/30'
                          : 'bg-purple-900/30 text-purple-300 border border-purple-500/30'
                      }`}>
                        {job.workArrangement === 'remote' && '🌍 Remote - Work from anywhere'}
                        {job.workArrangement === 'hybrid' && '🏢 Hybrid - Mix of remote & office'}
                        {job.workArrangement === 'onsite' && '🏛️ On-site - In-office only'}
                      </span>
                      {(job.workArrangement === 'hybrid' || job.workArrangement === 'onsite') && job.location && job.location.city && (
                        <div className="mt-2">
                          <p className="text-sm sm:text-base text-gray-300 break-words">
                            📍 <span className="font-medium">Location:</span> {job.location.city}, {job.location.country}
                            {job.workArrangement === 'hybrid' && <span className="text-gray-400 ml-1 block sm:inline">(with remote flexibility)</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  {/* Primary Apply Now Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      
                      // Check if user is logged in
                      if (!currentUser) {
                        if (onLoginRequired) {
                          onLoginRequired();
                        } else {
                          alert('Please login to apply for this job');
                        }
                        return;
                      }
                      
                      // Proceed with application
                      if ((job.source === 'remotive' || job.source === 'cryptojobslist') && job.externalUrl) {
                        window.open(job.externalUrl, '_blank', 'noopener,noreferrer');
                      } else if (job.applicationUrl) {
                        window.open(job.applicationUrl, '_blank', 'noopener,noreferrer');
                      } else {
                        handleEmailClick(job);
                      }
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all duration-200 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{job.source === 'remotive' ? 'Apply on Remotive' : job.source === 'cryptojobslist' ? 'Apply on CryptoJobsList' : 'Apply Now'}</span>
                  </button>
                  <p className="text-gray-400 text-xs mt-2 text-center">
                    {!currentUser 
                      ? '🔒 Login required to apply' 
                      : job.source === 'remotive' 
                        ? 'You will be redirected to Remotive.com'
                        : job.source === 'cryptojobslist'
                        ? 'You will be redirected to CryptoJobsList.com' 
                        : job.applicationUrl 
                          ? 'You will be redirected to the application page' 
                          : 'Apply via email'}
                  </p>

                  {/* Alternative Contact Methods - Only for user jobs */}
                  {job.source === 'user' && (job.contactTelegram || job.contactDiscord) && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-700">
                      <p className="text-gray-400 text-xs mb-2 text-center">
                        {currentUser ? 'Or contact via:' : '🔒 Login to view contact options'}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {job.contactTelegram && (
                          currentUser ? (
                            <a
                              href={`https://t.me/${job.contactTelegram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors border border-blue-500/30 text-sm"
                            >
                              <FaTelegram size={16} />
                              <span>Telegram</span>
                            </a>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onLoginRequired) {
                                  onLoginRequired();
                                } else {
                                  alert('Please login to view contact options');
                                }
                              }}
                              className="flex items-center space-x-2 px-3 py-2 bg-gray-600/30 text-gray-400 rounded-lg border border-gray-600/30 cursor-pointer hover:bg-gray-600/40 text-sm"
                            >
                              <FaTelegram size={16} />
                              <span className="hidden sm:inline">Telegram (Login Required)</span>
                              <span className="sm:hidden">Login Required</span>
                            </button>
                          )
                        )}
                        
                        {job.contactDiscord && (
                          <div 
                            className="flex items-center space-x-2 px-3 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30 text-sm break-all"
                            title={currentUser ? job.contactDiscord : '🔒 Login to view'}
                          >
                            <FaDiscord size={16} className="flex-shrink-0" />
                            <span className="break-all">{currentUser ? job.contactDiscord : '🔒 Login Required'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default JobList; 