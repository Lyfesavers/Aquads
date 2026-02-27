import React, { useMemo, useState } from 'react';
import Modal from './Modal';

const EMPTY_TEAM_MEMBER = { name: '', role: '', bio: '', image: '' };
const EMPTY_MILESTONE = { title: '', status: 'planned', date: '', summary: '' };
const EMPTY_PARTNERSHIP = { name: '', status: 'announced', sourceUrl: '', summary: '', logo: '' };
const MAX_ABOUT = 1400;
const MAX_MISSION = 180;
const MAX_RECENT_UPDATE = 320;
const MAX_NAME = 60;
const MAX_ROLE = 60;
const MAX_BIO = 220;
const MAX_MILESTONE_TITLE = 80;
const MAX_MILESTONE_SUMMARY = 220;
const MAX_PARTNER_NAME = 80;
const MAX_PARTNER_SUMMARY = 220;

const getInitialProfile = (ad) => {
  const profile = ad?.projectProfile || {};
  return {
    about: profile.about || '',
    mission: profile.mission || '',
    recentUpdate: profile.recentUpdate || '',
    verification: {
      status: profile.verification?.status || 'unverified',
      qaNotes: profile.verification?.qaNotes || '',
      verifiedBy: profile.verification?.verifiedBy || '',
      verifiedAt: profile.verification?.verifiedAt || null
    },
    team: Array.isArray(profile.team) && profile.team.length > 0 ? profile.team : [EMPTY_TEAM_MEMBER],
    milestones: Array.isArray(profile.milestones) && profile.milestones.length > 0 ? profile.milestones : [EMPTY_MILESTONE],
    partnerships: Array.isArray(profile.partnerships) && profile.partnerships.length > 0 ? profile.partnerships : [EMPTY_PARTNERSHIP]
  };
};

