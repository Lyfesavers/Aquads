import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import emailService from '../services/emailService';
import { FaSpinner, FaCheck, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';

const inputClass =
  'w-full rounded-lg border border-gray-600 bg-gray-900/50 px-3 py-2.5 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

const STEP_META = [
  { title: 'Account', subtitle: 'Your role and contact details' },
  { title: 'Security', subtitle: 'Choose a strong password' },
  { title: 'Profile', subtitle: 'Optional image, referral, and terms' }
];

const isImageFlowMessage = (msg) =>
  typeof msg === 'string' && (msg.includes('✨') || msg.includes('📋'));

const CreateAccountModal = ({ onCreateAccount, onSubmit, onClose }) => {
  const registerUser = onCreateAccount || onSubmit;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    image: '',
    referralCode: '',
    userType: 'freelancer',
    country: ''
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false
  });
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameValidation, setUsernameValidation] = useState({
    minLength: false,
    validChars: true  // true by default since empty string has no invalid chars
  });
  const [usernameFocused, setUsernameFocused] = useState(false);
  /** Prevents ghost taps / carried-over clicks when "Next" is swapped for "Create account" in the same screen area */
  const [finalStepActionsUnlocked, setFinalStepActionsUnlocked] = useState(true);

  // Add countries list
  const countries = [
    {code: "AF", name: "Afghanistan"},
    {code: "AX", name: "Åland Islands"},
    {code: "AL", name: "Albania"},
    {code: "DZ", name: "Algeria"},
    {code: "AS", name: "American Samoa"},
    {code: "AD", name: "Andorra"},
    {code: "AO", name: "Angola"},
    {code: "AI", name: "Anguilla"},
    {code: "AQ", name: "Antarctica"},
    {code: "AG", name: "Antigua and Barbuda"},
    {code: "AR", name: "Argentina"},
    {code: "AM", name: "Armenia"},
    {code: "AW", name: "Aruba"},
    {code: "AU", name: "Australia"},
    {code: "AT", name: "Austria"},
    {code: "AZ", name: "Azerbaijan"},
    {code: "BS", name: "Bahamas"},
    {code: "BH", name: "Bahrain"},
    {code: "BD", name: "Bangladesh"},
    {code: "BB", name: "Barbados"},
    {code: "BY", name: "Belarus"},
    {code: "BE", name: "Belgium"},
    {code: "BZ", name: "Belize"},
    {code: "BJ", name: "Benin"},
    {code: "BM", name: "Bermuda"},
    {code: "BT", name: "Bhutan"},
    {code: "BO", name: "Bolivia"},
    {code: "BA", name: "Bosnia and Herzegovina"},
    {code: "BW", name: "Botswana"},
    {code: "BV", name: "Bouvet Island"},
    {code: "BR", name: "Brazil"},
    {code: "IO", name: "British Indian Ocean Territory"},
    {code: "BN", name: "Brunei Darussalam"},
    {code: "BG", name: "Bulgaria"},
    {code: "BF", name: "Burkina Faso"},
    {code: "BI", name: "Burundi"},
    {code: "KH", name: "Cambodia"},
    {code: "CM", name: "Cameroon"},
    {code: "CA", name: "Canada"},
    {code: "CV", name: "Cape Verde"},
    {code: "KY", name: "Cayman Islands"},
    {code: "CF", name: "Central African Republic"},
    {code: "TD", name: "Chad"},
    {code: "CL", name: "Chile"},
    {code: "CN", name: "China"},
    {code: "CX", name: "Christmas Island"},
    {code: "CC", name: "Cocos (Keeling) Islands"},
    {code: "CO", name: "Colombia"},
    {code: "KM", name: "Comoros"},
    {code: "CG", name: "Congo"},
    {code: "CD", name: "Congo, The Democratic Republic of the"},
    {code: "CK", name: "Cook Islands"},
    {code: "CR", name: "Costa Rica"},
    {code: "CI", name: "Côte D'Ivoire"},
    {code: "HR", name: "Croatia"},
    {code: "CU", name: "Cuba"},
    {code: "CY", name: "Cyprus"},
    {code: "CZ", name: "Czech Republic"},
    {code: "DK", name: "Denmark"},
    {code: "DJ", name: "Djibouti"},
    {code: "DM", name: "Dominica"},
    {code: "DO", name: "Dominican Republic"},
    {code: "EC", name: "Ecuador"},
    {code: "EG", name: "Egypt"},
    {code: "SV", name: "El Salvador"},
    {code: "GQ", name: "Equatorial Guinea"},
    {code: "ER", name: "Eritrea"},
    {code: "EE", name: "Estonia"},
    {code: "ET", name: "Ethiopia"},
    {code: "FK", name: "Falkland Islands (Malvinas)"},
    {code: "FO", name: "Faroe Islands"},
    {code: "FJ", name: "Fiji"},
    {code: "FI", name: "Finland"},
    {code: "FR", name: "France"},
    {code: "GF", name: "French Guiana"},
    {code: "PF", name: "French Polynesia"},
    {code: "TF", name: "French Southern Territories"},
    {code: "GA", name: "Gabon"},
    {code: "GM", name: "Gambia"},
    {code: "GE", name: "Georgia"},
    {code: "DE", name: "Germany"},
    {code: "GH", name: "Ghana"},
    {code: "GI", name: "Gibraltar"},
    {code: "GR", name: "Greece"},
    {code: "GL", name: "Greenland"},
    {code: "GD", name: "Grenada"},
    {code: "GP", name: "Guadeloupe"},
    {code: "GU", name: "Guam"},
    {code: "GT", name: "Guatemala"},
    {code: "GG", name: "Guernsey"},
    {code: "GN", name: "Guinea"},
    {code: "GW", name: "Guinea-Bissau"},
    {code: "GY", name: "Guyana"},
    {code: "HT", name: "Haiti"},
    {code: "HM", name: "Heard Island and Mcdonald Islands"},
    {code: "VA", name: "Holy See (Vatican City State)"},
    {code: "HN", name: "Honduras"},
    {code: "HK", name: "Hong Kong"},
    {code: "HU", name: "Hungary"},
    {code: "IS", name: "Iceland"},
    {code: "IN", name: "India"},
    {code: "ID", name: "Indonesia"},
    {code: "IR", name: "Iran, Islamic Republic Of"},
    {code: "IQ", name: "Iraq"},
    {code: "IE", name: "Ireland"},
    {code: "IM", name: "Isle of Man"},
    {code: "IL", name: "Israel"},
    {code: "IT", name: "Italy"},
    {code: "JM", name: "Jamaica"},
    {code: "JP", name: "Japan"},
    {code: "JE", name: "Jersey"},
    {code: "JO", name: "Jordan"},
    {code: "KZ", name: "Kazakhstan"},
    {code: "KE", name: "Kenya"},
    {code: "KI", name: "Kiribati"},
    {code: "KP", name: "Korea, Democratic People's Republic of"},
    {code: "KR", name: "Korea, Republic of"},
    {code: "KW", name: "Kuwait"},
    {code: "KG", name: "Kyrgyzstan"},
    {code: "LA", name: "Lao People's Democratic Republic"},
    {code: "LV", name: "Latvia"},
    {code: "LB", name: "Lebanon"},
    {code: "LS", name: "Lesotho"},
    {code: "LR", name: "Liberia"},
    {code: "LY", name: "Libyan Arab Jamahiriya"},
    {code: "LI", name: "Liechtenstein"},
    {code: "LT", name: "Lithuania"},
    {code: "LU", name: "Luxembourg"},
    {code: "MO", name: "Macao"},
    {code: "MK", name: "Macedonia, The Former Yugoslav Republic of"},
    {code: "MG", name: "Madagascar"},
    {code: "MW", name: "Malawi"},
    {code: "MY", name: "Malaysia"},
    {code: "MV", name: "Maldives"},
    {code: "ML", name: "Mali"},
    {code: "MT", name: "Malta"},
    {code: "MH", name: "Marshall Islands"},
    {code: "MQ", name: "Martinique"},
    {code: "MR", name: "Mauritania"},
    {code: "MU", name: "Mauritius"},
    {code: "YT", name: "Mayotte"},
    {code: "MX", name: "Mexico"},
    {code: "FM", name: "Micronesia, Federated States of"},
    {code: "MD", name: "Moldova, Republic of"},
    {code: "MC", name: "Monaco"},
    {code: "MN", name: "Mongolia"},
    {code: "ME", name: "Montenegro"},
    {code: "MS", name: "Montserrat"},
    {code: "MA", name: "Morocco"},
    {code: "MZ", name: "Mozambique"},
    {code: "MM", name: "Myanmar"},
    {code: "NA", name: "Namibia"},
    {code: "NR", name: "Nauru"},
    {code: "NP", name: "Nepal"},
    {code: "NL", name: "Netherlands"},
    {code: "NC", name: "New Caledonia"},
    {code: "NZ", name: "New Zealand"},
    {code: "NI", name: "Nicaragua"},
    {code: "NE", name: "Niger"},
    {code: "NG", name: "Nigeria"},
    {code: "NU", name: "Niue"},
    {code: "NF", name: "Norfolk Island"},
    {code: "MP", name: "Northern Mariana Islands"},
    {code: "NO", name: "Norway"},
    {code: "OM", name: "Oman"},
    {code: "PK", name: "Pakistan"},
    {code: "PW", name: "Palau"},
    {code: "PS", name: "Palestinian Territory, Occupied"},
    {code: "PA", name: "Panama"},
    {code: "PG", name: "Papua New Guinea"},
    {code: "PY", name: "Paraguay"},
    {code: "PE", name: "Peru"},
    {code: "PH", name: "Philippines"},
    {code: "PN", name: "Pitcairn"},
    {code: "PL", name: "Poland"},
    {code: "PT", name: "Portugal"},
    {code: "PR", name: "Puerto Rico"},
    {code: "QA", name: "Qatar"},
    {code: "RE", name: "Reunion"},
    {code: "RO", name: "Romania"},
    {code: "RU", name: "Russian Federation"},
    {code: "RW", name: "Rwanda"},
    {code: "BL", name: "Saint Barthélemy"},
    {code: "SH", name: "Saint Helena"},
    {code: "KN", name: "Saint Kitts and Nevis"},
    {code: "LC", name: "Saint Lucia"},
    {code: "MF", name: "Saint Martin"},
    {code: "PM", name: "Saint Pierre and Miquelon"},
    {code: "VC", name: "Saint Vincent and the Grenadines"},
    {code: "WS", name: "Samoa"},
    {code: "SM", name: "San Marino"},
    {code: "ST", name: "Sao Tome and Principe"},
    {code: "SA", name: "Saudi Arabia"},
    {code: "SN", name: "Senegal"},
    {code: "RS", name: "Serbia"},
    {code: "SC", name: "Seychelles"},
    {code: "SL", name: "Sierra Leone"},
    {code: "SG", name: "Singapore"},
    {code: "SK", name: "Slovakia"},
    {code: "SI", name: "Slovenia"},
    {code: "SB", name: "Solomon Islands"},
    {code: "SO", name: "Somalia"},
    {code: "ZA", name: "South Africa"},
    {code: "GS", name: "South Georgia and the South Sandwich Islands"},
    {code: "ES", name: "Spain"},
    {code: "LK", name: "Sri Lanka"},
    {code: "SD", name: "Sudan"},
    {code: "SR", name: "Suriname"},
    {code: "SJ", name: "Svalbard and Jan Mayen"},
    {code: "SZ", name: "Swaziland"},
    {code: "SE", name: "Sweden"},
    {code: "CH", name: "Switzerland"},
    {code: "SY", name: "Syrian Arab Republic"},
    {code: "TW", name: "Taiwan"},
    {code: "TJ", name: "Tajikistan"},
    {code: "TZ", name: "Tanzania, United Republic of"},
    {code: "TH", name: "Thailand"},
    {code: "TL", name: "Timor-Leste"},
    {code: "TG", name: "Togo"},
    {code: "TK", name: "Tokelau"},
    {code: "TO", name: "Tonga"},
    {code: "TT", name: "Trinidad and Tobago"},
    {code: "TN", name: "Tunisia"},
    {code: "TR", name: "Turkey"},
    {code: "TM", name: "Turkmenistan"},
    {code: "TC", name: "Turks and Caicos Islands"},
    {code: "TV", name: "Tuvalu"},
    {code: "UG", name: "Uganda"},
    {code: "UA", name: "Ukraine"},
    {code: "AE", name: "United Arab Emirates"},
    {code: "GB", name: "United Kingdom"},
    {code: "US", name: "United States"},
    {code: "UM", name: "United States Minor Outlying Islands"},
    {code: "UY", name: "Uruguay"},
    {code: "UZ", name: "Uzbekistan"},
    {code: "VU", name: "Vanuatu"},
    {code: "VE", name: "Venezuela"},
    {code: "VN", name: "Viet Nam"},
    {code: "VG", name: "Virgin Islands, British"},
    {code: "VI", name: "Virgin Islands, U.S."},
    {code: "WF", name: "Wallis and Futuna"},
    {code: "EH", name: "Western Sahara"},
    {code: "YE", name: "Yemen"},
    {code: "ZM", name: "Zambia"},
    {code: "ZW", name: "Zimbabwe"}
  ];

  useEffect(() => {
    // Check URL parameters first, then sessionStorage as fallback
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    const pendingRefCode = sessionStorage.getItem('pendingReferralCode');
    
    // Use the ref code from URL or session storage.
    // Do NOT remove from sessionStorage here — keep it so it survives
    // if the user closes and reopens the modal before registering.
    // It is cleared after successful registration in handleSubmit.
    if (refCode || pendingRefCode) {
      setFormData(prev => ({
        ...prev,
        referralCode: refCode || pendingRefCode
      }));
    }
  }, []);

  // Validate password as user types
  useEffect(() => {
    const password = formData.password;
    setPasswordValidation({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[@$!%*?&]/.test(password)
    });
  }, [formData.password]);

  // Validate username as user types
  useEffect(() => {
    const username = formData.username;
    setUsernameValidation({
      minLength: username.length >= 3 && username.length <= 20,
      validChars: username.length === 0 || /^[a-zA-Z0-9_-]+$/.test(username)
    });
  }, [formData.username]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (step !== 3) {
      setFinalStepActionsUnlocked(true);
      return;
    }
    setFinalStepActionsUnlocked(false);
    const t = window.setTimeout(() => setFinalStepActionsUnlocked(true), 500);
    return () => window.clearTimeout(t);
  }, [step]);

  const isUsernameValid = () => {
    return formData.username.length > 0 && Object.values(usernameValidation).every(value => value === true);
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

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const isPasswordValid = () => {
    return Object.values(passwordValidation).every(value => value === true);
  };

  const validateStep1 = () => {
    setError('');
    if (!formData.username?.trim()) {
      setError('Username is required');
      return false;
    }
    if (!isUsernameValid()) {
      if (!usernameValidation.validChars) {
        setError('Username can only contain letters, numbers, underscores and hyphens (no spaces)');
      } else if (!usernameValidation.minLength) {
        setError('Username must be between 3 and 20 characters');
      }
      return false;
    }
    if (formData.fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return false;
    }
    if (!formData.email?.trim()) {
      setError('Email is required');
      return false;
    }
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setError('');
    if (!isPasswordValid()) {
      setError('Password does not meet all requirements');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setError('');
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const commitCreateAccount = async () => {
    if (step !== 3 || !finalStepActionsUnlocked) return;
    setError('');

    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser(formData);
      sessionStorage.removeItem('pendingReferralCode');
      setIsSubmitting(false);
    } catch (error) {
      if (error.response?.status === 429) {
        setError('Too many signup attempts. Please try again in 24 hours.');
      } else {
        setError(error.message || 'Failed to create account. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  // Add this new function to handle the Postimages upload window
  const openPostimagesUploader = () => {
    // Open Postimages in a popup window
    const postimagesWindow = window.open(
      'https://postimages.org/',
      'postimagesWindow',
      'width=1000,height=800,menubar=no,toolbar=no,location=no'
    );
    
    // Clear the field and set focus guidance
    setFormData(prev => ({ 
      ...prev, 
      image: '' 
    }));
    setPreviewUrl('');
    // Show clear instructions instead of an error
    setError('✨ Upload on Postimages, then copy the Direct link — the URL should end in .jpg, .jpeg, .png, .gif, or .webp');
    
    // For browsers that support it, set up a listener for when our window gets focus back
    // This likely means the user has completed their task in the popup
    window.addEventListener('focus', function onFocus() {
      // Update guidance when the user comes back to our window
      setError('📋 Paste that direct link above (must look like a file URL ending in .jpg, .png, etc.)');
      window.removeEventListener('focus', onFocus);
    }, { once: true });
  };

  // Keep the existing handleChange function
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If changing the image URL, update the preview and validate
    if (name === 'image' && value) {
      // If it looks like an image URL, try to validate it
      if (value.startsWith('http') && 
         (value.includes('.jpg') || value.includes('.jpeg') || 
          value.includes('.png') || value.includes('.gif'))) {
        
        // Check if the URL is valid
        validateImageUrl(value).then(isValid => {
          if (isValid) {
            setPreviewUrl(value);
            
            // Show success message
            if (error && error.includes('✨')) {
              setError('✅ Image URL successfully added!');
              // Clear the success message after 3 seconds
              setTimeout(() => setError(''), 3000);
            } else {
              setError('');
            }
          } else {
            setPreviewUrl('');
            setError('The URL does not point to a valid image. Please try again.');
          }
        });
      } else {
        // Let's be optimistic and set the preview anyway, the image tag's onError will handle invalid images
        setPreviewUrl(value);
      }
    } else if (name === 'image' && !value) {
      setPreviewUrl('');
    }
    
    // Clear error if it's not a special instruction
    if (!(name === 'image' && error && error.includes('✨'))) {
      setError('');
    }
  };

  // Password requirement item
  const PasswordRequirement = ({ met, text }) => (
    <div className="flex items-center gap-2 text-xs sm:text-sm">
      {met ? (
        <FaCheck className="text-green-500" />
      ) : (
        <FaTimes className="text-red-500" />
      )}
      <span className={met ? "text-green-500" : "text-red-500"}>{text}</span>
    </div>
  );

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[1100000000] flex flex-col bg-zinc-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-account-title"
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:items-center sm:px-6">
        <div className="min-w-0 pt-0.5 sm:pt-0">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Step {step} of {STEP_META.length}
          </p>
          <h2 id="create-account-title" className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {STEP_META[step - 1].title}
          </h2>
          <p className="mt-1 text-sm text-gray-400">{STEP_META[step - 1].subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex shrink-0 items-center justify-center rounded-full p-2.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <FaTimes className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 border-b border-white/5 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-xl gap-2">
            {STEP_META.map((_, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div
                  key={n}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    active ? 'bg-blue-500' : done ? 'bg-blue-500/40' : 'bg-zinc-800'
                  }`}
                  title={STEP_META[i].title}
                />
              );
            })}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="space-y-5">
            {step === 1 && (
            <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-200">Account type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, userType: 'freelancer' }))}
                  className={`rounded-lg border-2 py-3 text-sm font-medium transition-colors ${
                    formData.userType === 'freelancer'
                      ? 'border-blue-500 bg-blue-500/15 text-white'
                      : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  Freelancer
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, userType: 'project' }))}
                  className={`rounded-lg border-2 py-3 text-sm font-medium transition-colors ${
                    formData.userType === 'project'
                      ? 'border-blue-500 bg-blue-500/15 text-white'
                      : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  Project
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 sm:text-sm">
                {formData.userType === 'freelancer' 
                  ? 'Select this if you want to offer services'
                  : 'Select this if you want to hire freelancers'}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-200">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                required
                placeholder="Used for login"
                className={`${inputClass} ${
                  formData.username && isUsernameValid()
                    ? 'border-green-500/80 focus:border-green-500 focus:ring-green-500'
                    : formData.username && !usernameValidation.validChars
                    ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                    : ''
                }`}
              />
              
              {/* Username requirements checklist */}
              {(usernameFocused || formData.username) && (
                <div className="mt-2 space-y-1 rounded-lg border border-gray-600/80 bg-gray-900/40 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    {usernameValidation.minLength ? (
                      <FaCheck className="text-green-500" />
                    ) : (
                      <FaTimes className="text-red-500" />
                    )}
                    <span className={usernameValidation.minLength ? "text-green-500" : "text-red-500"}>
                      Between 3 and 20 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {usernameValidation.validChars ? (
                      <FaCheck className="text-green-500" />
                    ) : (
                      <FaTimes className="text-red-500" />
                    )}
                    <span className={usernameValidation.validChars ? "text-green-500" : "text-red-500"}>
                      Only letters, numbers, underscores and hyphens (no spaces)
                    </span>
                  </div>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">Your unique username for login and identification</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-200">Full name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="e.g. Jane Smith"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500">Shown to clients and on your profile</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-200">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="For verification and login recovery"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-200">Country</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Select your country</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            </>
            )}
            {step === 2 && (
            <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-200">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  placeholder="Create a strong password"
                  className={`${inputClass} pr-10 ${
                    formData.password && isPasswordValid()
                      ? 'border-green-500/80 focus:border-green-500 focus:ring-green-500'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
              
              {/* Password requirements checklist */}
              {(passwordFocused || formData.password) && (
                <div className="mt-2 space-y-1 rounded-lg border border-gray-600/80 bg-gray-900/40 p-3">
                  <PasswordRequirement 
                    met={passwordValidation.minLength} 
                    text="At least 8 characters" 
                  />
                  <PasswordRequirement 
                    met={passwordValidation.hasUppercase} 
                    text="At least one uppercase letter" 
                  />
                  <PasswordRequirement 
                    met={passwordValidation.hasLowercase} 
                    text="At least one lowercase letter" 
                  />
                  <PasswordRequirement 
                    met={passwordValidation.hasNumber} 
                    text="At least one number" 
                  />
                  <PasswordRequirement 
                    met={passwordValidation.hasSpecial} 
                    text="At least one special character (@, $, !, %, *, ?, or &)" 
                  />
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-200">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter password"
                  className={`${inputClass} pr-10 ${
                    formData.confirmPassword && formData.password === formData.confirmPassword
                      ? 'border-green-500/80 focus:border-green-500 focus:ring-green-500'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">Passwords do not match</p>
              )}
            </div>
            </>
            )}
            {step === 3 && (
            <>
            <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
              <h4 className="text-sm font-medium text-gray-200">Profile image link (optional)</h4>
              <p className="text-sm leading-relaxed text-gray-400">
                Paste a <span className="font-medium text-gray-300">direct image URL</span> — the kind that opens the picture alone in the browser, not a gallery or album page.
              </p>
              <ul className="list-inside list-disc space-y-2 text-sm text-gray-400">
                <li>
                  On hosts like Postimages, choose the <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-gray-300">Direct link</span> (or equivalent), not HTML embed or thumbnail-only links.
                </li>
                <li>
                  The address should end with a file type such as{' '}
                  <span className="font-mono text-xs text-gray-300">.jpg</span>,{' '}
                  <span className="font-mono text-xs text-gray-300">.jpeg</span>,{' '}
                  <span className="font-mono text-xs text-gray-300">.png</span>,{' '}
                  <span className="font-mono text-xs text-gray-300">.gif</span>, or{' '}
                  <span className="font-mono text-xs text-gray-300">.webp</span>
                  {' '}(extra <span className="font-mono text-xs">?query</span> parameters at the end are fine).
                </li>
                <li>If you are unsure, use <span className="font-medium text-gray-300">Upload image</span> below and copy the direct link the site gives you.</li>
              </ul>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-200">Image URL</label>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://…/photo.png"
                  className={`min-w-0 flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={openPostimagesUploader}
                  className="flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 sm:w-auto"
                >
                  Upload image
                </button>
              </div>
              {error && error.includes('✨') ? (
                <div className="mb-2 mt-2 rounded-lg border border-blue-500/25 bg-blue-500/5 p-3">
                  <h4 className="mb-2 text-sm font-medium text-blue-200">After uploading on Postimages</h4>
                  <ol className="list-inside list-decimal space-y-1.5 text-sm text-gray-300">
                    <li>Find the <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs">Direct link</span> row (URL should end in <span className="font-mono text-xs">.jpg</span>, <span className="font-mono text-xs">.png</span>, etc.).</li>
                    <li>Copy that full URL — not the HTML code or a short gallery link.</li>
                    <li>Paste it into the field above; you should see a preview when it loads.</li>
                  </ol>
                </div>
              ) : null}
              {error && error.includes('📋') ? (
                <div className="mb-2 mt-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-100/90">
                  {error}
                </div>
              ) : null}
              <p className="text-xs text-gray-500">
                Leave blank to add a profile photo later. Wrong links usually fail to preview — use a direct file URL.
              </p>
              {previewUrl && (
                <div className="mt-2">
                  <img
                    src={previewUrl}
                    alt="Profile preview"
                    className="h-20 w-20 rounded-lg border border-gray-600 object-cover"
                    onError={() => {
                      setPreviewUrl('');
                      setError('Failed to load image');
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-200">Referral code (optional)</label>
              <input
                type="text"
                name="referralCode"
                value={formData.referralCode}
                onChange={handleChange}
                placeholder="If someone referred you"
                className={inputClass}
              />
            </div>
            <div className="rounded-lg border border-blue-500/25 bg-blue-500/5 p-4">
              <p className="text-sm leading-relaxed text-gray-300">
                <span className="font-medium text-gray-200">Notice:</span> By creating an account, you accept our Terms & Conditions and understand that violation of platform rules, including taking leads or bookings outside of Aquads, will result in account suspension or termination.
              </p>
            </div>
            </>
            )}
            {error && !isImageFlowMessage(error) && (
              <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
            )}
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-white/10 bg-zinc-950/95 px-4 py-4 backdrop-blur-sm supports-[backdrop-filter]:bg-zinc-950/80 sm:px-6">
          <div
            className={`mx-auto flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center ${
              step === 1 ? 'sm:justify-end' : 'sm:justify-between'
            }`}
          >
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-600 bg-transparent px-5 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                Back
              </button>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-600 bg-transparent px-5 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:bg-white/5 disabled:opacity-50 sm:min-w-[7rem]"
              >
                Cancel
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 sm:min-w-[7rem]"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => commitCreateAccount()}
                  disabled={isSubmitting || !finalStepActionsUnlocked}
                  className="flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 sm:min-w-[10rem]"
                  title={!finalStepActionsUnlocked ? 'Ready in a moment…' : undefined}
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="mr-2 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default CreateAccountModal; 