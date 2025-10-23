import React, { useState, useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { FaTimes, FaMale, FaFemale, FaDownload } from 'react-icons/fa';

const QRCodeCustomizerModal = ({ isOpen, onClose, referralUrl, username }) => {
  const [gender, setGender] = useState('male');
  const [selectedColor, setSelectedColor] = useState('#00ffff');
  const [isGenerating, setIsGenerating] = useState(false);
  const qrRef = useRef(null);
  const qrCodeInstance = useRef(null);

  // Cyberpunk color options
  const colorOptions = [
    { name: 'Cyan', value: '#00ffff', label: 'Neon Cyan' },
    { name: 'Magenta', value: '#ff00ff', label: 'Neon Pink' },
    { name: 'Green', value: '#00ff41', label: 'Matrix Green' },
    { name: 'Purple', value: '#9d00ff', label: 'Electric Purple' },
    { name: 'Orange', value: '#ff6600', label: 'Cyber Orange' },
    { name: 'Yellow', value: '#ffff00', label: 'Neon Yellow' }
  ];

  // Generate QR code whenever settings change
  useEffect(() => {
    if (!isOpen || !referralUrl) return;

    const generateStyledQRCode = async () => {
      setIsGenerating(true);
      try {
        console.log('Starting QR code generation...');
        console.log('Gender:', gender, 'Color:', selectedColor);
        
        // Load the character image based on gender selection
        const characterImage = gender === 'male' ? '/cyber-male.svg' : '/cyber-female.svg';
        console.log('Loading character:', characterImage);
        
        // Fetch SVG and inject the selected color
        const response = await fetch(characterImage);
        if (!response.ok) {
          throw new Error(`Failed to load character: ${response.status}`);
        }
        let svgText = await response.text();
        console.log('SVG loaded successfully');
        
        // Replace the default color in SVG with selected color
        const defaultColor = gender === 'male' ? '#00ffff' : '#ff00ff';
        svgText = svgText.replace(new RegExp(defaultColor, 'g'), selectedColor);
        
        // Convert SVG to data URL
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        // Create temporary image to convert SVG to PNG
        const img = new Image();
        
        const imageLoadPromise = new Promise((resolve, reject) => {
          img.onload = () => {
            console.log('Character image loaded');
            resolve();
          };
          img.onerror = (e) => {
            console.error('Error loading character image:', e);
            reject(e);
          };
        });
        
        img.src = svgUrl;
        await imageLoadPromise;
        
        // Create canvas to convert SVG to PNG
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 200, 200);
        
        const pngUrl = canvas.toDataURL('image/png');
        console.log('Character converted to PNG');
        
        // Cleanup blob URL
        URL.revokeObjectURL(svgUrl);

        // Clear previous QR code
        if (qrRef.current) {
          qrRef.current.innerHTML = '';
        }

        // Create new QR code instance
        const qr = new QRCodeStyling({
          width: 300,
          height: 300,
          data: referralUrl,
          margin: 10,
          qrOptions: {
            typeNumber: 0,
            mode: 'Byte',
            errorCorrectionLevel: 'H'
          },
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.35,
            margin: 5,
            crossOrigin: 'anonymous'
          },
          dotsOptions: {
            color: selectedColor,
            type: 'rounded'
          },
          backgroundOptions: {
            color: '#ffffff'
          },
          cornersSquareOptions: {
            color: selectedColor,
            type: 'extra-rounded'
          },
          cornersDotOptions: {
            color: selectedColor,
            type: 'dot'
          },
          image: pngUrl
        });

        qrCodeInstance.current = qr;
        
        // Append to DOM
        if (qrRef.current) {
          await qr.append(qrRef.current);
          console.log('QR code appended to DOM');
        }
        
        setIsGenerating(false);
      } catch (error) {
        console.error('Error generating styled QR code:', error);
        setIsGenerating(false);
        
        // Fallback: create simple QR without character
        try {
          if (qrRef.current) {
            qrRef.current.innerHTML = '';
          }
          
          const fallbackQr = new QRCodeStyling({
            width: 300,
            height: 300,
            data: referralUrl,
            margin: 10,
            qrOptions: {
              errorCorrectionLevel: 'H'
            },
            dotsOptions: {
              color: selectedColor,
              type: 'rounded'
            },
            backgroundOptions: {
              color: '#ffffff'
            },
            cornersSquareOptions: {
              color: selectedColor,
              type: 'extra-rounded'
            },
            cornersDotOptions: {
              color: selectedColor,
              type: 'dot'
            }
          });
          
          qrCodeInstance.current = fallbackQr;
          if (qrRef.current) {
            await fallbackQr.append(qrRef.current);
          }
        } catch (fallbackError) {
          console.error('Fallback QR generation also failed:', fallbackError);
        }
      }
    };

    generateStyledQRCode();
  }, [isOpen, referralUrl, gender, selectedColor]);

  const handleDownload = () => {
    if (qrCodeInstance.current) {
      const fileName = `aquads-referral-${username || 'user'}-${gender}-qr.png`;
      qrCodeInstance.current.download({
        name: fileName,
        extension: 'png'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-2xl shadow-2xl max-w-xl w-full my-4 border border-purple-500/30 overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 p-4 border-b border-purple-500/30 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white">
                Customize Your QR Code
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                Create your unique cyberpunk character
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              title="Close"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto flex-grow">
          {/* Gender Selection */}
          <div>
            <label className="block text-white font-medium mb-2 text-xs uppercase tracking-wide">
              Character Gender
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setGender('male')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm ${
                  gender === 'male'
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-2 border-cyan-400 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-gray-800/50 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <FaMale className="text-lg" />
                <span>Male</span>
              </button>
              <button
                onClick={() => setGender('female')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm ${
                  gender === 'female'
                    ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 border-2 border-pink-400 text-white shadow-lg shadow-pink-500/50'
                    : 'bg-gray-800/50 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <FaFemale className="text-lg" />
                <span>Female</span>
              </button>
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-white font-medium mb-2 text-xs uppercase tracking-wide">
              Accent Color
            </label>
            <div className="grid grid-cols-2 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`py-2 px-3 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 text-sm ${
                    selectedColor === color.value
                      ? 'bg-gray-700/50 border-2 text-white shadow-lg'
                      : 'bg-gray-800/50 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                  style={{
                    borderColor: selectedColor === color.value ? color.value : undefined,
                    boxShadow: selectedColor === color.value ? `0 0 15px ${color.value}40` : undefined
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 border-gray-900 flex-shrink-0"
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-xs truncate">{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <label className="block text-white font-medium mb-3 text-xs uppercase tracking-wide text-center">
              Preview
            </label>
            <div className="flex justify-center items-center">
              {isGenerating ? (
                <div className="w-[300px] h-[300px] bg-white rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-2"></div>
                    <p className="text-gray-600 text-sm">Generating...</p>
                  </div>
                </div>
              ) : (
                <div 
                  ref={qrRef} 
                  className="bg-white rounded-lg shadow-2xl"
                  style={{
                    boxShadow: `0 0 25px ${selectedColor}40`
                  }}
                />
              )}
            </div>
            <p className="text-gray-400 text-xs text-center mt-3">
              Scan-ready profile picture QR code
            </p>
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-3 p-4 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              boxShadow: `0 0 20px ${selectedColor}40`
            }}
          >
            <FaDownload />
            <span>Download QR Code</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeCustomizerModal;
