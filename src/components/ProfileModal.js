import React, { useState, useRef, useEffect, useCallback } from 'react';
import Modal from './Modal';
import {
  updateUserProfile,
  uploadUserAvatar,
  revealSecretCode,
  USER_AVATAR_ACCEPT,
  USER_AVATAR_MAX_BYTES,
} from '../services/api';
import { FaUser, FaLock, FaFileAlt, FaEdit, FaSave, FaTimes, FaEye, FaEyeSlash, FaLink, FaSpinner, FaUserCircle, FaKey, FaCopy } from 'react-icons/fa';

const SECRET_CODE_REVEAL_SECONDS = 10;
import CVBuilder from './CVBuilder';
import OnChainResume from './OnChainResume';

// Country options for dropdown
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AX', name: 'Åland Islands' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AI', name: 'Anguilla' },
  { code: 'AQ', name: 'Antarctica' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AW', name: 'Aruba' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BV', name: 'Bouvet Island' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IO', name: 'British Indian Ocean Territory' },
  { code: 'BN', name: 'Brunei Darussalam' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'KY', name: 'Cayman Islands' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CX', name: 'Christmas Island' },
  { code: 'CC', name: 'Cocos (Keeling) Islands' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo, Democratic Republic' },
  { code: 'CK', name: 'Cook Islands' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: 'Cote D\'Ivoire' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FK', name: 'Falkland Islands' },
  { code: 'FO', name: 'Faroe Islands' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GF', name: 'French Guiana' },
  { code: 'PF', name: 'French Polynesia' },
  { code: 'TF', name: 'French Southern Territories' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GI', name: 'Gibraltar' },
  { code: 'GR', name: 'Greece' },
  { code: 'GL', name: 'Greenland' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GP', name: 'Guadeloupe' },
  { code: 'GU', name: 'Guam' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GG', name: 'Guernsey' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'VA', name: 'Holy See' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IM', name: 'Isle of Man' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JE', name: 'Jersey' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'Korea, North' },
  { code: 'KR', name: 'Korea, South' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MO', name: 'Macao' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MQ', name: 'Martinique' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'YT', name: 'Mayotte' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NC', name: 'New Caledonia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NU', name: 'Niue' },
  { code: 'NF', name: 'Norfolk Island' },
  { code: 'MP', name: 'Northern Mariana Islands' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PN', name: 'Pitcairn' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RE', name: 'Reunion' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'BL', name: 'Saint Barthélemy' },
  { code: 'SH', name: 'Saint Helena' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'MF', name: 'Saint Martin' },
  { code: 'PM', name: 'Saint Pierre and Miquelon' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SX', name: 'Sint Maarten' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'GS', name: 'South Georgia and Sandwich Islands' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SJ', name: 'Svalbard and Jan Mayen' },
  { code: 'SZ', name: 'Eswatini (Swaziland)' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TK', name: 'Tokelau' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TC', name: 'Turks and Caicos Islands' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UM', name: 'United States Minor Outlying Islands' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'VG', name: 'Virgin Islands, British' },
  { code: 'VI', name: 'Virgin Islands, U.S.' },
  { code: 'WF', name: 'Wallis and Futuna' },
  { code: 'EH', name: 'Western Sahara' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' }
];

const ProfileModal = ({ onClose, currentUser, onProfileUpdate, initialTab = 'profile' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState({
    username: currentUser?.username || '',
    fullName: currentUser?.cv?.fullName || '',
    image: currentUser?.image || '',
    country: currentUser?.country || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [previewUrl, setPreviewUrl] = useState(currentUser?.image || '');
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [revealPassword, setRevealPassword] = useState('');
  const [showRevealPassword, setShowRevealPassword] = useState(false);
  const [revealedSecretCode, setRevealedSecretCode] = useState('');
  const [secretCodeCountdown, setSecretCodeCountdown] = useState(0);
  const [revealingSecretCode, setRevealingSecretCode] = useState(false);
  const [secretCodeError, setSecretCodeError] = useState('');
  const avatarInputRef = useRef(null);
  const secretCodeTimerRef = useRef(null);

  const clearSecretCodeReveal = useCallback(() => {
    if (secretCodeTimerRef.current) {
      clearInterval(secretCodeTimerRef.current);
      secretCodeTimerRef.current = null;
    }
    setRevealedSecretCode('');
    setSecretCodeCountdown(0);
    setRevealPassword('');
    setShowRevealPassword(false);
  }, []);

  useEffect(() => () => clearSecretCodeReveal(), [clearSecretCodeReveal]);

  const showNotification = (message, type) => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(message);
      setSuccess('');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Clear notifications when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setImageError('');
    setSuccess('');
    setSecretCodeError('');
    clearSecretCodeReveal();
  };

  const handleRevealSecretCode = async () => {
    const password = revealPassword.trim();
    if (!password) {
      setSecretCodeError('Enter your password to reveal your secret code');
      return;
    }

    setSecretCodeError('');
    setRevealingSecretCode(true);
    try {
      const { secretCode } = await revealSecretCode(password);
      setRevealedSecretCode(secretCode);
      setRevealPassword('');
      setShowRevealPassword(false);
      setSecretCodeCountdown(SECRET_CODE_REVEAL_SECONDS);

      if (secretCodeTimerRef.current) {
        clearInterval(secretCodeTimerRef.current);
      }
      secretCodeTimerRef.current = setInterval(() => {
        setSecretCodeCountdown((prev) => {
          if (prev <= 1) {
            clearSecretCodeReveal();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setSecretCodeError(err.error || 'Failed to reveal secret code');
    } finally {
      setRevealingSecretCode(false);
    }
  };

  const handleCopySecretCode = () => {
    if (!revealedSecretCode) return;
    navigator.clipboard.writeText(revealedSecretCode);
    showNotification('Secret code copied to clipboard', 'success');
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Profile photo must be a JPEG, PNG, GIF, or WebP image.');
      return;
    }
    if (file.size > USER_AVATAR_MAX_BYTES) {
      setImageError('Profile photo must be 4MB or smaller.');
      return;
    }

    setImageError('');
    setAvatarUploading(true);
    try {
      const { url } = await uploadUserAvatar(file);
      setFormData((prev) => ({ ...prev, image: url }));
      setPreviewUrl(url);
    } catch (err) {
      setImageError(err.message || 'Failed to upload profile photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  const clearAvatar = () => {
    setFormData((prev) => ({ ...prev, image: '' }));
    setPreviewUrl('');
    setImageError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const currentPassword = formData.currentPassword.trim();
    const newPassword = formData.newPassword.trim();
    const confirmPassword = formData.confirmPassword.trim();
    const isChangingPassword = newPassword.length > 0;

    if (isChangingPassword) {
      if (!currentPassword) {
        setError('Current password is required to change password');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }
    }

    setSaving(true);
    try {
      // Only include password fields if changing password
      const updateData = {
        username: formData.username,
        fullName: formData.fullName,
        image: formData.image,
        country: formData.country
      };

      if (isChangingPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      const updatedUser = await updateUserProfile(updateData);
      setSuccess('Profile updated successfully!');
      onProfileUpdate(updatedUser);
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setError(error.error || 'Failed to update profile');
      setSaving(false);
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profile Picture Section */}
        <div className="lg:order-2">
          <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FaUser className="text-blue-400" />
              Profile Picture
            </h3>
            <div className="mb-4 flex justify-center">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-blue-500/30 bg-gray-700/40">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FaUserCircle className="h-20 w-20 text-gray-500" aria-hidden />
                )}
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept={USER_AVATAR_ACCEPT}
              onChange={handleAvatarFile}
              className="hidden"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading || saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
              >
                {avatarUploading ? 'Uploading…' : previewUrl ? 'Replace photo' : 'Upload photo'}
              </button>
              {previewUrl && !avatarUploading && (
                <button
                  type="button"
                  onClick={clearAvatar}
                  disabled={saving}
                  className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-60"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">JPEG, PNG, GIF, or WebP. Max 4MB.</p>
            {imageError && <p className="text-red-400 text-sm mt-2 text-center">{imageError}</p>}
          </div>
        </div>

        {/* Basic Information */}
        <div className="lg:order-1 space-y-6">
          <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FaEdit className="text-green-400" />
              Basic Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                />
                <p className="text-xs text-gray-400 mt-1">Used for login and identification</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter your full name (e.g., John Smith)"
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                />
                <p className="text-xs text-gray-400 mt-1">Your real name as it appears to clients</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                >
                  <option value="">Select a country</option>
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FaLock className="text-yellow-400" />
          Change Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-12 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmNewPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                autoComplete="new-password"
                className="w-full px-4 py-3 pr-12 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
              >
                {showConfirmNewPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-amber-500/30">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <FaKey className="text-amber-400" />
          Secret Code
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Your secret code is used for account recovery, reviews, and verification. To share referrals, use your username — not this code.
        </p>

        {revealedSecretCode ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-gray-900/60 px-4 py-3">
              <code className="flex-1 break-all font-mono text-amber-200">{revealedSecretCode}</code>
              <button
                type="button"
                onClick={handleCopySecretCode}
                className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500"
              >
                <FaCopy className="inline mr-1" />
                Copy
              </button>
            </div>
            <p className="text-sm text-amber-300/90">
              Hiding in {secretCodeCountdown}s — save it somewhere safe before it disappears.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-600 bg-gray-900/50 px-4 py-3 font-mono tracking-widest text-gray-500">
              ••••••••••••
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm your password</label>
              <div className="relative">
                <input
                  type={showRevealPassword ? 'text' : 'password'}
                  value={revealPassword}
                  onChange={(e) => setRevealPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter password to reveal"
                  className="w-full px-4 py-3 pr-12 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 border border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowRevealPassword(!showRevealPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label={showRevealPassword ? 'Hide password' : 'Show password'}
                >
                  {showRevealPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRevealSecretCode}
              disabled={revealingSecretCode}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-wait disabled:opacity-60"
            >
              {revealingSecretCode ? 'Verifying…' : 'Reveal Secret Code'}
            </button>
          </div>
        )}

        {secretCodeError && (
          <p className="mt-3 text-sm text-red-400">{secretCodeError}</p>
        )}
      </div>
    </div>
  );

  const renderCVTab = () => (
    <CVBuilder 
      currentUser={currentUser} 
      onClose={onClose} 
      showNotification={showNotification}
    />
  );

  return (
    <Modal fullScreen onClose={onClose}>
      <div className="text-white h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-700/50 pb-6 mb-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
            <p className="text-gray-400">Manage your account, security, and professional information</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto w-full mb-6">
          <div className="flex overflow-x-auto border-b border-gray-700/50">
            <button
              onClick={() => handleTabChange('profile')}
              className={`px-4 lg:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <FaUser className="inline mr-2" />
              Profile
            </button>
            <button
              onClick={() => handleTabChange('security')}
              className={`px-4 lg:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'security'
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <FaLock className="inline mr-2" />
              Security
            </button>
            {currentUser?.userType === 'freelancer' && (
              <button
                onClick={() => handleTabChange('cv')}
                className={`hidden lg:inline-flex px-6 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'cv'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <FaFileAlt className="inline mr-2" />
                CV Builder
              </button>
            )}
            {currentUser?.userType === 'freelancer' && (
              <button
                onClick={() => handleTabChange('onchain')}
                className={`hidden lg:inline-flex px-6 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'onchain'
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <FaLink className="inline mr-2" />
                On-Chain Resume
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-6xl mx-auto w-full">
          {/* CV Tab - Outside of form to prevent form submission conflicts */}
          {activeTab === 'cv' && currentUser?.userType === 'freelancer' && (
            <>
              {renderCVTab()}
              {/* CV Status Messages - Show outside form */}
              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{error}</pre>
                </div>
              )}
              {success && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300">
                  {success}
                </div>
              )}
            </>
          )}

          {/* On-Chain Resume Tab - Outside of form */}
          {activeTab === 'onchain' && currentUser?.userType === 'freelancer' && (
            <OnChainResume 
              currentUser={currentUser} 
              showNotification={showNotification}
            />
          )}

          {/* Profile and Security tabs - Inside form */}
          {activeTab !== 'cv' && activeTab !== 'onchain' && (
            <form onSubmit={handleSubmit} className="h-full" autoComplete="off">
              <div className="lg:hidden space-y-6">
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'security' && renderSecurityTab()}
                {currentUser?.userType === 'freelancer' && activeTab === 'profile' && (
                  <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FaFileAlt className="text-purple-400" />
                      CV Builder
                    </h3>
                    <p className="text-gray-400 mb-4">Build your professional CV with education, experience, and skills.</p>
                    <button
                      type="button"
                      onClick={() => handleTabChange('cv')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Open CV Builder
                    </button>
                  </div>
                )}
                {currentUser?.userType === 'freelancer' && activeTab === 'profile' && (
                  <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FaLink className="text-green-400" />
                      On-Chain Resume
                    </h3>
                    <p className="text-gray-400 mb-4">Mint your verified credentials on the blockchain - portable and tamper-proof.</p>
                    <button
                      type="button"
                      onClick={() => handleTabChange('onchain')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Open On-Chain Resume
                    </button>
                  </div>
                )}
              </div>
              
              <div className="hidden lg:block">
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'security' && renderSecurityTab()}
              </div>

              {/* Status Messages */}
              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300">
                  {success}
                </div>
              )}

              {/* Footer Actions - Only show for non-CV tabs */}
              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="px-6 py-3 bg-gray-600/50 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 flex items-center gap-2 border border-gray-600 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <FaTimes className="text-sm" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-purple-600"
                  >
                    {saving ? (
                      <>
                        <FaSpinner className="text-sm animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProfileModal; 