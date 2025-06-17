import React, { useState } from 'react';
import Modal from './Modal';
import { FaCopy, FaCheck, FaArrowLeft, FaArrowRight, FaBullhorn, FaUsers, FaTwitter, FaChartLine, FaGift, FaRocket, FaNewspaper, FaCrown, FaStar, FaFire, FaGem, FaLightbulb, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const BLOCKCHAIN_OPTIONS = [
  {
    name: 'Solana',
    symbol: 'SOL',
    address: 'F4HuQfUx5zsuQpxca4KQfX6uZPYtRp3Y7HYVGsuHdYVf',
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

// Aquads-branded marketing add-on packages
const ADDON_PACKAGES = [
  {
    id: 'aqua_ripple',
    name: 'AquaRipple',
    price: 299,
    icon: FaStar,
    color: 'from-blue-500 to-cyan-500',
    features: [
      '4+ Media Pickups Guaranteed',
      'Estimated Reach: 5k-15k',
      '<24 Hour Distribution',
    ]
  },
  {
    id: 'aqua_wave',
    name: 'AquaWave',
    price: 1399,
    icon: FaRocket,
    color: 'from-green-500 to-teal-500',
    features: [
      '9+ Media Pickups Guaranteed',
      'Estimated Reach: 75k-250k',
      '24-72 Hour Distribution'    ]
  },
  {
    id: 'aqua_flow',
    name: 'AquaFlow',
    price: 2899,
    icon: FaChartLine,
    color: 'from-purple-500 to-indigo-500',
    features: [
      'CoinMarketCap (Community Section)',
      'CryptoPolitan',
      'CoinCodex',
      'BraveNewCoin',
      'Bitcolumnist',
      '24-72 Hour Distribution',
      'SEO Optimizations'
    ]
  },
  {
    id: 'aqua_storm',
    name: 'AquaStorm',
    price: 6499,
    icon: FaFire,
    color: 'from-orange-500 to-red-500',
    features: [
      'Everything from AquaWave, plus:',
      '75+ Media Pickups Guaranteed',
      'Site Audience of 75M+',
      'Guaranteed coverage from Yahoo Finance and MarketWatch',
      'Requirements: 500-word maximum'
    ]
  },
  {
    id: 'aqua_tidal',
    name: 'AquaTidal',
    price: 12999,
    icon: FaGem,
    color: 'from-indigo-500 to-purple-500',
    features: [
      'Everything from AquaStorm plus:',
      '125+ Media Pickups Guaranteed',
      'Site Audience of 300M+',
      'Coverage from: Cointelegraph',
      'CoinMarketCap (Community Section)',
      'Requirements: 500-word maximum'
    ]
  },
  {
    id: 'aqua_legend',
    name: 'AquaLegend',
    price: 21999,
    icon: FaCrown,
    color: 'from-pink-500 to-rose-500',
    features: [
      'Coverage from top crypto publications:',
      'Cointelegraph • CoinMarketCap',
      'Bitcoin.com • AMB Crypto',
      'Coinspeaker • Coincodex',
      'Cryptopolitan • Bitcolumnist',
      'CoinGape • CryptoNews',
      'Yahoo Finance',
      '6-72 Hour Distribution',
      'Requirements: 500-word maximum'
    ]
  }
];

const CreateAdModal = ({ onCreateAd, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    logo: '',
    url: '',
    pairAddress: '',
    blockchain: 'ethereum',
    txSignature: '',
    paymentChain: BLOCKCHAIN_OPTIONS[0].name,
    chainSymbol: BLOCKCHAIN_OPTIONS[0].symbol,
    chainAddress: BLOCKCHAIN_OPTIONS[0].address,
    selectedAddons: [], // Track selected add-on packages
    totalAmount: 299 // Base listing fee
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [selectedChain, setSelectedChain] = useState(BLOCKCHAIN_OPTIONS[0]);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [expandedPackages, setExpandedPackages] = useState(new Set()); // Track expanded packages

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

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(selectedChain.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
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

    // Move to payment step
    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 1) {
      handleInfoSubmit(e);
      return;
    }
    
    if (!formData.txSignature) {
      setError('Please enter the transaction signature');
      return;
    }

    onCreateAd({
      ...formData,
      paymentChain: selectedChain.name,
      chainSymbol: selectedChain.symbol,
      chainAddress: selectedChain.address
    });
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
      
      return {
        ...prev,
        selectedAddons,
        totalAmount: 299 + addonTotal // Base fee + add-ons
      };
    });
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

  return (
    <Modal onClose={onClose} fullScreen={true}>
      <div className="text-white max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">
          {step === 1 ? 'List New Project' : 'Premium Listing Package'}
          <span className="text-lg text-gray-400 ml-3 block sm:inline">Step {step} of 2</span>
        </h2>
        
        {step === 1 ? (
          <form onSubmit={handleInfoSubmit} className="space-y-6 max-w-2xl mx-auto">
            <div>
              <label className="block mb-2 text-lg font-medium">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
            </div>
            <div>
              <label className="block mb-2 text-lg font-medium">Pair Address</label>
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
              <label className="block mb-2 text-lg font-medium">Blockchain</label>
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
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Premium Package Benefits */}
            <div className="order-2 lg:order-1 max-h-[80vh] overflow-y-auto">
              <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-500/50 rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <FaRocket className="mr-3 text-blue-400" />
                  Premium Listing Package - $299 USDC
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
                      <p className="text-gray-300 text-sm">Keep your project at the top of our bubble display for maximum visibility</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-blue-500 p-2 rounded-full">
                      <FaBullhorn className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">PR Press Release Publication</h4>
                      <p className="text-gray-300 text-sm">Professional press release published on Aquads and our partner publications, with access to 20+ premium newsroom platforms available for upgrade</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-indigo-500 p-2 rounded-full">
                      <FaNewspaper className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Premium Platform Access</h4>
                      <p className="text-gray-300 text-sm">Access to premium distribution channels including CoinDesk, CoinMarketCap and other tier-1 platforms (additional premium services available)</p>
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
                  
                  <div className="flex items-start space-x-4 p-4 bg-gray-800/50 rounded-lg">
                    <div className="bg-orange-500 p-2 rounded-full">
                      <FaChartLine className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Paid Ad Campaign Exposure</h4>
                      <p className="text-gray-300 text-sm">Featured placement in our targeted advertising campaigns across multiple channels</p>
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

              {/* Marketing Add-on Packages */}
              <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border border-gray-600/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <FaGift className="mr-3 text-purple-400" />
                  Marketing Add-on Packages
                </h3>
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
                                  <span className="ml-2 text-sm font-bold text-green-400">
                                    ${addon.price.toLocaleString()} USDC
                                  </span>
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
            </div>

            {/* Payment Form */}
            <div className="order-1 lg:order-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Total Amount Display */}
                <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Total Amount:</span>
                    <span className="text-2xl font-bold text-green-400">
                      ${formData.totalAmount.toLocaleString()} USDC
                    </span>
                  </div>
                  {formData.selectedAddons.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-600">
                      <div className="text-sm text-gray-300">
                        <div className="flex justify-between">
                          <span>Base Listing:</span>
                          <span>$299 USDC</span>
                        </div>
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

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Select Payment Network</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {BLOCKCHAIN_OPTIONS.map((chain) => (
                      <button
                        key={chain.symbol}
                        type="button"
                        onClick={() => setSelectedChain(chain)}
                        className={`p-4 rounded-lg border transition-all ${
                          selectedChain === chain
                            ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                            : 'border-gray-600 hover:border-blue-400 hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{chain.name}</span>
                          <span className="text-sm text-gray-300">${formData.totalAmount} {chain.amount}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Payment Address</h3>
                  <div className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg">
                    <input
                      type="text"
                      value={selectedChain.address}
                      readOnly
                      className="bg-transparent flex-1 outline-none text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="text-blue-400 hover:text-blue-300 p-2 rounded"
                    >
                      {copiedAddress ? <FaCheck /> : <FaCopy />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-medium text-gray-300 mb-2">
                    Transaction Signature
                  </label>
                  <input
                    type="text"
                    name="txSignature"
                    value={formData.txSignature}
                    onChange={handleChange}
                    placeholder="Enter transaction signature after payment"
                    className="w-full p-4 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    required
                  />
                  {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-lg"
                  >
                    <FaArrowLeft className="mr-2" /> Back
                  </button>
                  <button
                    type="submit"
                    className="flex items-center px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-lg"
                  >
                    Submit Payment
                  </button>
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