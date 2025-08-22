import React, { useState, useEffect } from 'react';
import { updateCV, getUserCV } from '../services/api';
import { FaPlus, FaTrash, FaGraduationCap, FaBriefcase, FaTools, FaSave, FaEye, FaCalendar } from 'react-icons/fa';

const CVBuilder = ({ currentUser, onClose, showNotification }) => {
  const [cvData, setCvData] = useState({
    summary: '',
    education: [],
    experience: [],
    skills: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    loadCV();
  }, [currentUser]);

  const loadCV = async () => {
    try {
      setLoading(true);
      const response = await getUserCV(currentUser.userId || currentUser._id);
      if (response.cv) {
        setCvData({
          summary: response.cv.summary || '',
          education: response.cv.education || [],
          experience: response.cv.experience || [],
          skills: response.cv.skills || []
        });
      }
    } catch (error) {
      console.error('Error loading CV:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateCV = () => {
    const errors = [];

    // Validate education entries
    cvData.education.forEach((edu, index) => {
      if (edu.institution || edu.degree || edu.field || edu.startDate || edu.contactName || edu.contactTitle || edu.contactEmail || edu.contactDepartment) {
        if (!edu.institution) errors.push(`Education #${index + 1}: Institution is required`);
        if (!edu.degree) errors.push(`Education #${index + 1}: Degree is required`);
        if (!edu.field) errors.push(`Education #${index + 1}: Field of study is required`);
        if (!edu.startDate) errors.push(`Education #${index + 1}: Start date is required`);
        if (!edu.contactName) errors.push(`Education #${index + 1}: Contact name is required`);
        if (!edu.contactTitle) errors.push(`Education #${index + 1}: Contact title is required`);
        if (!edu.contactEmail) errors.push(`Education #${index + 1}: Contact email is required`);
        if (!edu.contactDepartment) errors.push(`Education #${index + 1}: Contact department is required`);
      }
    });

    // Validate experience entries
    cvData.experience.forEach((exp, index) => {
      if (exp.company || exp.position || exp.startDate || exp.contactName || exp.contactTitle || exp.contactEmail || exp.contactDepartment) {
        if (!exp.company) errors.push(`Experience #${index + 1}: Company is required`);
        if (!exp.position) errors.push(`Experience #${index + 1}: Position is required`);
        if (!exp.startDate) errors.push(`Experience #${index + 1}: Start date is required`);
        if (!exp.contactName) errors.push(`Experience #${index + 1}: Contact name is required`);
        if (!exp.contactTitle) errors.push(`Experience #${index + 1}: Contact title is required`);
        if (!exp.contactEmail) errors.push(`Experience #${index + 1}: Contact email is required`);
        if (!exp.contactDepartment) errors.push(`Experience #${index + 1}: Contact department is required`);
      }
    });

    return errors;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate before saving
      const validationErrors = validateCV();
      if (validationErrors.length > 0) {
        const errorMessage = `Please fix the following errors:\n\n${validationErrors.join('\n\n')}`;
        showNotification(errorMessage, 'error');
        return;
      }

      // Filter out empty entries
      const cleanedData = {
        ...cvData,
        education: cvData.education.filter(edu => 
          edu.institution && edu.degree && edu.field && edu.startDate && 
          edu.contactName && edu.contactTitle && edu.contactEmail && edu.contactDepartment
        ),
        experience: cvData.experience.filter(exp => 
          exp.company && exp.position && exp.startDate && 
          exp.contactName && exp.contactTitle && exp.contactEmail && exp.contactDepartment
        )
      };

      await updateCV(cleanedData);
      showNotification('CV saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving CV:', error);
      showNotification(error.error || 'Failed to save CV', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addEducation = () => {
    setCvData(prev => ({
      ...prev,
      education: [...prev.education, {
        institution: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
        contactName: '',
        contactTitle: '',
        contactEmail: '',
        contactPhone: '',
        contactDepartment: ''
      }]
    }));
  };

  const removeEducation = (index) => {
    setCvData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const updateEducation = (index, field, value) => {
    setCvData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const addExperience = () => {
    setCvData(prev => ({
      ...prev,
      experience: [...prev.experience, {
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
        contactName: '',
        contactTitle: '',
        contactEmail: '',
        contactPhone: '',
        contactDepartment: ''
      }]
    }));
  };

  const removeExperience = (index) => {
    setCvData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const updateExperience = (index, field, value) => {
    setCvData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };



  const addSkill = () => {
    if (newSkill.trim() && !cvData.skills.includes(newSkill.trim())) {
      setCvData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setCvData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-xl text-gray-400">Loading CV...</p>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FaEye className="text-blue-400" />
              CV Preview
            </h3>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Back to Edit
            </button>
          </div>

          {/* CV Preview Content */}
          <div className="bg-white text-black p-8 rounded-lg">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">{currentUser.username}</h1>
              {cvData.summary && (
                <p className="text-gray-600 max-w-2xl mx-auto">{cvData.summary}</p>
              )}
            </div>

            {/* Education */}
            {cvData.education.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-600">
                  <FaGraduationCap />
                  Education
                </h2>
                {cvData.education.map((edu, index) => (
                  <div key={index} className="mb-6 border-l-4 border-blue-200 pl-4">
                    <h3 className="text-lg font-semibold">{edu.degree} in {edu.field}</h3>
                    <p className="text-blue-600 font-medium">{edu.institution}</p>
                    <p className="text-gray-600 text-sm mb-2">
                      {formatDate(edu.startDate)} - {edu.current ? 'Present' : formatDate(edu.endDate)}
                    </p>
                    {edu.description && <p className="text-gray-700">{edu.description}</p>}
                    
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-500 mb-1">VERIFICATION CONTACT</p>
                      <p className="text-sm font-medium">{edu.contactName}, {edu.contactTitle}</p>
                      <p className="text-sm text-gray-600">{edu.contactDepartment}</p>
                      <p className="text-sm text-gray-600">{edu.contactEmail}</p>
                      {edu.contactPhone && <p className="text-sm text-gray-600">{edu.contactPhone}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Experience */}
            {cvData.experience.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-600">
                  <FaBriefcase />
                  Professional Experience
                </h2>
                {cvData.experience.map((exp, index) => (
                  <div key={index} className="mb-6 border-l-4 border-green-200 pl-4">
                    <h3 className="text-lg font-semibold">{exp.position}</h3>
                    <p className="text-green-600 font-medium">{exp.company}</p>
                    <p className="text-gray-600 text-sm mb-2">
                      {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                    </p>
                    {exp.description && <p className="text-gray-700">{exp.description}</p>}
                    
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-500 mb-1">VERIFICATION CONTACT</p>
                      <p className="text-sm font-medium">{exp.contactName}, {exp.contactTitle}</p>
                      <p className="text-sm text-gray-600">{exp.contactDepartment}</p>
                      <p className="text-sm text-gray-600">{exp.contactEmail}</p>
                      {exp.contactPhone && <p className="text-sm text-gray-600">{exp.contactPhone}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {cvData.skills.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-600">
                  <FaTools />
                  Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {cvData.skills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}


          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <FaGraduationCap className="text-purple-400" />
          CV Builder
        </h3>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FaEye />
            Preview
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <FaSave />
            {saving ? 'Saving...' : 'Save CV'}
          </button>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          Professional Summary
        </h4>
        <textarea
          value={cvData.summary}
          onChange={(e) => setCvData(prev => ({ ...prev, summary: e.target.value }))}
          placeholder="Write a brief professional summary..."
          className="w-full px-4 py-3 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600 resize-vertical"
          rows={4}
        />
      </div>

      {/* Education Section */}
      <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <FaGraduationCap className="text-blue-400" />
            Education
          </h4>
          <button
            type="button"
            onClick={addEducation}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FaPlus />
            Add Education
          </button>
        </div>
        
        {cvData.education.map((edu, index) => (
          <div key={index} className="border border-gray-600 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-4">
              <h5 className="font-medium">Education #{index + 1}</h5>
              <button
                type="button"
                onClick={() => removeEducation(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <FaTrash />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Institution Name *"
                value={edu.institution}
                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                required
              />
              <input
                type="text"
                placeholder="Degree *"
                value={edu.degree}
                onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                required
              />
              <input
                type="text"
                placeholder="Field of Study *"
                value={edu.field}
                onChange={(e) => updateEducation(index, 'field', e.target.value)}
                className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                required
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  placeholder="Start Date"
                  value={edu.startDate}
                  onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                />
                <FaCalendar className="text-gray-400" />
              </div>
              {!edu.current && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    placeholder="End Date"
                    value={edu.endDate}
                    onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  />
                  <FaCalendar className="text-gray-400" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={edu.current}
                  onChange={(e) => updateEducation(index, 'current', e.target.checked)}
                  className="rounded"
                />
                Currently studying here
              </label>
            </div>

            <textarea
              placeholder="Description (optional)"
              value={edu.description}
              onChange={(e) => updateEducation(index, 'description', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600 mb-4"
              rows={2}
            />

            {/* Verification Contact */}
            <div className="border-t border-gray-600 pt-4">
              <h6 className="font-medium mb-3 text-yellow-400">Verification Contact <span className="text-red-400 text-sm">(All fields required except phone)</span></h6>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Contact Name *"
                  value={edu.contactName}
                  onChange={(e) => updateEducation(index, 'contactName', e.target.value)}
                  className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  required
                />
                <input
                  type="text"
                  placeholder="Contact Title *"
                  value={edu.contactTitle}
                  onChange={(e) => updateEducation(index, 'contactTitle', e.target.value)}
                  className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  required
                />
                <input
                  type="email"
                  placeholder="Contact Email *"
                  value={edu.contactEmail}
                  onChange={(e) => updateEducation(index, 'contactEmail', e.target.value)}
                  className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  required
                />
                <input
                  type="tel"
                  placeholder="Contact Phone (optional)"
                  value={edu.contactPhone}
                  onChange={(e) => updateEducation(index, 'contactPhone', e.target.value)}
                  className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                />
                <input
                  type="text"
                  placeholder="Department *"
                  value={edu.contactDepartment}
                  onChange={(e) => updateEducation(index, 'contactDepartment', e.target.value)}
                  className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  required
                />
              </div>
            </div>
          </div>
        ))}
        
        {cvData.education.length === 0 && (
          <p className="text-gray-400 text-center py-4">No education entries yet. Click "Add Education" to get started.</p>
        )}
      </div>

      {/* Experience Section */}
      <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <FaBriefcase className="text-green-400" />
            Professional Experience
          </h4>
          <button
            type="button"
            onClick={addExperience}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FaPlus />
            Add Experience
          </button>
        </div>
        
        {cvData.experience.map((exp, index) => (
          <div key={index} className="border border-gray-600 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-4">
              <h5 className="font-medium">Experience #{index + 1}</h5>
              <button
                type="button"
                onClick={() => removeExperience(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <FaTrash />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Company Name *"
                value={exp.company}
                onChange={(e) => updateExperience(index, 'company', e.target.value)}
                className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                required
              />
              <input
                type="text"
                placeholder="Position *"
                value={exp.position}
                onChange={(e) => updateExperience(index, 'position', e.target.value)}
                className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                required
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  placeholder="Start Date"
                  value={exp.startDate}
                  onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                />
                <FaCalendar className="text-gray-400" />
              </div>
              {!exp.current && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    placeholder="End Date"
                    value={exp.endDate}
                    onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  />
                  <FaCalendar className="text-gray-400" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exp.current}
                  onChange={(e) => updateExperience(index, 'current', e.target.checked)}
                  className="rounded"
                />
                Currently working here
              </label>
            </div>

            <textarea
              placeholder="Job description and responsibilities (optional)"
              value={exp.description}
              onChange={(e) => updateExperience(index, 'description', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600 mb-4"
              rows={3}
            />

            {/* Verification Contact */}
            <div className="border-t border-gray-600 pt-4">
              <h6 className="font-medium mb-3 text-yellow-400">Verification Contact <span className="text-red-400 text-sm">(All fields required except phone)</span></h6>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Contact Name *"
                  value={exp.contactName}
                  onChange={(e) => updateExperience(index, 'contactName', e.target.value)}
                  className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  required
                />
                <input
                  type="text"
                  placeholder="Contact Title *"
                  value={exp.contactTitle}
                  onChange={(e) => updateExperience(index, 'contactTitle', e.target.value)}
                  className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  required
                />
                <input
                  type="email"
                  placeholder="Contact Email *"
                  value={exp.contactEmail}
                  onChange={(e) => updateExperience(index, 'contactEmail', e.target.value)}
                  className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  required
                />
                <input
                  type="tel"
                  placeholder="Contact Phone (optional)"
                  value={exp.contactPhone}
                  onChange={(e) => updateExperience(index, 'contactPhone', e.target.value)}
                  className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                />
                <input
                  type="text"
                  placeholder="Department *"
                  value={exp.contactDepartment}
                  onChange={(e) => updateExperience(index, 'contactDepartment', e.target.value)}
                  className="px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  required
                />
              </div>
            </div>
          </div>
        ))}
        
        {cvData.experience.length === 0 && (
          <p className="text-gray-400 text-center py-4">No experience entries yet. Click "Add Experience" to get started.</p>
        )}
      </div>

      {/* Skills Section */}
      <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FaTools className="text-purple-400" />
          Skills
        </h4>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter a skill and press Enter"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
            className="flex-1 px-3 py-2 bg-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
          />
          <button
            type="button"
            onClick={addSkill}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
          >
            <FaPlus />
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {cvData.skills.map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm flex items-center gap-2 border border-purple-500/30"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="text-purple-400 hover:text-purple-200 transition-colors"
              >
                <FaTrash className="text-xs" />
              </button>
            </span>
          ))}
        </div>
        
        {cvData.skills.length === 0 && (
          <p className="text-gray-400 text-center py-4">No skills added yet. Add your professional skills above.</p>
        )}
      </div>


    </div>
  );
};

export default CVBuilder;