const ProjectDeepDiveModal = ({ ad, onSave, onClose }) => {
  const [formData, setFormData] = useState(() => getInitialProfile(ad));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imageValidationErrors, setImageValidationErrors] = useState({});

  const aboutLength = useMemo(() => formData.about.trim().length, [formData.about]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateArrayItem = (field, index, key, value) => {
    setFormData((prev) => {
      const list = [...prev[field]];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, [field]: list };
    });
  };

  const validateImageUrl = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return false;
      const contentType = response.headers.get('content-type') || '';
      return contentType.startsWith('image/');
    } catch (validationError) {
      return false;
    }
  };

  const getImageErrorKey = (field, index, key) => `${field}-${index}-${key}`;

  const handleImageFieldBlur = async (field, index, key) => {
    const imageUrl = (formData?.[field]?.[index]?.[key] || '').trim();
    const errorKey = getImageErrorKey(field, index, key);
    if (!imageUrl) {
      setImageValidationErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
      return;
    }
    const isValid = await validateImageUrl(imageUrl);
    setImageValidationErrors((prev) => ({
      ...prev,
      [errorKey]: isValid ? '' : 'Please enter a valid image URL'
    }));
  };

  const addArrayItem = (field) => {
    const nextItem = field === 'team'
      ? { ...EMPTY_TEAM_MEMBER }
      : field === 'milestones'
        ? { ...EMPTY_MILESTONE }
        : { ...EMPTY_PARTNERSHIP };

    setFormData((prev) => ({ ...prev, [field]: [...prev[field], nextItem] }));
  };

  const removeArrayItem = (field, index) => {
    setFormData((prev) => {
      const list = prev[field].filter((_, idx) => idx !== index);
      if (list.length === 0) {
        return {
          ...prev,
          [field]: field === 'team' ? [{ ...EMPTY_TEAM_MEMBER }] : field === 'milestones' ? [{ ...EMPTY_MILESTONE }] : [{ ...EMPTY_PARTNERSHIP }]
        };
      }
      return { ...prev, [field]: list };
    });
  };

  const sanitizeList = (items, requiredKey) =>
    items
      .map((item) =>
        Object.fromEntries(
          Object.entries(item).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
        )
      )
      .filter((item) => item[requiredKey]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (aboutLength < 80) {
      setError('About Project should be at least 80 characters to show real project context.');
      return;
    }
    if (Object.values(imageValidationErrors).some(Boolean)) {
      setError('Fix invalid image URLs before saving.');
      return;
    }

    const payload = {
      about: formData.about.trim(),
      mission: formData.mission.trim(),
      recentUpdate: formData.recentUpdate.trim(),
      team: sanitizeList(formData.team, 'name'),
      milestones: sanitizeList(formData.milestones, 'title'),
      partnerships: sanitizeList(formData.partnerships, 'name'),
      verification: {
        ...(ad?.projectProfile?.verification || {}),
        status: 'pending_review',
        qaNotes: '',
        verifiedBy: '',
        verifiedAt: null
      },
      updatedAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      await onSave(ad.id, payload);
      onClose();
    } catch (submitError) {
      setError('Failed to save project profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} fullScreen={true}>
      <div className="text-white max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-2">
        <h2 className="text-2xl font-bold mb-2">Project Deep Dive</h2>
        <p className="text-sm text-gray-400 mb-5">
          Update the data shown on AquaSwap charts for <span className="text-cyan-300">{ad?.title}</span>.
        </p>
        <p className="text-xs text-yellow-300 mb-5">
          Quality note: after you save changes, verification moves to <strong>Pending Review</strong> until admin QA approves it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 pb-8">
          <div>
            <label className="block text-sm font-semibold mb-2">About Project (Vision + Purpose)</label>
            <textarea
              rows={5}
              value={formData.about}
              onChange={(e) => updateField('about', e.target.value)}
              placeholder="Tell users what your project does, why it exists, and who it serves."
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
              maxLength={MAX_ABOUT}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {aboutLength}/{MAX_ABOUT} characters. Target: 120-500 chars, clear mission and user value.
            </p>
            <p className="text-xs text-cyan-300/80 mt-1">
              Tip: Use new lines for paragraphs. For bullets, start a new line with <code className="bg-gray-800 px-1 rounded">-</code> or <code className="bg-gray-800 px-1 rounded">•</code>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Mission (Short)</label>
            <input
              type="text"
              value={formData.mission}
              onChange={(e) => updateField('mission', e.target.value)}
              placeholder="One-line mission statement"
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
              maxLength={MAX_MISSION}
            />
            <p className="text-xs text-gray-400 mt-1">{formData.mission.length}/{MAX_MISSION}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Team Members</label>
              <button type="button" onClick={() => addArrayItem('team')} className="text-xs px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded">
                + Add Member
              </button>
            </div>
            <div className="space-y-3">
              {formData.team.map((member, index) => (
                <div key={`team-${index}`} className="p-3 rounded bg-gray-700/60 border border-gray-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input value={member.name} onChange={(e) => updateArrayItem('team', index, 'name', e.target.value)} placeholder="Name" maxLength={MAX_NAME} className="px-3 py-2 bg-gray-800 rounded" />
                    <input value={member.role} onChange={(e) => updateArrayItem('team', index, 'role', e.target.value)} placeholder="Role" maxLength={MAX_ROLE} className="px-3 py-2 bg-gray-800 rounded" />
                    <input
                      value={member.image}
                      onChange={(e) => updateArrayItem('team', index, 'image', e.target.value)}
                      onBlur={() => handleImageFieldBlur('team', index, 'image')}
                      placeholder="Image URL (optional)"
                      className="sm:col-span-2 px-3 py-2 bg-gray-800 rounded"
                    />
                    <textarea rows={2} value={member.bio} onChange={(e) => updateArrayItem('team', index, 'bio', e.target.value)} placeholder="Short bio" maxLength={MAX_BIO} className="sm:col-span-2 px-3 py-2 bg-gray-800 rounded" />
                  </div>
                  {imageValidationErrors[getImageErrorKey('team', index, 'image')] && (
                    <p className="text-[11px] text-red-400 mt-1">{imageValidationErrors[getImageErrorKey('team', index, 'image')]}</p>
                  )}
                  {member.image && !imageValidationErrors[getImageErrorKey('team', index, 'image')] && (
                    <div className="mt-2 p-2 bg-gray-800 rounded inline-flex items-center gap-2">
                      <img src={member.image} alt={`${member.name || 'Team'} preview`} className="w-10 h-10 rounded-full object-cover border border-cyan-500/40" />
                      <span className="text-xs text-gray-300">Image preview</span>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">{(member.bio || '').length}/{MAX_BIO} bio chars</p>
                  <button type="button" onClick={() => removeArrayItem('team', index)} className="text-xs text-red-300 mt-2 hover:text-red-200">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Milestones</label>
              <button type="button" onClick={() => addArrayItem('milestones')} className="text-xs px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded">
                + Add Milestone
              </button>
            </div>
            <div className="space-y-3">
              {formData.milestones.map((milestone, index) => (
                <div key={`milestone-${index}`} className="p-3 rounded bg-gray-700/60 border border-gray-600">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input value={milestone.title} onChange={(e) => updateArrayItem('milestones', index, 'title', e.target.value)} placeholder="Milestone title" maxLength={MAX_MILESTONE_TITLE} className="sm:col-span-2 px-3 py-2 bg-gray-800 rounded" />
                    <select value={milestone.status} onChange={(e) => updateArrayItem('milestones', index, 'status', e.target.value)} className="px-3 py-2 bg-gray-800 rounded">
                      <option value="planned">Planned</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <input type="date" value={milestone.date} onChange={(e) => updateArrayItem('milestones', index, 'date', e.target.value)} className="sm:col-span-1 px-3 py-2 bg-gray-800 rounded" />
                    <textarea rows={2} value={milestone.summary} onChange={(e) => updateArrayItem('milestones', index, 'summary', e.target.value)} placeholder="Milestone summary" maxLength={MAX_MILESTONE_SUMMARY} className="sm:col-span-2 px-3 py-2 bg-gray-800 rounded" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{(milestone.summary || '').length}/{MAX_MILESTONE_SUMMARY} summary chars</p>
                  <button type="button" onClick={() => removeArrayItem('milestones', index)} className="text-xs text-red-300 mt-2 hover:text-red-200">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Partnerships</label>
              <button type="button" onClick={() => addArrayItem('partnerships')} className="text-xs px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded">
                + Add Partnership
              </button>
            </div>
            <div className="space-y-3">
              {formData.partnerships.map((partnership, index) => (
                <div key={`partnership-${index}`} className="p-3 rounded bg-gray-700/60 border border-gray-600">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input value={partnership.name} onChange={(e) => updateArrayItem('partnerships', index, 'name', e.target.value)} placeholder="Partner name" maxLength={MAX_PARTNER_NAME} className="sm:col-span-2 px-3 py-2 bg-gray-800 rounded" />
                    <select value={partnership.status} onChange={(e) => updateArrayItem('partnerships', index, 'status', e.target.value)} className="px-3 py-2 bg-gray-800 rounded">
                      <option value="announced">Announced</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                    <input
                      value={partnership.logo || ''}
                      onChange={(e) => updateArrayItem('partnerships', index, 'logo', e.target.value)}
                      onBlur={() => handleImageFieldBlur('partnerships', index, 'logo')}
                      placeholder="Partner logo URL (optional)"
                      className="sm:col-span-3 px-3 py-2 bg-gray-800 rounded"
                    />
                    <input value={partnership.sourceUrl} onChange={(e) => updateArrayItem('partnerships', index, 'sourceUrl', e.target.value)} placeholder="Source URL" className="sm:col-span-3 px-3 py-2 bg-gray-800 rounded" />
                    <textarea rows={2} value={partnership.summary} onChange={(e) => updateArrayItem('partnerships', index, 'summary', e.target.value)} placeholder="Partnership summary" maxLength={MAX_PARTNER_SUMMARY} className="sm:col-span-3 px-3 py-2 bg-gray-800 rounded" />
                  </div>
                  {imageValidationErrors[getImageErrorKey('partnerships', index, 'logo')] && (
                    <p className="text-[11px] text-red-400 mt-1">{imageValidationErrors[getImageErrorKey('partnerships', index, 'logo')]}</p>
                  )}
                  {partnership.logo && !imageValidationErrors[getImageErrorKey('partnerships', index, 'logo')] && (
                    <div className="mt-2 p-2 bg-gray-800 rounded inline-flex items-center gap-2">
                      <img src={partnership.logo} alt={`${partnership.name || 'Partner'} logo preview`} className="w-10 h-10 rounded-md object-cover border border-cyan-500/40" />
                      <span className="text-xs text-gray-300">Logo preview</span>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">{(partnership.summary || '').length}/{MAX_PARTNER_SUMMARY} summary chars</p>
                  <button type="button" onClick={() => removeArrayItem('partnerships', index)} className="text-xs text-red-300 mt-2 hover:text-red-200">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Recent Update</label>
            <textarea
              rows={3}
              value={formData.recentUpdate}
              onChange={(e) => updateField('recentUpdate', e.target.value)}
              placeholder="Latest release, launch, or update summary."
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
              maxLength={MAX_RECENT_UPDATE}
            />
            <p className="text-xs text-gray-400 mt-1">{formData.recentUpdate.length}/{MAX_RECENT_UPDATE}</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70">
              {isSubmitting ? 'Saving...' : 'Save Deep Dive'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ProjectDeepDiveModal;
