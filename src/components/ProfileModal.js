import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { updateUserProfile } from '../services/api';
import { FaUser, FaLock, FaFileAlt, FaEdit, FaSave, FaTimes, FaCheck } from 'react-icons/fa';
import CVBuilder from './CVBuilder';
import useSocket from '../hooks/useSocket';

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

const ProfileModal = ({ onClose, currentUser, onProfileUpdate }) => {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    username: currentUser?.username || '',
    image: currentUser?.image || '',
    country: currentUser?.country || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [previewUrl, setPreviewUrl] = useState(currentUser?.image || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  // Socket listeners for real-time ID verification updates
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleIdVerificationStatusUpdate = (data) => {
      // Only update if this is for the current user
      if (data.userId === currentUser._id || data.userId === currentUser.id) {
        // Update the current user's ID verification status
        const updatedUser = {
          ...currentUser,
          idVerification: data.verification
        };
        onProfileUpdate(updatedUser);
        
        // Show notification based on status
        if (data.verification.status === 'verified') {
          showNotification('🎉 Your ID verification has been approved! You now have the "ID Verified" badge.', 'success');
        } else if (data.verification.status === 'rejected') {
          showNotification(`❌ Your ID verification was rejected. Reason: ${data.verification.rejectionReason || 'Verification failed to meet requirements'}. You can try again.`, 'error');
        }
      }
    };

    const handleIdVerificationApproved = (data) => {
      if (data.userId === currentUser._id || data.userId === currentUser.id) {
        const updatedUser = {
          ...currentUser,
          idVerification: data.verification
        };
        onProfileUpdate(updatedUser);
        showNotification('🎉 Your ID verification has been approved! You now have the "ID Verified" badge.', 'success');
      }
    };

    const handleIdVerificationRejected = (data) => {
      if (data.userId === currentUser._id || data.userId === currentUser.id) {
        const updatedUser = {
          ...currentUser,
          idVerification: data.verification
        };
        onProfileUpdate(updatedUser);
        showNotification(`❌ Your ID verification was rejected. Reason: ${data.verification.rejectionReason || 'Verification failed to meet requirements'}. You can try again.`, 'error');
      }
    };

    socket.on('idVerificationStatusUpdate', handleIdVerificationStatusUpdate);
    socket.on('idVerificationApproved', handleIdVerificationApproved);
    socket.on('idVerificationRejected', handleIdVerificationRejected);

    return () => {
      socket.off('idVerificationStatusUpdate', handleIdVerificationStatusUpdate);
      socket.off('idVerificationApproved', handleIdVerificationApproved);
      socket.off('idVerificationRejected', handleIdVerificationRejected);
    };
  }, [socket, currentUser, onProfileUpdate]);

  // Clear notifications when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  const validateImageUrl = async (url) => {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      return contentType.startsWith('image/') && 
        (contentType.includes('gif') || contentType.includes('png') || contentType.includes('jpeg') || contentType.includes('jpg'));
    } catch (error) {
      return false;
    }
  };

  const handleImageChange = async (e) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, image: url }));
    
    if (url) {
      const isValid = await validateImageUrl(url);
      if (isValid) {
        setPreviewUrl(url);
        setError('');
      } else {
        setPreviewUrl('');
        setError('Please enter a valid image URL (JPEG, PNG, or GIF)');
      }
    } else {
      setPreviewUrl('');
      setError('');
    }
  };

  const handleStartIdVerification = async () => {
    console.log('ID verification button clicked');
    try {
      console.log('Starting ID verification for user:', currentUser?.username);
      
      // Call API to start ID verification
      const response = await fetch('/api/users/start-id-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(`Failed to start ID verification: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      // Open Stripe verification in new tab
      if (data.verificationUrl) {
        window.open(data.verificationUrl, '_blank');
        showNotification('ID verification started! Complete the process and wait for admin approval.', 'success');
      } else {
        throw new Error('No verification URL received from server');
      }
    } catch (error) {
      console.error('ID verification error:', error);
      showNotification(`Failed to start ID verification: ${error.message}`, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate password fields if any password field is filled
    if (formData.currentPassword || formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        setError('Current password is required to change password');
        return;
      }
      if (!formData.newPassword) {
        setError('New password is required');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
    }

    try {
      // Only include password fields if changing password
      const updateData = {
        username: formData.username,
        image: formData.image,
        country: formData.country
      };

      if (formData.currentPassword && formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
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
            {previewUrl && (
              <div className="mb-4 flex justify-center">
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-500/30"
                />
              </div>
            )}
            <input
              type="url"
              name="image"
              placeholder="Enter image URL (JPEG, PNG, or GIF)"
              value={formData.image}
              onChange={handleImageChange}
              className="w-full px-4 py-3 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
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

      {/* ID Verification Section */}
      <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FaFileAlt className="text-green-400" />
          ID Verification
        </h3>
        
        {/* Debug info - remove this after testing */}
        <div className="text-xs text-gray-500 mb-2">
          Debug: ID Verification Status: {currentUser?.idVerification?.status || 'undefined'}
        </div>
        
        {(!currentUser?.idVerification || currentUser?.idVerification?.status === 'not_started') && (
          <div className="space-y-3">
            <p className="text-gray-300 text-sm">
              Verify your identity to get the "ID Verified" badge and improve your risk score.
            </p>
            <button
              onClick={handleStartIdVerification}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Start ID Verification
            </button>
          </div>
        )}

        {currentUser?.idVerification?.status === 'pending' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="font-medium">Verification Pending</span>
            </div>
            <p className="text-gray-300 text-sm">
              Your ID verification is being reviewed by our admin team. This usually takes 24-48 hours.
            </p>
          </div>
        )}

        {currentUser?.idVerification?.status === 'verified' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-400">
              <FaCheck className="text-green-400" />
              <span className="font-medium">ID Verified</span>
            </div>
            <p className="text-gray-300 text-sm">
              Your identity has been verified. You now have the "ID Verified" badge.
            </p>
            {currentUser?.idVerification?.verifiedAt && (
              <p className="text-gray-400 text-xs">
                Verified on: {new Date(currentUser.idVerification.verifiedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {currentUser?.idVerification?.status === 'rejected' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <FaTimes className="text-red-400" />
              <span className="font-medium">Verification Rejected</span>
            </div>
            <p className="text-gray-300 text-sm">
              Your ID verification was rejected. You can try again.
            </p>
            {currentUser?.idVerification?.rejectionReason && (
              <p className="text-gray-400 text-xs">
                Reason: {currentUser.idVerification.rejectionReason}
              </p>
            )}
            <button
              onClick={handleStartIdVerification}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FaLock className="text-yellow-400" />
          Change Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
            />
          </div>
        </div>
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

        {/* Navigation Tabs - Only show on larger screens, keep mobile simple */}
        <div className="max-w-6xl mx-auto w-full mb-6">
          <div className="hidden lg:flex border-b border-gray-700/50">
            <button
              onClick={() => handleTabChange('profile')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
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
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
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
                className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'cv'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <FaFileAlt className="inline mr-2" />
                CV Builder
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

          {/* Profile and Security tabs - Inside form */}
          {activeTab !== 'cv' && (
            <form onSubmit={handleSubmit} className="h-full">
              {/* Mobile: Show all non-CV tabs as single form, Desktop: Show selected tab */}
              <div className="lg:hidden space-y-6">
                {renderProfileTab()}
                {renderSecurityTab()}
                {currentUser?.userType === 'freelancer' && (
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
                    className="px-6 py-3 bg-gray-600/50 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 flex items-center gap-2 border border-gray-600"
                  >
                    <FaTimes className="text-sm" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-blue-500/25"
                  >
                    <FaSave className="text-sm" />
                    Save Changes
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