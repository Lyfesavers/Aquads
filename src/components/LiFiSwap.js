import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import logger from '../utils/logger';
import './Swap.css';

// Constants for Li.Fi integration
const FEE_PERCENTAGE = 0.025; // 2.5% fee
const ETH_FEE_WALLET = process.env.REACT_APP_FEE_WALLET; // Ethereum wallet address
const SOLANA_FEE_WALLET = process.env.REACT_APP_SOLANA_FEE_WALLET; // Solana wallet address
const SUI_FEE_WALLET = process.env.REACT_APP_SUI_FEE_WALLET; // SUI wallet address

const LiFiSwap = ({ currentUser, showNotification }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  // Initialize on component mount
  useEffect(() => {
    // Load widget after a short delay
    setTimeout(() => {
      setLoading(false);
    }, 100);
  }, []);

  // Li.Fi widget integration
  const renderLiFiWidget = () => {
    // Li.Fi widget URL with complete AquaSwap branding and Li.Fi branding hidden
    const lifiUrl = `https://widget.li.fi/?integrator=aquaswap&fee=${FEE_PERCENTAGE}&toAddress=${ETH_FEE_WALLET}&solanaToAddress=${SOLANA_FEE_WALLET}&suiToAddress=${SUI_FEE_WALLET}&theme=dark&variant=drawer&containerStyle=min-height:700px;&logoUrl=${encodeURIComponent(window.location.origin + '/AquaSwap.svg')}&primaryColor=%234285F4&hidePoweredBy=true&hideTooltips=true&hideHeader=true&hideLogo=true&appTitle=AquaSwap&appearanceScheme=dark&brandColor=%234285F4&fontFamily=inherit&hideFooter=true`;

    return (
      <div className="iframe-container">
        <iframe
          ref={iframeRef}
          src={lifiUrl}
          className="lifi-iframe"
          title="Li.Fi Swap Widget"
          allow="clipboard-read; clipboard-write"
          onLoad={() => {
            try {
              // Get access to the iframe's content window
              const iframe = iframeRef.current;
              if (!iframe || !iframe.contentWindow) return;
              
              // Create a MutationObserver to watch for unwanted elements
              const observer = new MutationObserver(() => {
                const doc = iframe.contentDocument;
                if (!doc) return;
                
                // Remove any unwanted elements (duck hunt buttons, Li.Fi branding, etc.)
                const unwantedElements = [
                  // Duck hunt buttons
                  ...doc.querySelectorAll('[data-testid="duck-hunt-button"]'),
                  ...doc.querySelectorAll('[id*="duck-hunt"]'),
                  ...doc.querySelectorAll('[id*="start-duck"]'),
                  ...doc.querySelectorAll('[class*="duck-hunt"]'),
                  ...doc.querySelectorAll('.start-duck-hunt'),
                  ...doc.querySelectorAll('#start-duck-hunt'),
                  ...doc.querySelectorAll('#duck-hunt-button'),
                  ...doc.querySelectorAll('.duck-hunt-button'),
                  ...doc.querySelectorAll('div[style*="position: fixed"][style*="bottom"][style*="right"]'),
                  
                  // Li.Fi branding elements
                  ...doc.querySelectorAll('[alt*="Li.Fi"]'),
                  ...doc.querySelectorAll('[title*="Li.Fi"]'),
                  ...doc.querySelectorAll('img[src*="lifi"]'),
                  ...doc.querySelectorAll('img[src*="Li.Fi"]'),
                  ...doc.querySelectorAll('a[href*="li.fi"]'),
                  ...doc.querySelectorAll('a[href*="lifi"]'),
                  ...doc.querySelectorAll('[class*="lifi"]'),
                  ...doc.querySelectorAll('[class*="Li.Fi"]'),
                  ...doc.querySelectorAll('div:contains("Li.Fi")'),
                  ...doc.querySelectorAll('span:contains("Li.Fi")'),
                  ...doc.querySelectorAll('div:contains("Powered by")'),
                  ...doc.querySelectorAll('footer'),
                  ...doc.querySelectorAll('[data-testid*="footer"]'),
                  ...doc.querySelectorAll('[data-testid*="powered"]'),
                  ...doc.querySelectorAll('[data-testid*="branding"]')
                ];
                
                // Remove all identified elements
                unwantedElements.forEach(el => {
                  if (el && el.remove) {
                    el.remove();
                  }
                });
                
                // Also hide any text nodes containing "Li.Fi"
                const walker = doc.createTreeWalker(
                  doc.body,
                  NodeFilter.SHOW_TEXT,
                  null,
                  false
                );
                
                const textNodesToHide = [];
                let node;
                while (node = walker.nextNode()) {
                  if (node.textContent && (
                    node.textContent.includes('Li.Fi') || 
                    node.textContent.includes('LiFi') ||
                    node.textContent.includes('Powered by') ||
                    node.textContent.includes('li.fi')
                  )) {
                    textNodesToHide.push(node.parentElement);
                  }
                }
                
                textNodesToHide.forEach(el => {
                  if (el && el.style) {
                    el.style.display = 'none';
                  }
                });
              });

              // Start observing
              if (iframe.contentDocument) {
                observer.observe(iframe.contentDocument.body, { 
                  childList: true, 
                  subtree: true
                });
                
                // Inject CSS to hide any remaining Li.Fi branding
                const style = iframe.contentDocument.createElement('style');
                style.textContent = `
                  /* Hide Li.Fi branding */
                  [alt*="Li.Fi"], [title*="Li.Fi"], 
                  img[src*="lifi"], img[src*="Li.Fi"],
                  a[href*="li.fi"], a[href*="lifi"],
                  [class*="lifi"], [class*="Li.Fi"],
                  footer, [data-testid*="footer"],
                  [data-testid*="powered"], [data-testid*="branding"] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    height: 0 !important;
                    width: 0 !important;
                    overflow: hidden !important;
                  }
                  
                  /* Hide any text containing Li.Fi */
                  *:contains("Li.Fi"), *:contains("LiFi"), 
                  *:contains("Powered by"), *:contains("li.fi") {
                    display: none !important;
                  }
                  
                  /* Ensure AquaSwap branding is prominent */
                  [alt*="AquaSwap"], [title*="AquaSwap"] {
                    display: block !important;
                    visibility: visible !important;
                  }
                `;
                iframe.contentDocument.head.appendChild(style);
              }
            } catch (error) {
              // Silent catch - cross-origin restrictions may prevent this
              logger.debug('Could not access iframe content:', error);
            }
          }}
        />
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen overflow-y-auto text-white">
        {/* Fixed Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
          <div className="tech-lines"></div>
          <div className="tech-dots"></div>
        </div>

        {/* Fixed Navigation */}
        <nav className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">
                  AQUADS
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link 
                  to="/" 
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="relative z-10">
          <div className="swap-container">
            <div className="swap-card">
              <div className="swap-header">
                <h2>
                  <img 
                    src="/AquaSwap.svg" 
                    alt="AquaSwap" 
                    className="aquaswap-logo" 
                    width="24" 
                    height="24"
                  />
                  AquaSwap Li.Fi
                </h2>
              </div>
              <div className="swap-body">
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading Li.Fi swap interface...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Li.Fi swap interface
  return (
    <div className="h-screen overflow-y-auto text-white">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
        <div className="tech-lines"></div>
        <div className="tech-dots"></div>
      </div>

      {/* Fixed Navigation */}
      <nav className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">
                AQUADS
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10">
        <div className="swap-container">
          <div className="swap-card lifi-container">
            <div className="swap-header">
              <h2>
                <img 
                  src="/AquaSwap.svg" 
                  alt="AquaSwap" 
                  className="aquaswap-logo" 
                  width="24" 
                  height="24"
                />
                AquaSwap Li.Fi
              </h2>
            </div>
          
            {renderLiFiWidget()}
            
            <div className="powered-by">
              <div className="fee-disclaimer">
                Cross-chain swaps powered by AquaSwap
              </div>
              <a 
                href="https://aquads.xyz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Learn more about AquaSwap
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

LiFiSwap.propTypes = {
  currentUser: PropTypes.object,
  showNotification: PropTypes.func.isRequired
};

export default LiFiSwap; 