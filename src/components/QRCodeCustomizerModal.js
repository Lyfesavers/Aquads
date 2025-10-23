import React, { useState, useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { FaTimes, FaMale, FaFemale, FaDownload } from 'react-icons/fa';

const QRCodeCustomizerModal = ({ isOpen, onClose, referralUrl, username }) => {
  const [gender, setGender] = useState('male');
  const [selectedColor, setSelectedColor] = useState('#00ffff');
  const [qrCode, setQrCode] = useState(null);
  const qrRef = useRef(null);

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
      try {
        // Create QR code instance
        const qrCodeInstance = new QRCodeStyling({
          width: 400,
          height: 400,
          data: referralUrl,
          margin: 10,
          qrOptions: {
            typeNumber: 0,
            mode: 'Byte',
            errorCorrectionLevel: 'H' // High error correction for logo overlay
          },
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.4,
            margin: 8,
            crossOrigin: 'anonymous'
          },
          dotsOptions: {
            color: selectedColor,
            type: 'rounded' // Pixelated/retro look
          },
          backgroundOptions: {
            color: '#0a0a0a' // Dark cyberpunk background
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

        // Load the character image based on gender selection
        const characterImage = gender === 'male' ? '/cyber-male.svg' : '/cyber-female.svg';
        
        // Fetch SVG and inject the selected color
        const response = await fetch(characterImage);
        let svgText = await response.text();
        
        // Replace the default color in SVG with selected color
        const defaultColor = gender === 'male' ? '#00ffff' : '#ff00ff';
        svgText = svgText.replace(new RegExp(defaultColor, 'g'), selectedColor);
        
        // Convert SVG to data URL
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        // Create temporary image to convert SVG to PNG for better compatibility
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = svgUrl;
        });
        
        // Create canvas to convert SVG to PNG
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 200, 200);
        
        const pngUrl = canvas.toDataURL('image/png');
        
        // Update QR code with character image
        qrCodeInstance.update({
          image: pngUrl
        });

        setQrCode(qrCodeInstance);

        // Append to DOM
        if (qrRef.current) {
          qrRef.current.innerHTML = '';
          qrCodeInstance.append(qrRef.current);
        }

        // Cleanup
        URL.revokeObjectURL(svgUrl);
      } catch (error) {
        console.error('Error generating styled QR code:', error);
      }
    };

    generateStyledQRCode();
  }, [isOpen, referralUrl, gender, selectedColor]);

  const handleDownload = () => {
    if (qrCode) {
      const fileName = `aquads-referral-${username || 'user'}-${gender}-qr.png`;
      qrCode.download({
        name: fileName,
        extension: 'png'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border border-purple-500/30 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 p-6 border-b border-purple-500/30">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                Customize Your QR Code
              </h3>
              <p className="text-gray-400 text-sm">
                Create your unique cyberpunk character QR code
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              title="Close"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Gender Selection */}
          <div>
            <label className="block text-white font-medium mb-3 text-sm uppercase tracking-wide">
              Character Gender
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setGender('male')}
                className={`flex-1 py-4 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-3 ${
                  gender === 'male'
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-2 border-cyan-400 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-gray-800/50 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <FaMale className="text-2xl" />
                <span>Male</span>
              </button>
              <button
                onClick={() => setGender('female')}
                className={`flex-1 py-4 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-3 ${
                  gender === 'female'
                    ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 border-2 border-pink-400 text-white shadow-lg shadow-pink-500/50'
                    : 'bg-gray-800/50 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <FaFemale className="text-2xl" />
                <span>Female</span>
              </button>
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-white font-medium mb-3 text-sm uppercase tracking-wide">
              Accent Color
            </label>
            <div className="grid grid-cols-3 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center gap-3 ${
                    selectedColor === color.value
                      ? 'bg-gray-700/50 border-2 text-white shadow-lg'
                      : 'bg-gray-800/50 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                  style={{
                    borderColor: selectedColor === color.value ? color.value : undefined,
                    boxShadow: selectedColor === color.value ? `0 0 20px ${color.value}40` : undefined
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full border-2 border-gray-900"
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-sm">{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <label className="block text-white font-medium mb-4 text-sm uppercase tracking-wide text-center">
              Preview
            </label>
            <div className="flex justify-center">
              <div 
                ref={qrRef} 
                className="bg-white p-4 rounded-xl shadow-2xl"
                style={{
                  boxShadow: `0 0 30px ${selectedColor}40`
                }}
              />
            </div>
            <p className="text-gray-400 text-xs text-center mt-4">
              Your personalized cyberpunk QR code - Perfect as a profile picture!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
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
    </div>
  );
};

export default QRCodeCustomizerModal;

