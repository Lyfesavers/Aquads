import React from 'react';
import RiskGaugeImprovement from './RiskGaugeImprovement';

const RiskImprovementModal = ({ 
  isOpen, 
  onClose, 
  seller, 
  service, 
  completionRate,
  currentUser 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
        onClick={onClose}
      />
      
      {/* Full Screen Modal */}
      <div className="relative w-full h-full flex flex-col">
        <div 
          className="relative bg-white w-full h-full flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 truncate">
                  Service Improvement Report
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">
                  Detailed analysis and recommendations to improve your service reliability score
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
            <div className="max-w-4xl mx-auto">
              <RiskGaugeImprovement
                seller={seller}
                service={service}
                completionRate={completionRate}
                currentUser={currentUser}
                showForOwner={true}
              />
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex-shrink-0 bg-gray-50 px-4 sm:px-6 lg:px-8 py-4 border-t border-gray-200">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <p className="text-xs sm:text-sm text-gray-500">
                This report updates in real-time as you make improvements to your service.
              </p>
              <button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium self-start sm:self-auto"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskImprovementModal;
