import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getUserCV } from '../services/api';
import { FaGraduationCap, FaBriefcase, FaTools, FaSpinner, FaExclamationCircle, FaLinkedin, FaExternalLinkAlt } from 'react-icons/fa';

const CVPreview = ({ userId, username, onClose }) => {
  const [cvData, setCvData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCV();
  }, [userId]);

  const loadCV = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUserCV(userId);
      setCvData(response.cv);
    } catch (error) {
      console.error('Error loading CV:', error);
      setError('Failed to load CV');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const hasContent = cvData && (
    cvData.fullName ||
    cvData.summary ||
    (cvData.education && cvData.education.length > 0) ||
    (cvData.experience && cvData.experience.length > 0) ||
    (cvData.skills && cvData.skills.length > 0)
  );

  if (loading) {
    return (
      <Modal fullScreen onClose={onClose}>
        <div className="text-white h-full flex items-center justify-center">
          <div className="text-center">
            <FaSpinner className="text-6xl text-blue-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading CV...</h3>
            <p className="text-gray-400">Please wait while we fetch the CV data.</p>
          </div>
        </div>
      </Modal>
    );
  }

  if (error || !hasContent) {
    return (
      <Modal fullScreen onClose={onClose}>
        <div className="text-white h-full flex items-center justify-center">
          <div className="text-center max-w-md">
            <FaExclamationCircle className="text-6xl text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {error ? 'Error Loading CV' : 'No CV Available'}
            </h3>
            <p className="text-gray-400 mb-6">
              {error 
                ? 'There was an error loading the CV. Please try again later.'
                : `${username} hasn't created a CV yet.`
              }
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal fullScreen onClose={onClose}>
      <div className="text-white h-full">
        {/* Header */}
        <div className="border-b border-gray-700/50 pb-6 mb-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">{username}'s CV</h1>
            <p className="text-gray-400">Professional curriculum vitae with verification contacts</p>
          </div>
        </div>

        {/* CV Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white text-black rounded-xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8 border-b-2 border-gray-200 pb-6">
              <h1 className="text-4xl font-bold mb-4 text-gray-800">{cvData.fullName || username}</h1>
              {cvData.linkedinProfileUrl && (
                <a
                  href={cvData.linkedinProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0A66C2] text-white text-sm rounded-full mb-4 hover:bg-[#004182] transition-colors"
                >
                  <FaLinkedin />
                  View LinkedIn Profile
                  <FaExternalLinkAlt className="text-xs" />
                </a>
              )}
              {cvData.summary && (
                <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  {cvData.summary}
                </p>
              )}
            </div>

            {/* Education */}
            {cvData.education && cvData.education.length > 0 && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-700 border-b-2 border-blue-200 pb-2">
                  <FaGraduationCap className="text-3xl" />
                  Education
                </h2>
                {cvData.education.map((edu, index) => (
                  <div key={index} className="mb-8 border-l-4 border-blue-300 pl-6 relative">
                    <div className="absolute w-4 h-4 bg-blue-500 rounded-full -left-2 top-2"></div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {edu.degree} in {edu.field}
                    </h3>
                    <p className="text-blue-600 font-semibold text-lg mb-2">{edu.institution}</p>
                    <p className="text-gray-600 text-sm mb-3 font-medium">
                      {formatDate(edu.startDate)} - {edu.current ? 'Present' : formatDate(edu.endDate)}
                    </p>
                    {edu.description && (
                      <p className="text-gray-700 mb-4 leading-relaxed">{edu.description}</p>
                    )}
                    
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                        Verification Contact
                      </p>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold text-gray-700">
                            {edu.contactName}, {edu.contactTitle}
                          </p>
                          <p className="text-gray-600">{edu.contactDepartment}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">{edu.contactEmail}</p>
                          {edu.contactPhone && (
                            <p className="text-gray-600">{edu.contactPhone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Experience */}
            {cvData.experience && cvData.experience.length > 0 && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-green-700 border-b-2 border-green-200 pb-2">
                  <FaBriefcase className="text-3xl" />
                  Professional Experience
                </h2>
                {cvData.experience.map((exp, index) => (
                  <div key={index} className="mb-8 border-l-4 border-green-300 pl-6 relative">
                    <div className="absolute w-4 h-4 bg-green-500 rounded-full -left-2 top-2"></div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{exp.position}</h3>
                    <p className="text-green-600 font-semibold text-lg mb-2">{exp.company}</p>
                    <p className="text-gray-600 text-sm mb-3 font-medium">
                      {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                    </p>
                    {exp.description && (
                      <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-wrap">
                        {exp.description}
                      </p>
                    )}
                    
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                        Verification Contact
                      </p>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold text-gray-700">
                            {exp.contactName}, {exp.contactTitle}
                          </p>
                          <p className="text-gray-600">{exp.contactDepartment}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">{exp.contactEmail}</p>
                          {exp.contactPhone && (
                            <p className="text-gray-600">{exp.contactPhone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {cvData.skills && cvData.skills.length > 0 && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-purple-700 border-b-2 border-purple-200 pb-2">
                  <FaTools className="text-3xl" />
                  Skills & Expertise
                </h2>
                <div className="flex flex-wrap gap-3">
                  {cvData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium border border-purple-200 shadow-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}



            {/* Footer */}
            <div className="text-center mt-10 pt-6 border-t-2 border-gray-200">
              <p className="text-gray-500 text-sm">
                CV generated on {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Contact information provided for verification purposes only
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CVPreview;
