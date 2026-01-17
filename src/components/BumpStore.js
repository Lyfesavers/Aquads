import React, { useState } from 'react';
import Modal from './Modal';
import { FaRocket, FaChartLine, FaEye, FaTrophy, FaStar, FaFire, FaCrown, FaBolt, FaTimes } from 'react-icons/fa';
import logger from '../utils/logger';
import DiscountCodeInput from './DiscountCodeInput';
import { createBumpRequest } from '../services/api';

const BUMP_OPTIONS = [
  { duration: 'Lifetime', price: 150, durationMs: -1 }
];

const BumpStore = ({ ad, onClose, onSubmitPayment, currentUser }) => {
  const [selectedOption, setSelectedOption] = useState(BUMP_OPTIONS[0]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDiscountApplied = (discountData) => {
    setAppliedDiscount(discountData);
  };

  const handleDiscountRemoved = () => {
    setAppliedDiscount(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!ad?.id) {
      alert('Invalid ad data');
      return;
    }

    if (!currentUser) {
      alert('Please log in first!');
      return;
    }

    try {
      setSubmitting(true);
      
      // Calculate final amount with discount
      const finalAmount = appliedDiscount 
        ? (selectedOption.price - appliedDiscount.finalDiscount) 
        : selectedOption.price;
      
      // Create bump request first with pending status and AquaPay placeholder
      const newBumpRequest = await createBumpRequest({
        adId: ad.id,
        owner: currentUser.username,
        txSignature: 'aquapay-pending', // Placeholder - will be updated on payment
        duration: selectedOption.durationMs,
        discountCode: appliedDiscount ? appliedDiscount.discountCode.code : null
      });
      
      // Open AquaPay link with bump ID and amount
      const aquaPayUrl = `https://aquads.xyz/pay/aquads?amount=${finalAmount}&bumpId=${newBumpRequest._id}`;
      const newWindow = window.open(aquaPayUrl, '_blank'); // Store reference to the new window
      
      // Store the newWindow reference to close it later
      window.aquaPayPopup = newWindow;

      alert(`Bump request created! Please complete the payment of $${finalAmount} USDC on the AquaPay page. Your bump will be automatically approved once payment is confirmed.`);
      onClose();
    } catch (error) {
      console.error('Error creating bump request:', error);
      alert(error.message || 'Failed to create bump request');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayPalPurchase = async () => {
    if (!ad?.id) {
      alert('Invalid ad data');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Open PayPal payment link
      window.open('https://www.paypal.com/ncp/payment/7RNMKRG49E7QS', '_blank');
      
      // Submit bump request for admin approval with PayPal method
      await onSubmitPayment(
        ad.id, 
        'paypal', // Identifier to show it was a PayPal payment
        selectedOption.durationMs, 
        appliedDiscount ? appliedDiscount.discountCode.code : null
      );
      
      // Parent component (handleBumpPurchase) handles showing notification and closing modal
      // But we can also close explicitly here for immediate feedback
      onClose();
    } catch (error) {
      logger.error('Error processing PayPal bump purchase:', error);
      alert(error.message || 'Failed to process bump purchase');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 z-[999999] overflow-y-auto">
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full p-3 transition-all duration-300 hover:scale-110 shadow-lg"
      >
        <FaTimes className="text-xl" />
      </button>

      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* LEFT SIDE - Benefits & Features */}
        <div className="lg:w-1/2 p-6 sm:p-8 lg:p-12 flex flex-col justify-center bg-gradient-to-br from-blue-900/50 to-purple-900/50">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8 sm:mb-12">
              <div className="flex items-center mb-4">
                <FaRocket className="text-4xl sm:text-5xl text-blue-400 mr-4" />
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                  Boost Your Project
                </h1>
              </div>
              <p className="text-lg sm:text-xl text-gray-300">
                Skyrocket your visibility with Lifetime Bump - a one-time investment for permanent priority placement
              </p>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-3 gap-4 mb-8 sm:mb-12">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 text-center border border-blue-500/30">
                <div className="text-2xl sm:text-3xl font-bold text-blue-400 mb-1">10x</div>
                <div className="text-xs sm:text-sm text-gray-300">More Visibility</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 text-center border border-purple-500/30">
                <div className="text-2xl sm:text-3xl font-bold text-purple-400 mb-1">∞</div>
                <div className="text-xs sm:text-sm text-gray-300">Lifetime Bump</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 text-center border border-green-500/30">
                <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-1">24/7</div>
                <div className="text-xs sm:text-sm text-gray-300">Priority Display</div>
              </div>
            </div>

            {/* Benefits List */}
            <div className="space-y-4 sm:space-y-6 mb-8">
              <div className="flex items-start space-x-4 bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 hover:border-blue-500/50 transition-all">
                <div className="bg-blue-500/20 p-3 rounded-lg flex-shrink-0">
                  <FaChartLine className="text-blue-400 text-xl sm:text-2xl" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base sm:text-lg mb-1">Priority Positioning</h3>
                  <p className="text-gray-400 text-sm sm:text-base">Always appear at the top of the bubble display, ensuring maximum exposure to every visitor</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 hover:border-purple-500/50 transition-all">
                <div className="bg-purple-500/20 p-3 rounded-lg flex-shrink-0">
                  <FaEye className="text-purple-400 text-xl sm:text-2xl" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base sm:text-lg mb-1">Enhanced Visibility</h3>
                  <p className="text-gray-400 text-sm sm:text-base">Stand out with premium placement that attracts more clicks, votes, and community engagement</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 hover:border-yellow-500/50 transition-all">
                <div className="bg-yellow-500/20 p-3 rounded-lg flex-shrink-0">
                  <FaTrophy className="text-yellow-400 text-xl sm:text-2xl" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base sm:text-lg mb-1">Competitive Advantage</h3>
                  <p className="text-gray-400 text-sm sm:text-base">Stay ahead of competitors with permanent top-tier placement that never expires</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 hover:border-green-500/50 transition-all">
                <div className="bg-green-500/20 p-3 rounded-lg flex-shrink-0">
                  <FaBolt className="text-green-400 text-xl sm:text-2xl" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base sm:text-lg mb-1">Instant Activation</h3>
                  <p className="text-gray-400 text-sm sm:text-base">Get bumped immediately after admin verification - no waiting, no recurring fees</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 hover:border-pink-500/50 transition-all">
                <div className="bg-pink-500/20 p-3 rounded-lg flex-shrink-0">
                  <FaStar className="text-pink-400 text-xl sm:text-2xl" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base sm:text-lg mb-1">One-Time Investment</h3>
                  <p className="text-gray-400 text-sm sm:text-base">Pay once, benefit forever - no subscription fees or recurring charges</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 hover:border-red-500/50 transition-all">
                <div className="bg-red-500/20 p-3 rounded-lg flex-shrink-0">
                  <FaFire className="text-red-400 text-xl sm:text-2xl" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base sm:text-lg mb-1">Trending Boost</h3>
                  <p className="text-gray-400 text-sm sm:text-base">Increase chances of being featured in trending sections and live streams</p>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 sm:p-6 border border-blue-500/30">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <FaCrown className="text-yellow-400 text-xl sm:text-2xl" />
                <h3 className="text-white font-semibold text-base sm:text-lg">Premium Feature</h3>
              </div>
              <p className="text-center text-gray-300 text-sm sm:text-base">
                Join successful projects that have already invested in lifetime bumps to dominate the marketplace
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Payment Form */}
        <div className="lg:w-1/2 p-6 sm:p-8 lg:p-12 flex flex-col justify-center bg-gray-900/50">
          <div className="max-w-xl mx-auto w-full">
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl border border-gray-700">
              {/* Project Info */}
              <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-gray-700">
                {ad?.logo && (
                  <img src={ad.logo} alt={ad.title} className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg border-2 border-blue-500/30" />
                )}
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">{ad?.title || 'Your Project'}</h2>
                  <p className="text-gray-400 text-sm sm:text-base">Lifetime Bump Upgrade</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-blue-500/30 text-center">
                  <div className="text-gray-400 text-sm mb-2">One-Time Payment</div>
                  <div className="text-5xl font-bold text-white mb-2">
                    ${appliedDiscount ? (selectedOption.price - appliedDiscount.finalDiscount).toFixed(0) : selectedOption.price}
                    <span className="text-2xl text-gray-400"> USDC</span>
                  </div>
                  {appliedDiscount && (
                    <div className="text-green-400 text-sm">
                      <span className="line-through text-gray-500">${selectedOption.price}</span> - Save ${appliedDiscount.finalDiscount}!
                    </div>
                  )}
                  <div className="text-blue-400 text-sm mt-2 font-semibold">✓ Lifetime Access - No Recurring Fees</div>
                </div>
              </div>

              {/* Discount Code Input */}
              <DiscountCodeInput
                onDiscountApplied={handleDiscountApplied}
                onDiscountRemoved={handleDiscountRemoved}
                originalAmount={selectedOption.price}
                baseAmount={selectedOption.price}
                addonAmount={0}
                applicableTo="bump"
                className="mb-6"
                currentUser={currentUser}
              />

              {/* Payment Instructions */}
              <div className="mb-6">
                <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                  <p className="text-gray-300 text-xs sm:text-sm text-center mb-3">
                    <span className="font-semibold text-blue-400">Pay with Crypto</span> - Click the button below to complete payment via AquaPay
                  </p>
                  <p className="text-gray-400 text-xs text-center">
                    Your bump will be automatically approved once payment is confirmed
                  </p>
                </div>
              </div>

              {/* Payment Method Buttons */}
              <form onSubmit={handleSubmit} className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center text-sm sm:text-base"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <span className="mr-2 text-lg">🔗</span>
                        Pay with Crypto
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handlePayPalPurchase}
                    disabled={submitting}
                    className="px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center text-sm sm:text-base"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <span className="mr-2 text-lg">💳</span>
                        Pay with Card
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Footer Note */}
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                <p className="text-gray-300 text-xs sm:text-sm text-center">
                  <span className="font-semibold text-blue-400">Secure Payment</span> - Crypto payments are automatically verified and approved
                </p>
              </div>
            </div>

            {/* Money Back Guarantee */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                <span className="text-green-400 font-semibold">✓</span> Instant activation after payment confirmation
              </p>
              <p className="text-gray-400 text-sm mt-1">
                <span className="text-green-400 font-semibold">✓</span> 24/7 customer support
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BumpStore; 