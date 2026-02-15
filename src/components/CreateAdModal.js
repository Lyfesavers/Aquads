import React, { useState } from 'react';
import Modal from './Modal';
import { FaCheck, FaArrowLeft, FaArrowRight, FaBullhorn, FaUsers, FaTwitter, FaChartLine, FaGift, FaRocket, FaNewspaper, FaCrown, FaStar, FaFire, FaGem, FaLightbulb, FaChevronDown, FaChevronUp, FaSpinner, FaTelegram, FaRobot, FaSearch } from 'react-icons/fa';
import DiscountCodeInput from './DiscountCodeInput';
import { createAd as apiCreateAd } from '../services/api';

const BLOCKCHAIN_OPTIONS = [
  {
    name: 'Solana',
    symbol: 'SOL',
    address: 'F4HuQfUx5zsuQpxca4KQfU6uZPYtRp3Y7HYVGsuHdYVf',
    amount: 'USDC'
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    address: '0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358',
    amount: 'USDC'
  },
  {
    name: 'Base',
    symbol: 'BASE',
    address: '0xA1ec6B1df5367a41Ff9EadEF7EC4cC25C0ff7358',
    amount: 'USDC'
  },
  {
    name: 'Sui',
    symbol: 'SUI',
    address: '0xdadea3003856d304535c3f1b6d5670ab07a8e71715c7644bf230dd3a4ba7d13a',
    amount: 'USDC'
  }
];

// Aquads-branded marketing add-on packages - Powered by Mintfunnel (Coinbound)
// All information sourced directly from https://mintfunnel.co/crypto-press-release-distribution/
const ADDON_PACKAGES = [
  {
    id: 'aqua_splash',
    name: 'AquaSplash',
    partnerName: 'On-Demand Media',
    originalPrice: 99,
    price: 99,
    icon: FaNewspaper,
    color: 'from-green-500 to-emerald-500',
    turnaround: 'Same Day Available',
    features: [
      'Pick Your Own Media Outlets',
      'Create Custom Campaigns',
      'Mintfunnel Newsroom Inclusion',
      'Same Day Distribution Available'
    ]
  },
  {
    id: 'aqua_ripple',
    name: 'AquaRipple',
    partnerName: 'Basic Package',
    originalPrice: 299,
    price: 284, // 5% discount
    icon: FaStar,
    color: 'from-blue-500 to-cyan-500',
    turnaround: '24-48 Hours',
    features: [
      '4+ Media Pickups Guaranteed',
      'Mintfunnel Newsroom & Additional Platforms',
      'Basic Support Services',
      'Professional Distribution Network'
    ]
  },
  {
    id: 'aqua_wave',
    name: 'AquaWave',
    partnerName: 'Starter Package',
    originalPrice: 1399,
    price: 1329, // 5% discount
    icon: FaRocket,
    color: 'from-green-500 to-teal-500',
    turnaround: '24-72 Hours',
    features: [
      '9+ Media Pickups Guaranteed',
      'Mintfunnel Newsroom & More',
      'Telegram Chat Support',
      'FREE SEO Optimizations'
    ]
  },
  {
    id: 'aqua_flow',
    name: 'AquaFlow',
    partnerName: 'Growth Package',
    originalPrice: 2899,
    price: 2754, // 5% discount
    icon: FaChartLine,
    color: 'from-purple-500 to-indigo-500',
    turnaround: '24-72 Hours',
    popular: true,
    features: [
      'Coverage from Cryptopolitan',
      'Coverage from BraveNewCoin',
      'Coverage from CoinCodex',
      'Coverage from Bitcolumnist',
      'Mintfunnel Newsroom & More',
      'Telegram Chat Support',
      'FREE SEO Optimizations'
    ]
  },
  {
    id: 'aqua_storm',
    name: 'AquaStorm',
    partnerName: 'Launch Package',
    originalPrice: 6499,
    price: 6174, // 5% discount
    icon: FaFire,
    color: 'from-orange-500 to-red-500',
    turnaround: '24-72 Hours',
    features: [
      'Everything from Starter Package, plus:',
      '75+ Media Pickups Guaranteed',
      'Mintfunnel Newsroom Inclusion',
      'Site Audience of 75M+',
      'Telegram Chat Support',
      'FREE SEO Optimizations'
    ]
  },
  {
    id: 'aqua_tidal',
    name: 'AquaTidal',
    partnerName: 'Hypergrowth Package',
    originalPrice: 12999,
    price: 12349, // 5% discount
    icon: FaGem,
    color: 'from-indigo-500 to-purple-500',
    turnaround: '24-72 Hours',
    features: [
      'Everything from Launch Package, plus:',
      '125+ Media Pickups Guaranteed',
      'Video Chat Support',
      'GUARANTEED: CoinTelegraph',
      'GUARANTEED: CoinMarketCap',
      'GUARANTEED: Cryptopolitan'
    ]
  },
  {
    id: 'aqua_legend',
    name: 'AquaLegend',
    partnerName: 'Epic Package',
    originalPrice: 21999,
    price: 20899, // 5% discount
    icon: FaCrown,
    color: 'from-yellow-500 to-amber-500',
    turnaround: '24-72 Hours',
    features: [
      'GUARANTEED Coverage from ALL Top Publications:',
      '• CoinTelegraph',
      '• CoinMarketCap',
      '• Bitcoin.com',
      '• AMB Crypto',
      '• CoinCodex',
      '• Cryptopolitan',
      '• CoinGape',
      '• CryptoNews',
      'Video Chat Support',
      'Mintfunnel Newsroom Inclusion'
    ]
  }
];

