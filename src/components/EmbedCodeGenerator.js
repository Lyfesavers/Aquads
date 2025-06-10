import React, { useState, useRef } from 'react';
import './EmbedCodeGenerator.css';

const EmbedCodeGenerator = () => {
  const [embedSize, setEmbedSize] = useState('medium');
  const [showCopied, setShowCopied] = useState(false);
  const [customWidth, setCustomWidth] = useState('400');
  const [customHeight, setCustomHeight] = useState('600');
  const textareaRef = useRef(null);

  // Predefined sizes
  const embedSizes = {
    small: { width: '350', height: '500' },
    medium: { width: '400', height: '600' },
    large: { width: '500', height: '700' },
    full: { width: '100%', height: '600' },
    custom: { width: customWidth, height: customHeight }
  };

  // Get current dimensions based on selected size
  const currentSize = embedSizes[embedSize];
  const width = embedSize === 'custom' ? customWidth : currentSize.width;
  const height = embedSize === 'custom' ? customHeight : currentSize.height;

  // Generate embed code
  const generateEmbedCode = () => {
    const embedUrl = `${window.location.origin}/embed/aquaswap`;
    
    return `<!-- AquaSwap Embed Code -->
<iframe 
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  style="border-radius: 12px; border: none; box-shadow: 0 4px 20px rgba(0, 212, 255, 0.1);"
  allow="clipboard-write; payment; web3; crypto"
  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation"
  loading="lazy"
  title="AquaSwap - Cross-Chain DEX">
</iframe>

<!-- Optional: Add responsive styling -->
<style>
  @media (max-width: 768px) {
    iframe[title="AquaSwap - Cross-Chain DEX"] {
      width: 100% !important;
      min-width: 300px;
      height: ${height}px;
    }
  }
</style>`;
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      const embedCode = generateEmbedCode();
      await navigator.clipboard.writeText(embedCode);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    }
  };

  // Download as HTML file
  const downloadAsHTML = () => {
    const embedCode = generateEmbedCode();
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AquaSwap Embed Example</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .embed-container {
            display: flex;
            justify-content: center;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>AquaSwap Embedded Widget</h1>
        <div class="embed-container">
            ${embedCode}
        </div>
        <p style="text-align: center; color: #666; margin-top: 20px;">
            This is an example of how AquaSwap can be embedded into your website.
        </p>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aquaswap-embed-example.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="embed-code-generator">
      <div className="embed-header">
        <h3>🔗 Embed AquaSwap</h3>
        <p>Add AquaSwap to your website with just a few lines of code</p>
      </div>

      {/* Size Options */}
      <div className="embed-options">
        <div className="size-selector">
          <label className="option-label">Widget Size:</label>
          <div className="size-buttons">
            {Object.entries({
              small: 'Small (350×500)',
              medium: 'Medium (400×600)',
              large: 'Large (500×700)',
              full: 'Full Width',
              custom: 'Custom'
            }).map(([key, label]) => (
              <button
                key={key}
                className={`size-btn ${embedSize === key ? 'active' : ''}`}
                onClick={() => setEmbedSize(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom size inputs */}
        {embedSize === 'custom' && (
          <div className="custom-size-inputs">
            <div className="input-group">
              <label>Width:</label>
              <input
                type="text"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                placeholder="400"
                className="size-input"
              />
              <span>px</span>
            </div>
            <div className="input-group">
              <label>Height:</label>
              <input
                type="text"
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                placeholder="600"
                className="size-input"
              />
              <span>px</span>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="embed-preview">
        <h4>Preview:</h4>
        <div className="preview-container" style={{ width: width === '100%' ? '100%' : `${width}px` }}>
          <iframe
            src={`${window.location.origin}/embed/aquaswap`}
            width={width}
            height={height}
            frameBorder="0"
            style={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 20px rgba(0, 212, 255, 0.1)',
            }}
            allow="clipboard-write; payment; web3; crypto"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation"
            loading="lazy"
            title="AquaSwap - Cross-Chain DEX Preview"
          />
        </div>
      </div>

      {/* Generated Code */}
      <div className="embed-code">
        <div className="code-header">
          <h4>Embed Code:</h4>
          <div className="code-actions">
            <button onClick={copyToClipboard} className="copy-btn">
              {showCopied ? '✅ Copied!' : '📋 Copy Code'}
            </button>
            <button onClick={downloadAsHTML} className="download-btn">
              💾 Download Example
            </button>
          </div>
        </div>
        
        <textarea
          ref={textareaRef}
          value={generateEmbedCode()}
          readOnly
          className="code-textarea"
          rows="12"
        />
      </div>

      {/* Integration Instructions */}
      <div className="embed-instructions">
        <h4>🚀 Integration Instructions:</h4>
        <ol>
          <li><strong>Copy the code above</strong> and paste it into your website's HTML</li>
          <li><strong>Customize the size</strong> using the options above to fit your layout</li>
          <li><strong>Add to any page</strong> - works with WordPress, Squarespace, Wix, and custom sites</li>
          <li><strong>Mobile responsive</strong> - automatically adapts to different screen sizes</li>
        </ol>
        
        <div className="embed-tips">
          <h5>💡 Pro Tips:</h5>
          <ul>
            <li>Use the "Full Width" option for responsive designs</li>
            <li>Minimum recommended height is 500px for full functionality</li>
            <li>The widget works on HTTP and HTTPS sites</li>
            <li>No registration required - embed instantly</li>
          </ul>
        </div>
      </div>

      {/* Features */}
      <div className="embed-features">
        <h4>✨ What's Included:</h4>
        <div className="features-grid">
          <div className="feature-item">
            <span className="feature-icon">🔄</span>
            <span>Cross-chain swaps across 38+ blockchains</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💰</span>
            <span>Best rates from 20+ DEXs and bridges</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔐</span>
            <span>Non-custodial - you control your funds</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📱</span>
            <span>Mobile-friendly interface</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <span>Fast execution and low fees</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎨</span>
            <span>Matches your dark/light theme</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmbedCodeGenerator; 