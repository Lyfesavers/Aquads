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
      bg: '#1E1B4B',
      qrDark: '#7C3AED',    // QR code data pixels
      qrLight: '#F3E8FF'    // QR code background (light purple)
    },
    blue: {
      name: 'Neon Blue',
      primary: '#3B82F6',
      secondary: '#1D4ED8',
      accent: '#60A5FA',
      glow: '#DBEAFE',
      bg: '#0C4A6E',
      qrDark: '#1D4ED8',    // QR code data pixels
      qrLight: '#DBEAFE'    // QR code background (light blue)
    },
    green: {
      name: 'Toxic Green',
      primary: '#10B981',
      secondary: '#059669',
      accent: '#34D399',
      glow: '#D1FAE5',
      bg: '#064E3B',
      qrDark: '#065F46',    // QR code data pixels
      qrLight: '#D1FAE5'    // QR code background (light green)
    },
    pink: {
      name: 'Hot Pink',
      primary: '#EC4899',
      secondary: '#DB2777',
      accent: '#F9A8D4',
      glow: '#FCE7F3',
      bg: '#831843',
      qrDark: '#BE185D',    // QR code data pixels
      qrLight: '#FCE7F3'    // QR code background (light pink)
    },
    orange: {
      name: 'Cyber Orange',
      primary: '#F59E0B',
      secondary: '#D97706',
      accent: '#FBBf24',
      glow: '#FEF3C7',
      bg: '#78350F',
      qrDark: '#B45309',    // QR code data pixels
      qrLight: '#FEF3C7'    // QR code background (light orange)
    },
    cyan: {
      name: 'Electric Cyan',
      primary: '#06B6D4',
      secondary: '#0891B2',
      accent: '#22D3EE',
      glow: '#CFFAFE',
      bg: '#164E63',
      qrDark: '#0E7490',    // QR code data pixels
      qrLight: '#CFFAFE'    // QR code background (light cyan)
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
    
    // Draw pixel art character body FIRST (behind QR)
    if (gender === 'male') {
      drawMaleCyberpunkBody(ctx, size, colors, pixelSize);
    } else {
      drawFemaleCyberpunkBody(ctx, size, colors, pixelSize);
    }
    
    // Calculate QR code position (center, but smaller to leave room for character)
    const qrSize = 160;
    const qrX = (size - qrSize) / 2;
    const qrY = (size - qrSize) / 2 + 20; // Shifted down for head
    
    // Draw white backing for QR code
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);
    
    // Draw the QR code
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    
    // Draw cyberpunk frame around QR code
    drawCyberpunkFrame(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, colors, pixelSize);
    
    // Draw pixel art character HEAD on top
    if (gender === 'male') {
      drawMaleCyberpunkHead(ctx, size, colors, pixelSize, qrY);
    } else {
      drawFemaleCyberpunkHead(ctx, size, colors, pixelSize, qrY);
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

  // Male character body (shoulders and torso behind QR)
  const drawMaleCyberpunkBody = (ctx, size, colors, pixelSize) => {
    const centerX = size / 2;
    
    // Broad shoulders
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 120, 250, 80, 40); // Left shoulder
    ctx.fillRect(centerX + 40, 250, 80, 40);  // Right shoulder
    
    // Shoulder armor plates
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 115, 255, 70, 8);
    ctx.fillRect(centerX + 45, 255, 70, 8);
    
    // Glowing shoulder lights
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 15;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 100, 265, 15, 15);
    ctx.fillRect(centerX + 85, 265, 15, 15);
    ctx.shadowBlur = 0;
    
    // Torso (behind QR)
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 60, 290, 120, 80);
    
    // Chest plate details
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 50, 300, 100, 5);
    ctx.fillRect(centerX - 50, 320, 100, 5);
    ctx.fillRect(centerX - 50, 340, 100, 5);
    
    // Arms
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 110, 295, 30, 100); // Left arm
    ctx.fillRect(centerX + 80, 295, 30, 100);  // Right arm
    
    // Arm tech details
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 105, 310, 20, 8);
    ctx.fillRect(centerX - 105, 330, 20, 8);
    ctx.fillRect(centerX + 85, 310, 20, 8);
    ctx.fillRect(centerX + 85, 330, 20, 8);
  };

  const drawMaleCyberpunkHead = (ctx, size, colors, pixelSize, qrY) => {
    const centerX = size / 2;
    const headY = qrY - 80;
    
    // Neck
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 20, headY + 65, 40, 20);
    
    // Head base
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 40, headY, 80, 60);
    
    // Helmet top
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 45, headY - 5, 90, 10);
    
    // Visor (large glowing area)
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 35, headY + 20, 70, 20);
    ctx.shadowBlur = 0;
    
    // Visor details
    ctx.fillStyle = colors.glow;
    ctx.fillRect(centerX - 30, headY + 25, 60, 8);
    
    // Antenna on top
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 8, headY - 20, 16, 20);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 5, headY - 25, 10, 5);
    
    // Side vents
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 45, headY + 15, 8, 25);
    ctx.fillRect(centerX + 37, headY + 15, 8, 25);
    
    // Jaw/lower helmet
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 35, headY + 45, 70, 15);
  };

  // Female character body (shoulders and torso behind QR)
  const drawFemaleCyberpunkBody = (ctx, size, colors, pixelSize) => {
    const centerX = size / 2;
    
    // Sleeker shoulders
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 110, 250, 70, 35);
    ctx.fillRect(centerX + 40, 250, 70, 35);
    
    // Shoulder decorations
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 105, 255, 60, 6);
    ctx.fillRect(centerX + 45, 255, 60, 6);
    
    // Glowing shoulder gems
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 15;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 95, 265, 12, 12);
    ctx.fillRect(centerX + 83, 265, 12, 12);
    ctx.shadowBlur = 0;
    
    // Torso (behind QR)
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 55, 290, 110, 80);
    
    // Body suit details
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 45, 300, 90, 4);
    ctx.fillRect(centerX - 45, 315, 90, 4);
    ctx.fillRect(centerX - 45, 330, 90, 4);
    ctx.fillRect(centerX - 45, 345, 90, 4);
    
    // Arms (slimmer)
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 105, 295, 25, 95);
    ctx.fillRect(centerX + 80, 295, 25, 95);
    
    // Arm bands
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 103, 310, 21, 6);
    ctx.fillRect(centerX - 103, 330, 21, 6);
    ctx.fillRect(centerX + 82, 310, 21, 6);
    ctx.fillRect(centerX + 82, 330, 21, 6);
  };

  const drawFemaleCyberpunkHead = (ctx, size, colors, pixelSize, qrY) => {
    const centerX = size / 2;
    const headY = qrY - 80;
    
    // Neck
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 18, headY + 60, 36, 25);
    
    // Head base
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 38, headY, 76, 55);
    
    // Hair/helmet top
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 45, headY - 10, 90, 15);
    
    // Hair strands (pixel art style)
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 50, headY + 5, 10, 45);
    ctx.fillRect(centerX + 40, headY + 5, 10, 45);
    ctx.fillRect(centerX - 58, headY + 15, 8, 35);
    ctx.fillRect(centerX + 50, headY + 15, 8, 35);
    
    // Visor (sleeker)
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 33, headY + 18, 66, 18);
    ctx.shadowBlur = 0;
    
    // Visor glow
    ctx.fillStyle = colors.glow;
    ctx.fillRect(centerX - 28, headY + 23, 56, 6);
    
    // Hair ornament/tech crown
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 30, headY - 15, 60, 8);
    ctx.fillRect(centerX - 20, headY - 20, 40, 5);
    ctx.fillRect(centerX - 10, headY - 25, 20, 5);
    
    // Earrings/tech
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 43, headY + 30, 5, 15);
    ctx.fillRect(centerX + 38, headY + 30, 5, 15);
    ctx.shadowBlur = 0;
    
    // Lower face/mask
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 30, headY + 42, 60, 13);
  };

  const addGlitchEffects = (ctx, size, colors) => {
    // Random glitch bars (cyberpunk aesthetic)
    ctx.globalAlpha = 0.2;
    
    // Horizontal glitch lines
    const glitchLines = [
      { y: 100, height: 3 },
      { y: 180, height: 2 },
      { y: 350, height: 4 }
    ];
    
    glitchLines.forEach(line => {
      ctx.fillStyle = colors.accent;
      ctx.fillRect(0, line.y, size, line.height);
    });
    
    ctx.globalAlpha = 1.0;
  };

  const addLogoToQRCode = async (ctx, qrX, qrY, qrSize) => {
    try {
      // Load Aquads logo
      const logo = new Image();
      logo.crossOrigin = 'anonymous'; // Prevent CORS issues
      logo.src = '/Aquadsnewlogo.png';
      
      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = () => {
          console.warn('Could not load logo, skipping...');
          resolve(); // Continue without logo if it fails
        };
      });
      
      // Calculate logo size (about 35% of QR code size - nice and prominent)
      const logoSize = qrSize * 0.35;
      
      // Calculate logo dimensions maintaining aspect ratio
      const logoAspectRatio = logo.width / logo.height;
      let logoWidth = logoSize;
      let logoHeight = logoSize;
      
      if (logoAspectRatio > 1) {
        logoHeight = logoSize / logoAspectRatio;
      } else if (logoAspectRatio < 1) {
        logoWidth = logoSize * logoAspectRatio;
      }
      
      const logoX = qrX + (qrSize - logoWidth) / 2;
      const logoY = qrY + (qrSize - logoHeight) / 2;
      
      // Draw white background circle for logo
      const bgSize = logoSize * 1.3;
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(qrX + qrSize / 2, qrY + qrSize / 2, bgSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw logo with high quality
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      
    } catch (error) {
      console.error('Error adding logo to QR code:', error);
      // Continue without logo if there's an error
    }
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
    
    // Top corners with more detail
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
    
    // Bottom corners circuits
    ctx.beginPath();
    ctx.moveTo(20, size - 20);
    ctx.lineTo(60, size - 20);
    ctx.lineTo(60, size - 40);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(size - 20, size - 20);
    ctx.lineTo(size - 60, size - 20);
    ctx.lineTo(size - 60, size - 40);
    ctx.stroke();
    
    ctx.globalAlpha = 1.0;
    
    // Corner accent squares
    ctx.fillStyle = colors.accent;
    ctx.fillRect(15, 15, 8, 8);
    ctx.fillRect(size - 23, 15, 8, 8);
    ctx.fillRect(15, size - 23, 8, 8);
    ctx.fillRect(size - 23, size - 23, 8, 8);
  };

  const generateCustomQRCode = async () => {
    if (!referralUrl) {
      console.error('No referral URL provided');
      return;
    }
    
    // Double-check canvas is available
    if (!canvasRef.current) {
      console.error('Canvas ref not ready yet');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Generate base QR code
      const qrCanvas = document.createElement('canvas');
      const colors = colorSchemes[selectedColor] || colorSchemes.purple;
      
      await QRCode.toCanvas(qrCanvas, referralUrl, {
        width: 160,
        margin: 1,
        errorCorrectionLevel: 'H', // High error correction allows up to 30% damage
        color: {
          dark: colors.qrDark,    // Dark color for QR data pixels
          light: colors.qrLight   // Light contrasting background
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
      
      // Add Aquads logo to center of QR code
      await addLogoToQRCode(ctx, 120, 140, 160); // qrX, qrY, qrSize
      
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
    if (isOpen && canvasRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        generateCustomQRCode();
      }, 100);
      return () => clearTimeout(timer);
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
                  {/* Canvas always rendered but hidden - ensures ref is available */}
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  
                  {isGenerating ? (
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                      <p className="text-gray-400">Generating your cyberpunk QR code...</p>
                    </div>
                  ) : qrDataURL ? (
                    <div className="text-center">
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

