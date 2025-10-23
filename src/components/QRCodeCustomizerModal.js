import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { FaTimes, FaDownload, FaMale, FaFemale } from 'react-icons/fa';

const QRCodeCustomizerModal = ({ isOpen, onClose, referralUrl, username }) => {
  const [selectedGender, setSelectedGender] = useState('male');
  const [selectedColor, setSelectedColor] = useState('purple');
  const [qrDataURL, setQrDataURL] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);

  const colorSchemes = {
    purple: {
      name: 'Cyber Purple',
      primary: '#A855F7',
      secondary: '#7C3AED',
      accent: '#C084FC',
      glow: '#DDD6FE',
      bg: '#1E1B4B'
    },
    blue: {
      name: 'Neon Blue',
      primary: '#3B82F6',
      secondary: '#1D4ED8',
      accent: '#60A5FA',
      glow: '#DBEAFE',
      bg: '#0C4A6E'
    },
    green: {
      name: 'Toxic Green',
      primary: '#10B981',
      secondary: '#059669',
      accent: '#34D399',
      glow: '#D1FAE5',
      bg: '#064E3B'
    },
    pink: {
      name: 'Hot Pink',
      primary: '#EC4899',
      secondary: '#DB2777',
      accent: '#F9A8D4',
      glow: '#FCE7F3',
      bg: '#831843'
    },
    orange: {
      name: 'Cyber Orange',
      primary: '#F59E0B',
      secondary: '#D97706',
      accent: '#FBBf24',
      glow: '#FEF3C7',
      bg: '#78350F'
    },
    cyan: {
      name: 'Electric Cyan',
      primary: '#06B6D4',
      secondary: '#0891B2',
      accent: '#22D3EE',
      glow: '#CFFAFE',
      bg: '#164E63'
    }
  };

  // Pixel art character templates
  const drawPixelCharacter = (ctx, qrCanvas, gender, colors) => {
    const canvas = ctx.canvas;
    const size = 400; // Canvas size
    const pixelSize = 8; // Size of each pixel block
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background with gradient
    const bgGradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size);
    bgGradient.addColorStop(0, colors.bg);
    bgGradient.addColorStop(1, '#000000');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, size, size);
    
    // Calculate QR code position (center)
    const qrSize = 180;
    const qrX = (size - qrSize) / 2;
    const qrY = (size - qrSize) / 2;
    
    // Draw cyberpunk frame around QR code
    drawCyberpunkFrame(ctx, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, colors, pixelSize);
    
    // Draw the QR code
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    
    // Draw pixel art character elements around the QR code
    if (gender === 'male') {
      drawMaleCyberpunkElements(ctx, size, colors, pixelSize);
    } else {
      drawFemaleCyberpunkElements(ctx, size, colors, pixelSize);
    }
    
    // Add glitch effects
    addGlitchEffects(ctx, size, colors);
    
    // Add corner decorations
    drawCornerDecorations(ctx, size, colors, pixelSize);
  };

  const drawCyberpunkFrame = (ctx, x, y, width, height, colors, pixelSize) => {
    // Outer glow
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Corner accents
    const cornerSize = 15;
    ctx.fillStyle = colors.accent;
    
    // Top-left corner
    ctx.fillRect(x - 3, y - 3, cornerSize, 3);
    ctx.fillRect(x - 3, y - 3, 3, cornerSize);
    
    // Top-right corner
    ctx.fillRect(x + width - cornerSize + 3, y - 3, cornerSize, 3);
    ctx.fillRect(x + width, y - 3, 3, cornerSize);
    
    // Bottom-left corner
    ctx.fillRect(x - 3, y + height, cornerSize, 3);
    ctx.fillRect(x - 3, y + height - cornerSize + 3, 3, cornerSize);
    
    // Bottom-right corner
    ctx.fillRect(x + width - cornerSize + 3, y + height, cornerSize, 3);
    ctx.fillRect(x + width, y + height - cornerSize + 3, 3, cornerSize);
  };

  const drawMaleCyberpunkElements = (ctx, size, colors, pixelSize) => {
    // Robot head/helmet at top
    const headX = size / 2 - 40;
    const headY = 20;
    
    // Helmet
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(headX, headY, 80, 40);
    
    // Visor
    ctx.fillStyle = colors.accent;
    ctx.fillRect(headX + 10, headY + 15, 60, 15);
    
    // Visor glow
    ctx.fillStyle = colors.glow;
    ctx.fillRect(headX + 15, headY + 20, 50, 5);
    
    // Antenna
    ctx.fillStyle = colors.primary;
    ctx.fillRect(headX + 35, headY - 10, 10, 10);
    ctx.fillRect(headX + 38, headY - 15, 4, 5);
    
    // Shoulders
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(headX - 20, headY + 45, 30, 20);
    ctx.fillRect(headX + 70, headY + 45, 30, 20);
    
    // Shoulder lights
    ctx.fillStyle = colors.accent;
    ctx.fillRect(headX - 15, headY + 50, 8, 8);
    ctx.fillRect(headX + 75, headY + 50, 8, 8);
  };

  const drawFemaleCyberpunkElements = (ctx, size, colors, pixelSize) => {
    // Cyberpunk hair/helmet at top
    const headX = size / 2 - 40;
    const headY = 20;
    
    // Hair/helmet with more curves
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(headX - 5, headY, 90, 35);
    
    // Hair strands (pixel art style)
    ctx.fillStyle = colors.primary;
    ctx.fillRect(headX - 10, headY + 10, 8, 30);
    ctx.fillRect(headX + 82, headY + 10, 8, 30);
    
    // Visor
    ctx.fillStyle = colors.accent;
    ctx.fillRect(headX + 5, headY + 12, 70, 18);
    
    // Visor glow
    ctx.fillStyle = colors.glow;
    ctx.fillRect(headX + 10, headY + 18, 60, 6);
    
    // Hair ornament
    ctx.fillStyle = colors.accent;
    ctx.fillRect(headX + 30, headY - 8, 20, 8);
    ctx.fillRect(headX + 35, headY - 12, 10, 4);
    
    // Earrings/tech
    ctx.fillStyle = colors.primary;
    ctx.fillRect(headX - 8, headY + 25, 6, 12);
    ctx.fillRect(headX + 82, headY + 25, 6, 12);
    
    // Shoulder pads
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(headX - 25, headY + 40, 35, 25);
    ctx.fillRect(headX + 70, headY + 40, 35, 25);
    
    // Shoulder decorations
    ctx.fillStyle = colors.accent;
    ctx.fillRect(headX - 20, headY + 45, 10, 10);
    ctx.fillRect(headX + 75, headY + 45, 10, 10);
  };

  const addGlitchEffects = (ctx, size, colors) => {
    // Random glitch bars (cyberpunk aesthetic)
    ctx.globalAlpha = 0.3;
    
    for (let i = 0; i < 3; i++) {
      const y = Math.random() * size;
      const height = 2 + Math.random() * 4;
      
      ctx.fillStyle = colors.accent;
      ctx.fillRect(0, y, size, height);
    }
    
    ctx.globalAlpha = 1.0;
  };

  const drawCornerDecorations = (ctx, size, colors, pixelSize) => {
    // Bottom corners - data stream aesthetic
    const streams = 5;
    
    // Bottom left corner streams
    for (let i = 0; i < streams; i++) {
      ctx.fillStyle = i % 2 === 0 ? colors.primary : colors.secondary;
      ctx.fillRect(10 + i * 8, size - 40 + i * 6, 6, 6);
    }
    
    // Bottom right corner streams
    for (let i = 0; i < streams; i++) {
      ctx.fillStyle = i % 2 === 0 ? colors.primary : colors.secondary;
      ctx.fillRect(size - 50 + i * 8, size - 40 + i * 6, 6, 6);
    }
    
    // Add circuit lines
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    
    // Top corners
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(60, 20);
    ctx.lineTo(60, 40);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(size - 20, 20);
    ctx.lineTo(size - 60, 20);
    ctx.lineTo(size - 60, 40);
    ctx.stroke();
    
    ctx.globalAlpha = 1.0;
  };

  const generateCustomQRCode = async () => {
    if (!referralUrl) {
      console.error('No referral URL provided');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Generate base QR code
      const qrCanvas = document.createElement('canvas');
      const colors = colorSchemes[selectedColor] || colorSchemes.purple;
      
      await QRCode.toCanvas(qrCanvas, referralUrl, {
        width: 180,
        margin: 1,
        errorCorrectionLevel: 'H', // High error correction allows up to 30% damage
        color: {
          dark: colors.primary,
          light: '#FFFFFF'
        }
      });
      
      // Create main canvas
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas element not found');
      }
      
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Draw pixel character with QR code
      drawPixelCharacter(ctx, qrCanvas, selectedGender, colors);
      
      // Convert to data URL with high quality
      const dataURL = canvas.toDataURL('image/png', 1.0);
      setQrDataURL(dataURL);
      
    } catch (error) {
      console.error('Error generating custom QR code:', error);
      // Fallback: try to generate a simple QR code without pixel art
      try {
        const fallbackCanvas = document.createElement('canvas');
        await QRCode.toCanvas(fallbackCanvas, referralUrl, {
          width: 400,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: {
            dark: colorSchemes[selectedColor].primary,
            light: '#FFFFFF'
          }
        });
        const fallbackURL = fallbackCanvas.toDataURL('image/png', 1.0);
        setQrDataURL(fallbackURL);
      } catch (fallbackError) {
        console.error('Fallback QR generation failed:', fallbackError);
        alert('Unable to generate QR code. Please try refreshing the page.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate when options change
  useEffect(() => {
    if (isOpen) {
      generateCustomQRCode();
    }
  }, [isOpen, selectedGender, selectedColor, referralUrl]);

  const handleDownload = () => {
    if (!qrDataURL) {
      alert('QR code not ready. Please wait for generation to complete.');
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.download = `aquads-cyberpunk-qr-${username || 'user'}-${selectedGender}-${selectedColor}.png`;
      link.href = qrDataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try right-clicking the image and selecting "Save Image As..."');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Cyberpunk QR Code Generator</h2>
              <p className="text-gray-400 text-sm">Create your custom pixel art QR code</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
            >
              <FaTimes size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customization Panel */}
              <div className="space-y-6">
                {/* Gender Selection */}
                <div>
                  <label className="block text-white font-semibold mb-3">Character Style</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedGender('male')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedGender === 'male'
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                      }`}
                    >
                      <FaMale className="text-3xl mx-auto mb-2 text-blue-400" />
                      <span className="text-white font-medium">Male</span>
                      <p className="text-xs text-gray-400 mt-1">Robotic Helmet</p>
                    </button>
                    <button
                      onClick={() => setSelectedGender('female')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedGender === 'female'
                          ? 'border-pink-500 bg-pink-500/20'
                          : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                      }`}
                    >
                      <FaFemale className="text-3xl mx-auto mb-2 text-pink-400" />
                      <span className="text-white font-medium">Female</span>
                      <p className="text-xs text-gray-400 mt-1">Cyber Hair</p>
                    </button>
                  </div>
                </div>

                {/* Color Scheme Selection */}
                <div>
                  <label className="block text-white font-semibold mb-3">Color Scheme</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(colorSchemes).map(([key, scheme]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedColor(key)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedColor === key
                            ? 'border-white bg-gray-700'
                            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full"
                            style={{
                              background: `linear-gradient(135deg, ${scheme.primary}, ${scheme.secondary})`
                            }}
                          />
                          <span className="text-white text-sm font-medium">{scheme.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-blue-400 font-semibold mb-2">✨ About This QR Code</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Unique pixel art cyberpunk design</li>
                    <li>• Fully scannable with any QR reader</li>
                    <li>• High-quality 400x400px PNG</li>
                    <li>• Perfect for social media sharing</li>
                  </ul>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="flex flex-col">
                <label className="block text-white font-semibold mb-3">Preview</label>
                <div className="bg-gray-800 rounded-lg p-6 flex-1 flex flex-col items-center justify-center">
                  {isGenerating ? (
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                      <p className="text-gray-400">Generating your cyberpunk QR code...</p>
                    </div>
                  ) : qrDataURL ? (
                    <div className="text-center">
                      <canvas
                        ref={canvasRef}
                        className="hidden"
                      />
                      <img
                        src={qrDataURL}
                        alt="Custom QR Code"
                        className="w-full max-w-[400px] h-auto rounded-lg shadow-2xl"
                      />
                      <button
                        onClick={handleDownload}
                        className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 mx-auto"
                      >
                        <FaDownload />
                        Download QR Code
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-400">Select options to generate</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QRCodeCustomizerModal;