const CreateAdModal = ({ onCreateAd, onClose, currentUser, preSelectedPackage = null, userAds = [] }) => {
  // Check if user is an affiliate (referred by another user)
  const isAffiliate = currentUser && currentUser.referredBy;
  const BASE_LISTING_FEE = 199;
  const AFFILIATE_DISCOUNT_RATE = 0.05; // 5%
  const affiliateDiscount = isAffiliate ? BASE_LISTING_FEE * AFFILIATE_DISCOUNT_RATE : 0;
  const discountedBaseFee = BASE_LISTING_FEE - affiliateDiscount;

  // Check if user has existing projects
  const userProjects = userAds.filter(ad => ad.owner === currentUser?.username);
  const hasExistingProjects = userProjects.length > 0;

  // Track if this is an add-on only purchase (no new project listing)
  const [isAddOnOnly, setIsAddOnOnly] = useState(false);
  const [selectedExistingProject, setSelectedExistingProject] = useState(null);

  // Calculate initial addon total if a package is pre-selected
  const getInitialAddonTotal = () => {
    if (preSelectedPackage) {
      const addon = ADDON_PACKAGES.find(pkg => pkg.id === preSelectedPackage);
      return addon ? addon.price : 0;
    }
    return 0;
  };

  // Get base fee - $0 if add-on only, otherwise normal fee
  const getBaseFee = () => isAddOnOnly ? 0 : discountedBaseFee;

  const [formData, setFormData] = useState({
    title: '',
    logo: '',
    url: '',
    pairAddress: '',
    blockchain: 'ethereum',
    txSignature: '',
    paymentChain: '',
    chainSymbol: '',
    chainAddress: '',
    selectedAddons: preSelectedPackage ? [preSelectedPackage] : [], // Pre-select package if provided
    totalAmount: discountedBaseFee + getInitialAddonTotal(), // Base listing fee + pre-selected addon
    isAffiliate: isAffiliate,
    affiliateDiscount: affiliateDiscount
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [expandedPackages, setExpandedPackages] = useState(new Set()); // Track expanded packages
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [fetchStatus, setFetchStatus] = useState(''); // '', 'success', 'error'
  const [searchAddress, setSearchAddress] = useState(''); // The address user types to search

  // Fetch token data from DexScreener using contract or pair address
  const fetchTokenData = async () => {
    const address = searchAddress.trim();
    if (!address) {
      setError('Please enter a contract or pair address');
      return;
    }

    setIsFetchingToken(true);
    setFetchStatus('');
    setError('');

    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${address}`);
      if (!response.ok) throw new Error('Failed to fetch token data');
      
      const data = await response.json();
      
      if (!data.pairs || data.pairs.length === 0) {
        setFetchStatus('error');
        setError('No token found for this address. Please check and try again.');
        return;
      }

      // Get the top pair (highest liquidity/volume is returned first by DexScreener)
      const topPair = data.pairs[0];
      
      // These 3 fields are 100% guaranteed in every DexScreener response
      const tokenSymbol = topPair.baseToken?.symbol || '';
      const chainId = topPair.chainId || 'ethereum';
      const pairAddr = topPair.pairAddress || '';

      // Use ticker symbol as the title
      const title = tokenSymbol;

      setFormData(prev => ({
        ...prev,
        title: title,
        blockchain: chainId,
        pairAddress: pairAddr
      }));

      setFetchStatus('success');
    } catch (err) {
      console.error('Error fetching token data:', err);
      setFetchStatus('error');
      setError('Failed to fetch token data. You can fill in the fields manually.');
    } finally {
      setIsFetchingToken(false);
    }
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

  const validatePairAddress = (address) => {
    // Sui format (0x...::module::TOKEN)
    const suiRegex = /^0x[0-9a-fA-F]+::[a-zA-Z0-9_]+::[A-Z0-9_]+$/;
    
    // Base58 format (for Solana)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    
    // Hex format with 0x prefix (for ETH, BSC etc)
    const hexRegex = /^0x[0-9a-fA-F]{40,64}$/;
    
    // General alphanumeric format for other chains
    const generalRegex = /^[0-9a-zA-Z]{15,70}$/;

    return suiRegex.test(address) || 
           base58Regex.test(address) || 
           hexRegex.test(address) || 
           generalRegex.test(address);
  };

  const handleLogoChange = async (e) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, logo: url }));
    setFetchStatus(''); // Clear fetch status when user starts filling logo
    
    if (url) {
      const isValid = await validateImageUrl(url);
      if (isValid) {
        setPreviewUrl(url);
        setError('');
      } else {
        setPreviewUrl('');
        setError('Please enter a valid image URL (GIF or PNG)');
      }
    } else {
      setPreviewUrl('');
      setError('');
    }
  };


  const handleInfoSubmit = (e) => {
    e.preventDefault();
    if (!previewUrl) {
      setError('Please enter a valid image URL');
      return;
    }

    if (!validatePairAddress(formData.pairAddress)) {
      setError('Please enter a valid pair address');
      return;
    }

    // Move to add-on packages step
    setStep(2);
  };

  const handleAddonStep = () => {
    // Move to payment step
    setStep(3);
  };

  const handleSkipAddons = () => {
    // Clear selected add-ons and move to payment
    const baseFee = isAddOnOnly ? 0 : discountedBaseFee;
    setFormData(prev => ({
      ...prev,
      selectedAddons: [],
      totalAmount: baseFee // Reset to base price (0 if add-on only)
    }));
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      handleInfoSubmit(e);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // For add-on only purchases, use separate endpoint (doesn't create bubble)
      if (isAddOnOnly && selectedExistingProject) {
        const token = currentUser?.token || localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required. Please log in again.');
        }
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://aquads.onrender.com'}/api/addon-orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            projectId: selectedExistingProject._id || selectedExistingProject.id,
            projectTitle: selectedExistingProject.title,
            projectLogo: selectedExistingProject.logo,
            selectedAddons: formData.selectedAddons,
            totalAmount: formData.totalAmount,
            txSignature: 'aquapay-pending',
            paymentMethod: 'aquapay',
            paymentChain: 'AquaPay',
            chainSymbol: 'USDC',
            chainAddress: 'https://aquads.xyz/pay/aquads',
            discountCode: appliedDiscount ? appliedDiscount.discountCode.code : null
          })
        });
        
        const newAddonOrder = await response.json();
        
        if (!response.ok) {
          throw new Error(newAddonOrder.error || 'Failed to submit addon order');
        }
        // Open AquaPay link with amount and addonOrderId
        const aquaPayUrl = `https://aquads.xyz/pay/aquads?amount=${formData.totalAmount}&addonOrderId=${newAddonOrder._id || newAddonOrder.id}`;
        window.open(aquaPayUrl, '_blank');
        
        alert('Please complete the payment in the opened window. Your marketing package order will be processed once payment is verified by an admin.');
        onClose();
        return;
      }
      
      // Regular project listing - create Ad first with aquapay-pending
      // Call API directly to get the created ad's ID for the AquaPay URL
      const adDataForApi = {
        ...formData,
        txSignature: 'aquapay-pending',
        paymentMethod: 'aquapay',
        paymentChain: 'AquaPay',
        chainSymbol: 'USDC',
        chainAddress: 'https://aquads.xyz/pay/aquads',
        isAffiliate: isAffiliate,
        affiliateDiscount: affiliateDiscount,
        discountCode: appliedDiscount ? appliedDiscount.discountCode.code : null
      };
      
      // Call API directly to get the created ad with ID
      const newAd = await apiCreateAd(adDataForApi);
      
      // Open AquaPay link with amount and projectId
      const aquaPayUrl = `https://aquads.xyz/pay/aquads?amount=${formData.totalAmount}&projectId=${newAd._id || newAd.id}`;
      window.open(aquaPayUrl, '_blank');
      
      // Close modal and show success message
      onClose();
      alert('Please complete the payment in the opened window. Your listing will be verified by an admin and activated once approved.');
    } catch (error) {
      console.error('Error submitting:', error);
      setError(error.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayPalPurchase = async () => {
    // Validate required data before proceeding (only if not add-on only)
    if (!isAddOnOnly && (!formData.title || !formData.logo || !formData.url || !formData.pairAddress)) {
      alert('Please complete all required fields in step 1');
      return;
    }

    // For add-on only, make sure at least one package is selected
    if (isAddOnOnly && formData.selectedAddons.length === 0) {
      alert('Please select at least one marketing package');
      return;
    }

    try {
      // Open PayPal payment link
      window.open('https://www.paypal.com/ncp/payment/4XBSMGVA348FC', '_blank');
      
      // For add-on only purchases, use separate endpoint (doesn't create bubble)
      if (isAddOnOnly && selectedExistingProject) {
        const token = currentUser?.token || localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required. Please log in again.');
        }
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://aquads.onrender.com'}/api/addon-orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            projectId: selectedExistingProject._id || selectedExistingProject.id,
            projectTitle: selectedExistingProject.title,
            projectLogo: selectedExistingProject.logo,
            selectedAddons: formData.selectedAddons,
            totalAmount: formData.totalAmount,
            txSignature: 'paypal',
            paymentMethod: 'paypal',
            paymentChain: 'PayPal',
            chainSymbol: 'USD',
            chainAddress: 'https://www.paypal.com/ncp/payment/4XBSMGVA348FC',
            discountCode: appliedDiscount ? appliedDiscount.discountCode.code : null
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit addon order');
        }
        
        alert('PayPal payment initiated! Please complete the payment in the opened window. Your marketing package order will be processed once payment is verified.');
        onClose();
        return;
      }
      
      // Regular project listing with PayPal
      await onCreateAd({
        ...formData,
        txSignature: 'paypal',
        paymentMethod: 'paypal',
        paymentChain: 'PayPal',
        chainSymbol: 'USD',
        chainAddress: 'https://www.paypal.com/ncp/payment/4XBSMGVA348FC',
        isAffiliate: isAffiliate,
        affiliateDiscount: affiliateDiscount,
        discountCode: appliedDiscount ? appliedDiscount.discountCode.code : null
      });

      alert('PayPal payment initiated! Please complete the payment in the opened window. Your listing will be verified by an admin and activated once approved.');
    } catch (error) {
      console.error('Error creating PayPal listing:', error);
      alert(error.message || 'Failed to create listing');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'logo') {
      handleLogoChange(e);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddonToggle = (addonId) => {
    setFormData(prev => {
      const selectedAddons = prev.selectedAddons.includes(addonId)
        ? prev.selectedAddons.filter(id => id !== addonId)
        : [...prev.selectedAddons, addonId];
      
      const addonTotal = selectedAddons.reduce((sum, id) => {
        const addon = ADDON_PACKAGES.find(pkg => pkg.id === id);
        return sum + (addon ? addon.price : 0);
      }, 0);
      
      const baseFee = isAddOnOnly ? 0 : discountedBaseFee;
      
      return {
        ...prev,
        selectedAddons,
        totalAmount: baseFee + addonTotal // Base fee (0 if add-on only) + add-ons
      };
    });
  };

  // Handle switching to add-on only mode
  const handleSkipToAddons = (projectId = null) => {
    setIsAddOnOnly(true);
    if (projectId) {
      const project = userProjects.find(p => p._id === projectId || p.id === projectId);
      setSelectedExistingProject(project);
    }
    // Recalculate total without base listing fee
    const addonTotal = formData.selectedAddons.reduce((sum, id) => {
      const addon = ADDON_PACKAGES.find(pkg => pkg.id === id);
      return sum + (addon ? addon.price : 0);
    }, 0);
    setFormData(prev => ({
      ...prev,
      totalAmount: addonTotal // Just add-ons, no base fee
    }));
    setStep(2); // Go directly to add-on packages
  };

  // Handle switching back to full listing mode
  const handleBackToListing = () => {
    setIsAddOnOnly(false);
    setSelectedExistingProject(null);
    // Recalculate total with base listing fee
    const addonTotal = formData.selectedAddons.reduce((sum, id) => {
      const addon = ADDON_PACKAGES.find(pkg => pkg.id === id);
      return sum + (addon ? addon.price : 0);
    }, 0);
    setFormData(prev => ({
      ...prev,
      totalAmount: discountedBaseFee + addonTotal
    }));
    setStep(1);
  };

  const togglePackageExpansion = (packageId) => {
    setExpandedPackages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(packageId)) {
        newSet.delete(packageId);
      } else {
        newSet.add(packageId);
      }
      return newSet;
    });
  };

  const handleDiscountApplied = (discountData) => {
    setAppliedDiscount(discountData);
    // Update total amount with discount
    const newTotal = discountData.finalAmount;
    setFormData(prev => ({ ...prev, totalAmount: newTotal }));
  };

  const handleDiscountRemoved = () => {
    setAppliedDiscount(null);
    // Recalculate total without discount
    const baseFee = isAddOnOnly ? 0 : discountedBaseFee;
    const addonCosts = formData.selectedAddons.reduce((total, addonId) => {
      const addon = ADDON_PACKAGES.find(pkg => pkg.id === addonId);
      return total + (addon ? addon.price : 0);
    }, 0);
    const newTotal = baseFee + addonCosts;
    setFormData(prev => ({ ...prev, totalAmount: newTotal }));
  };

  const getStepTitle = () => {
    if (isAddOnOnly) {
      switch(step) {
        case 2: return 'Marketing Packages';
        case 3: return 'Marketing Package Payment';
        default: return 'Marketing Packages';
      }
    }
    switch(step) {
      case 1: return 'List New Project';
      case 2: return 'Add-on Packages';
      case 3: return 'Premium Listing Package';
      default: return 'List New Project';
    }
  };

  const getStepCount = () => isAddOnOnly ? '2' : '3';

  return (
    <Modal onClose={onClose} fullScreen={true}>
      <div className="text-white max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">
          {getStepTitle()}
          <span className="text-lg text-gray-400 ml-3 block sm:inline">
            Step {isAddOnOnly ? (step === 2 ? '1' : '2') : step} of {getStepCount()}
          </span>
          {isAddOnOnly && selectedExistingProject && (
            <span className="block text-sm text-purple-400 mt-2">
              Adding packages for: {selectedExistingProject.title}
            </span>
          )}
        </h2>
        
        {step === 1 && (
          <form onSubmit={handleInfoSubmit} className="space-y-6 max-w-2xl mx-auto">
            {/* Skip to Add-ons Option for Users with Existing Projects */}
            {hasExistingProjects && (
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/50 rounded-xl p-5 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="bg-purple-500 p-2 rounded-full flex-shrink-0">
                    <FaRocket className="text-white text-sm" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-2">Already have a project listed?</h4>
                    <p className="text-gray-300 text-sm mb-3">
                      Skip the project listing and go directly to our PR & Marketing packages for your existing project.
                    </p>
                    
                    {userProjects.length === 1 ? (
                      <button
                        type="button"
                        onClick={() => handleSkipToAddons(userProjects[0]._id || userProjects[0].id)}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all text-sm"
                      >
                        <FaGift className="mr-2" />
                        Get Add-on Packages for "{userProjects[0].title}"
                        <FaArrowRight className="ml-2" />
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-gray-400 text-xs">Select a project to add packages to:</p>
                        <div className="flex flex-wrap gap-2">
                          {userProjects.slice(0, 5).map(project => (
                            <button
                              key={project._id || project.id}
                              type="button"
                              onClick={() => handleSkipToAddons(project._id || project.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all text-sm border border-gray-600 hover:border-purple-500"
                            >
                              {project.title}
                            </button>
                          ))}
                        </div>
                        {userProjects.length > 5 && (
                          <p className="text-gray-500 text-xs">+ {userProjects.length - 5} more projects</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Enter address to auto-fetch token data */}
            <div className="p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl">
              <label className="block mb-2 text-lg font-medium">
                Contract or Pair Address
              </label>
              <p className="text-gray-400 text-sm mb-3">
                Paste your token's contract address or pair address to auto-fill project details
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchTokenData(); } }}
                  placeholder="Enter contract or pair address..."
                  className="flex-1 px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                />
                <button
                  type="button"
                  onClick={fetchTokenData}
                  disabled={isFetchingToken || !searchAddress.trim()}
                  className={`px-5 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                    isFetchingToken || !searchAddress.trim()
                      ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isFetchingToken ? (
                    <><FaSpinner className="animate-spin" /> Fetching...</>
                  ) : (
                    <><FaSearch /> Fetch</>
                  )}
                </button>
              </div>
              {fetchStatus === 'success' && (
                <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
                  <FaCheck /> Token data found! Fields have been auto-filled below.
                </p>
              )}
              {fetchStatus === 'error' && error && (
                <p className="text-yellow-400 text-sm mt-2">
                  {error} You can still fill in the fields manually below.
                </p>
              )}
            </div>

            {/* Auto-filled fields (editable) */}
            <div>
              <label className="block mb-2 text-lg font-medium">
                Title
                {fetchStatus === 'success' && <span className="text-green-400 text-sm ml-2">(auto-filled)</span>}
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Token name e.g. Pepe (PEPE)"
                required
                className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
            </div>
            <div>
              <label className="block mb-2 text-lg font-medium">
                Pair Address
                {fetchStatus === 'success' && <span className="text-green-400 text-sm ml-2">(auto-filled)</span>}
              </label>
              <input
                type="text"
                name="pairAddress"
                value={formData.pairAddress}
                onChange={handleChange}
                placeholder="Enter pair address (0x...)"
                required
                className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
            </div>
            <div>
              <label className="block mb-2 text-lg font-medium">
                Blockchain
                {fetchStatus === 'success' && <span className="text-green-400 text-sm ml-2">(auto-filled)</span>}
              </label>
              <select
                name="blockchain"
                value={formData.blockchain}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              >
                <option value="ethereum">Ethereum</option>
                <option value="bsc">Binance Smart Chain</option>
                <option value="polygon">Polygon</option>
                <option value="solana">Solana</option>
                <option value="avalanche">Avalanche</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="optimism">Optimism</option>
                <option value="base">Base</option>
                <option value="sui">Sui</option>
                <option value="near">NEAR</option>
                <option value="fantom">Fantom</option>
                <option value="tron">TRON</option>
                <option value="cronos">Cronos</option>
                <option value="celo">Celo</option>
                <option value="harmony">Harmony</option>
                <option value="moonbeam">Moonbeam</option>
                <option value="moonriver">Moonriver</option>
                <option value="cosmos">Cosmos</option>
                <option value="polkadot">Polkadot</option>
                <option value="hedera">Hedera</option>
                <option value="kadena">Kadena</option>
                <option value="stacks">Stacks</option>
                <option value="oasis">Oasis</option>
                <option value="zilliqa">Zilliqa</option>
                <option value="elrond">MultiversX (Elrond)</option>
                <option value="kava">Kava</option>
                <option value="injective">Injective</option>
                <option value="aptos">Aptos</option>
                <option value="algorand">Algorand</option>
                <option value="stellar">Stellar</option>
                <option value="flow">Flow</option>
                <option value="cardano">Cardano</option>
                <option value="ton">TON</option>
                <option value="tezos">Tezos</option>
                <option value="kaspa">Kaspa</option>
              </select>
            </div>

            {/* Manual fields - user always fills these */}
            <div>
              <label className="block mb-2 text-lg font-medium">Logo URL (GIF or PNG)</label>
              <input
                type="url"
                name="logo"
                value={formData.logo}
                onChange={handleChange}
                placeholder="Enter image URL (GIF or PNG)"
                required
                className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
              {error && fetchStatus !== 'error' && <p className="text-red-500 text-sm mt-1">{error}</p>}
              {previewUrl && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2">Preview:</p>
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="max-w-full h-32 object-contain mx-auto rounded"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block mb-2 text-lg font-medium">Website URL</label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!!error}
                className={`flex items-center px-6 py-3 rounded-lg text-lg ${
                  error 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                Next <FaArrowRight className="ml-2" />
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="max-w-4xl mx-auto">
            {/* Add-on Packages Header */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">
                Enhance Your Listing with Premium Add-on Packages
              </h3>
                             <p className="text-gray-300 text-lg">
                 Select optional marketing packages to maximize your project's reach and impact.
               </p>
            </div>

            {/* Marketing Add-on Packages */}
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-600/50 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <FaGift className="mr-3 text-purple-400" />
                Marketing Add-on Packages
              </h3>
              
              {/* 5% Discount Promotion Banner */}
              <div className="mb-4 p-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full font-bold animate-pulse">
                    🎉 SPECIAL OFFER: 5% OFF ALL ADD-ON PACKAGES
                  </span>
                </div>
                <p className="text-center text-red-200 text-xs mt-1">
                  Save on premium marketing services - confirmed discount from our partners!
                </p>
              </div>
              
              <p className="text-gray-300 mb-4 text-sm">
                Supercharge your listing with premium marketing packages designed to maximize your project's reach and impact.
              </p>
              
              <div className="space-y-3">
                {ADDON_PACKAGES.map((addon) => {
                  const IconComponent = addon.icon;
                  const isSelected = formData.selectedAddons.includes(addon.id);
                  const isExpanded = expandedPackages.has(addon.id);
                  const hasMoreFeatures = addon.features.length > 3;
                  
                  return (
                    <div
                      key={addon.id}
                      className={`border rounded-lg p-4 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50'
                          : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`bg-gradient-to-r ${addon.color} p-2 rounded-lg`}>
                            <IconComponent className="text-white text-sm" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-white flex items-center">
                                {addon.name}
                                <div className="ml-2 flex items-center space-x-2">
                                  {addon.originalPrice > addon.price && (
                                    <span className="text-xs text-gray-400 line-through">
                                      ${addon.originalPrice.toLocaleString()}
                                    </span>
                                  )}
                                  <span className="text-sm font-bold text-green-400">
                                    ${addon.price.toLocaleString()} USDC
                                  </span>
                                  {addon.originalPrice > addon.price && (
                                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                      5% OFF
                                    </span>
                                  )}
                                </div>
                              </h4>
                              {hasMoreFeatures && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePackageExpansion(addon.id);
                                  }}
                                  className="text-gray-400 hover:text-white transition-colors p-1"
                                  title={isExpanded ? 'Show less' : 'Show more features'}
                                >
                                  {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                                </button>
                              )}
                            </div>
                            <ul className="text-xs text-gray-400 mt-1 space-y-1">
                              {(isExpanded ? addon.features : addon.features.slice(0, 3)).map((feature, idx) => (
                                <li key={idx}>• {feature}</li>
                              ))}
                              {!isExpanded && hasMoreFeatures && (
                                <li className="text-gray-500">
                                  + {addon.features.length - 3} more features...
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePackageExpansion(addon.id);
                                    }}
                                    className="ml-1 text-blue-400 hover:text-blue-300 underline"
                                  >
                                    Click to expand
                                  </button>
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                        <div 
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                            isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                          }`}
                          onClick={() => handleAddonToggle(addon.id)}
                        >
                          {isSelected && <FaCheck className="text-white text-xs" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Add-ons Summary */}
            {formData.selectedAddons.length > 0 && (
              <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/50 rounded-lg p-4 mb-6">
                <h4 className="font-bold text-white mb-2">Selected Add-on Packages:</h4>
                <div className="space-y-2">
                  {formData.selectedAddons.map(addonId => {
                    const addon = ADDON_PACKAGES.find(pkg => pkg.id === addonId);
                    return addon ? (
                      <div key={addonId} className="flex justify-between items-center">
                        <span className="text-gray-300">{addon.name}</span>
                        <span className="text-green-400 font-bold">${addon.price.toLocaleString()} USDC</span>
                      </div>
                    ) : null;
                  })}
                  <div className="border-t border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">Add-ons Total:</span>
                      <span className="text-xl font-bold text-green-400">
                        ${(formData.totalAmount - discountedBaseFee).toLocaleString()} USDC
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              {isAddOnOnly ? (
                <button
                  onClick={handleBackToListing}
                  className="flex items-center px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-lg"
                >
                  <FaArrowLeft className="mr-2" /> List New Project Instead
                </button>
              ) : (
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-lg"
                >
                  <FaArrowLeft className="mr-2" /> Back
                </button>
              )}
              
              <div className="flex space-x-4">
                {!isAddOnOnly && (
                  <button
                    onClick={handleSkipAddons}
                    className="px-6 py-3 rounded-lg bg-gray-500 hover:bg-gray-600 text-lg"
                  >
                    Skip Add-ons
                  </button>
                )}
                <button
                  onClick={handleAddonStep}
                  disabled={isAddOnOnly && formData.selectedAddons.length === 0}
                  className={`flex items-center px-6 py-3 rounded-lg text-lg ${
                    isAddOnOnly && formData.selectedAddons.length === 0
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  Continue <FaArrowRight className="ml-2" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[85vh]">
            {/* Package Benefits - Different display for add-on only vs full listing */}
            <div className="order-2 lg:order-1 h-full overflow-y-auto">
              {isAddOnOnly ? (
                /* Add-on Only Summary */
                <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-500/50 rounded-xl p-6 mb-6">
                  <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                    <FaGift className="mr-3 text-purple-400" />
                    Marketing Package Order
                  </h3>
                  {selectedExistingProject && (
                    <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                      <p className="text-gray-400 text-sm">For Project:</p>
                      <p className="text-white font-semibold text-lg">{selectedExistingProject.title}</p>
                    </div>
                  )}
                  <p className="text-gray-300 mb-6">
                    You're purchasing PR & marketing packages powered by our partner Mintfunnel. We'll handle the entire setup and delivery process for you.
                  </p>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-white">Selected Packages:</h4>
                    {formData.selectedAddons.length > 0 ? (
                      formData.selectedAddons.map(addonId => {
                        const addon = ADDON_PACKAGES.find(pkg => pkg.id === addonId);
                        if (!addon) return null;
                        const IconComponent = addon.icon;
                        return (
                          <div key={addonId} className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg">
                            <div className={`bg-gradient-to-r ${addon.color} p-2 rounded-lg`}>
                              <IconComponent className="text-white text-sm" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-semibold text-white">{addon.name}</h5>
                                  <p className="text-gray-500 text-xs">{addon.partnerName}</p>
                                </div>
                                <span className="text-green-400 font-bold">${addon.price.toLocaleString()}</span>
                              </div>
                              <p className="text-gray-400 text-xs mt-1">{addon.turnaround}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 italic">No packages selected</p>
                    )}
                  </div>
                  
                  <div className="mt-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
                    <p className="text-green-300 text-sm font-medium">
                      ✓ We handle all coordination with Mintfunnel<br/>
                      ✓ Your PR content will be reviewed and optimized<br/>
                      ✓ Full support throughout the process
                    </p>
                  </div>
                </div>
              ) : (
                /* Full Listing Package Benefits */
                <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-500/50 rounded-xl p-6 mb-6">
                  <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                    <FaRocket className="mr-3 text-blue-400" />
                    Premium Listing Package - {isAffiliate ? (
                      <span>
                        <span className="line-through text-gray-400 ml-2">${BASE_LISTING_FEE} USDC</span>
                        <span className="text-green-400 ml-2">${discountedBaseFee.toFixed(2)} USDC</span>
                        <span className="bg-green-500 text-white px-2 py-1 rounded text-sm ml-2">5% Affiliate Discount</span>
                      </span>
                    ) : (
                      `$${BASE_LISTING_FEE} USDC`
                    )}
                  </h3>
                <p className="text-gray-300 mb-6">
                  Get maximum exposure and professional marketing support for your project with our comprehensive premium package.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-green-500 p-2 rounded-full">
                      <FaGift className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">3 Months Free Bubble Bumping</h4>
                      <p className="text-gray-300 text-sm">Keep your project at the top of our bubble display for maximum visibility. Get access to full features like voting, ranking and being on the main page.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-blue-500 p-2 rounded-full">
                      <FaBullhorn className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">PR Press Release Publication</h4>
                      <p className="text-gray-300 text-sm">One Professional press release published on Aquads and our partner publications website, with access to 20+ premium newsroom platforms available for upgrade</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-indigo-500 p-2 rounded-full">
                      <FaNewspaper className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Premium Platform Access</h4>
                      <p className="text-gray-300 text-sm">Access to premium distribution channels including CoinDesk, CoinMarketCap and other tier-1 platforms (additional premium services available as add-ons)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-purple-500 p-2 rounded-full">
                      <FaUsers className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Free AMA Services</h4>
                      <p className="text-gray-300 text-sm">Host an Ask Me Anything session with our community to build trust and engagement</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-cyan-500 p-2 rounded-full">
                      <FaTwitter className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Community Twitter Raids</h4>
                      <p className="text-gray-300 text-sm">Access to our coordinated Twitter raid campaigns for viral social media exposure</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-gray-800/50 to-blue-900/30 rounded-lg border-2 border-blue-500/50">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-full">
                      <FaTelegram className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        Free Custom Telegram Bot 
                        <span className="bg-green-500 text-white px-2 py-0.5 rounded text-xs">NEW!</span>
                      </h4>
                      <p className="text-gray-300 text-sm">Get your own customizable Telegram bot with custom branding, voting system, raid coordination, and community engagement tools - all managed through our platform!</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-orange-500 p-2 rounded-full">
                      <FaChartLine className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Paid Ad Campaign Exposure</h4>
                      <p className="text-gray-300 text-sm">Featured placement in our targeted advertising campaigns across multiple channels</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg border-2 border-yellow-500/50">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-2 rounded-full">
                      <FaGift className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">$50 Free Ad Credit</h4>
                      <p className="text-gray-300 text-sm">Get $50 in free advertising credits to run ads on our partner platform across 1500+ platforms including Forbes, CoinTelegraph, and so much more</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
                  <p className="text-green-300 text-sm font-medium">
                    ✓ Total Value: Over $1000 in marketing services<br/>
                    ✓ Your listing will be reviewed and approved by our admins<br/>
                    ✓ Full refund if rejected for any reason
                  </p>
                </div>
              </div>
              )}
            </div>

            {/* Payment Form */}
            <div className="order-1 lg:order-2 h-full overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6 h-full">
                {/* Total Amount Display */}
                <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Total Amount:</span>
                    <span className="text-2xl font-bold text-green-400">
                      ${formData.totalAmount.toLocaleString()} USDC
                    </span>
                  </div>
                  {(formData.selectedAddons.length > 0 || isAddOnOnly) && (
                    <div className="mt-2 pt-2 border-t border-gray-600">
                      <div className="text-sm text-gray-300">
                        {!isAddOnOnly && (
                          <>
                            <div className="flex justify-between">
                              <span>Base Listing:</span>
                              <span>
                                {isAffiliate ? (
                                  <span>
                                    <span className="line-through text-gray-400">${BASE_LISTING_FEE}</span>
                                    <span className="text-green-400 ml-1">${discountedBaseFee.toFixed(2)} USDC</span>
                                  </span>
                                ) : (
                                  `$${BASE_LISTING_FEE} USDC`
                                )}
                              </span>
                            </div>
                            {isAffiliate && (
                              <div className="flex justify-between text-green-400">
                                <span>Affiliate Discount (5%):</span>
                                <span>-${affiliateDiscount.toFixed(2)} USDC</span>
                              </div>
                            )}
                          </>
                        )}
                        {isAddOnOnly && selectedExistingProject && (
                          <div className="flex justify-between text-purple-300 mb-2">
                            <span>For Project:</span>
                            <span>{selectedExistingProject.title}</span>
                          </div>
                        )}
                        {formData.selectedAddons.map(addonId => {
                          const addon = ADDON_PACKAGES.find(pkg => pkg.id === addonId);
                          return addon ? (
                            <div key={addonId} className="flex justify-between">
                              <span>{addon.name}:</span>
                              <span>${addon.price.toLocaleString()} USDC</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Discount Code Input */}
                <DiscountCodeInput
                  onDiscountApplied={handleDiscountApplied}
                  onDiscountRemoved={handleDiscountRemoved}
                  originalAmount={formData.totalAmount}
                  baseAmount={discountedBaseFee}
                  addonAmount={formData.totalAmount - discountedBaseFee}
                  applicableTo="listing"
                  currentUser={currentUser}
                />

                {/* Add-on Package Disclaimer */}
                {formData.selectedAddons.length > 0 && (
                  <div className="p-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 border-2 border-red-500/50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="bg-red-500 p-2 rounded-full flex-shrink-0">
                        <FaLightbulb className="text-white text-sm" />
                      </div>
                      <div>
                        <h4 className="font-bold text-red-400 mb-2">Important Content Guidelines</h4>
                        <p className="text-red-200 text-sm leading-relaxed">
                          I confirm the content I will be submitting for PR does not promote casinos, scams, or HYIP, and does not promise returns on investment. Please note that failure to comply will result in failure to process any refunds.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Instructions */}
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Pay with Crypto via AquaPay</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Click "Pay with Crypto" below to open the AquaPay payment page. The amount will be pre-filled for your convenience.
                  </p>
                  <p className="text-gray-400 text-xs">
                    After payment is completed, an admin will verify and approve your listing.
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  {/* Payment Method Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center text-sm sm:text-base"
                    >
                      {isSubmitting ? (
                        <>
                          <FaSpinner className="animate-spin mr-1.5 sm:mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <span className="mr-1.5 sm:mr-2">🔗</span>
                          Pay with Crypto
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handlePayPalPurchase}
                      disabled={isSubmitting}
                      className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center text-sm sm:text-base"
                    >
                      <span className="mr-1.5 sm:mr-2">💳</span>
                      Pay with Card
                    </button>
                  </div>

                  <p className="text-gray-400 text-xs sm:text-sm text-center">
                    * Your payment will be manually verified by an admin
                  </p>

                  {/* Navigation */}
                  <div className="flex justify-start pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex items-center px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-lg"
                    >
                      <FaArrowLeft className="mr-2" /> Back to Packages
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CreateAdModal; 