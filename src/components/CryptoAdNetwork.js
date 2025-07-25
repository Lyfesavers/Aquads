import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import MintFunnelInstructionModal from './MintFunnelInstructionModal';

const CryptoAdNetwork = () => {
  const [showInstructionModal, setShowInstructionModal] = useState(false);

  useEffect(() => {
    // Add class to body for page-specific styling if needed
    document.body.classList.add('crypto-ad-network-page');
    
    // Check if user has seen the MintFunnel instruction before
    const hasSeenMintFunnelInstruction = localStorage.getItem('hasSeenMintFunnelInstruction');
    
    // Show instruction modal for first-time visitors
    if (!hasSeenMintFunnelInstruction) {
      setShowInstructionModal(true);
    }
    
    // Cleanup
    return () => {
      document.body.classList.remove('crypto-ad-network-page');
    };
  }, []);

  const handleCloseInstructionModal = () => {
    setShowInstructionModal(false);
    // Mark that user has seen the instruction
    localStorage.setItem('hasSeenMintFunnelInstruction', 'true');
  };

  return (
    <div className="h-screen overflow-y-auto text-white">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
        <div className="tech-lines"></div>
        <div className="tech-dots"></div>
      </div>

      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img 
                  src="/Aquadsnewlogo.svg" 
                  alt="AQUADS" 
                  className="w-auto filter drop-shadow-lg"
                  style={{height: '4.5rem', filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.8))'}}
                />
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center bg-blue-500/80 hover:bg-blue-600/80 px-4 py-2 rounded shadow-lg hover:shadow-blue-500/50 transition-all duration-300 backdrop-blur-sm"
              >
                <FaArrowLeft className="mr-2" />
                Back to Main
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Embedded Content - Full Screen */}
      <div className="fixed inset-0 top-16 z-20">
        <iframe
          src="https://mintfunnel.co/crypto-ad-network/?ref=Aquads"
          className="w-full h-full border-0"
          title="Crypto Ad Network"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          loading="lazy"
        />
      </div>

      {/* Instruction Modal for first-time visitors */}
      {showInstructionModal && (
        <MintFunnelInstructionModal
          onClose={handleCloseInstructionModal}
        />
      )}
    </div>
  );
};

export default CryptoAdNetwork; 