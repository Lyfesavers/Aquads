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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Service Improvement Report
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Detailed analysis and recommendations to improve your service reliability score
            </p>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4">
            <RiskGaugeImprovement
              seller={seller}
              service={service}
              completionRate={completionRate}
              currentUser={currentUser}
              showForOwner={true}
            />
          </div>
          
          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-lg">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                This report updates in real-time as you make improvements to your service.
              </p>
              <button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
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
