import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { FaTimes, FaDownload } from 'react-icons/fa';

const QRCodeCustomizerModal = ({ isOpen, onClose, referralUrl, username }) => {
  const [selectedColor, setSelectedColor] = useState('neon');
  const [qrDataURL, setQrDataURL] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);

  const colorSchemes = {
    neon: {
      name: 'Neon Purple',
      primary: '#A855F7',
      secondary: '#7C3AED',
      accent: '#E879F9',
      glow: '#C084FC',
      bgDark: '#0f0a1a',
      bgMid: '#1a0f2e',
      bgLight: '#2d1b4e',
      qrDark: '#51159D',
      qrLight: '#FFFFFF'
    },
    cyan: {
      name: 'Electric Cyan',
      primary: '#22D3EE',
      secondary: '#06B6D4',
      accent: '#67E8F9',
      glow: '#A5F3FC',
      bgDark: '#0a1628',
      bgMid: '#0e1f38',
      bgLight: '#164e63',
      qrDark: '#0891B2',
      qrLight: '#FFFFFF'
    },
    amber: {
      name: 'Amber Tech',
      primary: '#F59E0B',
      secondary: '#D97706',
      accent: '#FBBF24',
      glow: '#FDE68A',
      bgDark: '#1c1917',
      bgMid: '#292524',
      bgLight: '#44403c',
      qrDark: '#B45309',
      qrLight: '#FFFFFF'
    },
    green: {
      name: 'Matrix Green',
      primary: '#22C55E',
      secondary: '#16A34A',
      accent: '#4ADE80',
      glow: '#86EFAC',
      bgDark: '#052e16',
      bgMid: '#14532d',
      bgLight: '#166534',
      qrDark: '#15803D',
      qrLight: '#FFFFFF'
    },
    pink: {
      name: 'Neon Pink',
      primary: '#EC4899',
      secondary: '#DB2777',
      accent: '#F472B6',
      glow: '#FBCFE8',
      bgDark: '#1f0a18',
      bgMid: '#2e0f24',
      bgLight: '#4c1d35',
      qrDark: '#BE185D',
      qrLight: '#FFFFFF'
    },
    classic: {
      name: 'Classic B&W',
      primary: '#FFFFFF',
      secondary: '#E5E5E5',
      accent: '#A855F7',
      glow: '#DDD6FE',
      bgDark: '#0c0c0c',
      bgMid: '#171717',
      bgLight: '#262626',
      qrDark: '#000000',
      qrLight: '#FFFFFF'
    }
  };

  // Draw abstract tech/neon design around QR code
  const drawAbstractTechDesign = (ctx, qrCanvas, colors) => {
    const size = 400;
    const centerX = size / 2;
    const centerY = size / 2;
    const qrSize = 180;
    const qrX = centerX - qrSize / 2;
    const qrY = centerY - qrSize / 2;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // 1. Background: radial gradient (dark center to neon edge glow)
    const bgGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, size * 0.7
    );
    bgGradient.addColorStop(0, colors.bgDark);
    bgGradient.addColorStop(0.5, colors.bgMid);
    bgGradient.addColorStop(0.85, colors.bgLight);
    bgGradient.addColorStop(1, colors.primary + '22');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, size, size);

    // 2. Subtle grid overlay (very faint)
    ctx.strokeStyle = colors.primary + '15';
    ctx.lineWidth = 0.5;
    const gridSpacing = 40;
    for (let i = 0; i <= size; i += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    // 3. Corner circuit lines (tech aesthetic)
    ctx.strokeStyle = colors.primary + '60';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const circuitPaths = [
      { start: [30, 30], path: [[80, 30], [80, 50], [30, 50]] },
      { start: [size - 30, 30], path: [[size - 80, 30], [size - 80, 50], [size - 30, 50]] },
      { start: [30, size - 30], path: [[80, size - 30], [80, size - 50], [30, size - 50]] },
      { start: [size - 30, size - 30], path: [[size - 80, size - 30], [size - 80, size - 50], [size - 30, size - 50]] }
    ];

    circuitPaths.forEach(({ start, path }) => {
      ctx.beginPath();
      ctx.moveTo(...start);
      path.forEach(p => ctx.lineTo(...p));
      ctx.stroke();
    });

    // 4. Hexagonal frame around QR (with glow)
    const hexRadius = qrSize / 2 + 24;
    const hexPoints = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      hexPoints.push([
        centerX + hexRadius * Math.cos(angle),
        centerY + hexRadius * Math.sin(angle)
      ]);
    }

    // Hex fill (semi-transparent)
    ctx.fillStyle = colors.primary + '08';
    ctx.beginPath();
    ctx.moveTo(hexPoints[0][0], hexPoints[0][1]);
    for (let i = 1; i < hexPoints.length; i++) {
      ctx.lineTo(hexPoints[i][0], hexPoints[i][1]);
    }
    ctx.closePath();
    ctx.fill();

    // Hex stroke with neon glow
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 25;
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hexPoints[0][0], hexPoints[0][1]);
    for (let i = 1; i < hexPoints.length; i++) {
      ctx.lineTo(hexPoints[i][0], hexPoints[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 5. Inner hex (closer to QR) - accent color
    const innerHexRadius = qrSize / 2 + 8;
    const innerHexPoints = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      innerHexPoints.push([
        centerX + innerHexRadius * Math.cos(angle),
        centerY + innerHexRadius * Math.sin(angle)
      ]);
    }
    ctx.strokeStyle = colors.accent + 'aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(innerHexPoints[0][0], innerHexPoints[0][1]);
    for (let i = 1; i < innerHexPoints.length; i++) {
      ctx.lineTo(innerHexPoints[i][0], innerHexPoints[i][1]);
    }
    ctx.closePath();
    ctx.stroke();

    // 6. Corner nodes (glowing dots at hex corners)
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;
    hexPoints.forEach(([x, y]) => {
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // 7. Draw QR code
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // 8. Scan line effect (subtle diagonal accent)
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    for (let i = -size; i < size * 2; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
    ctx.restore();

    return { qrX, qrY, qrSize };
  };

  const addLogoToQRCode = async (ctx, qrX, qrY, qrSize) => {
    try {
      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.src = '/AquadsSymbol.svg';

      await new Promise((resolve) => {
        logo.onload = resolve;
        logo.onerror = () => resolve();
      });

      if (!logo.complete || !logo.naturalWidth) return;

      const bgSize = qrSize * 0.38;
      const logoSize = bgSize * 0.9;
      const bgX = qrX + (qrSize - bgSize) / 2;
      const bgY = qrY + (qrSize - bgSize) / 2;
      const logoDx = qrX + (qrSize - logoSize) / 2;
      const logoDy = qrY + (qrSize - logoSize) / 2;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(qrX + qrSize / 2, qrY + qrSize / 2, bgSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.drawImage(logo, logoDx, logoDy, logoSize, logoSize);
    } catch (err) {
      console.warn('Could not add logo to QR:', err);
    }
  };

  const generateCustomQRCode = async () => {
    if (!referralUrl || !canvasRef.current) return;

    setIsGenerating(true);

    try {
      const colors = colorSchemes[selectedColor] || colorSchemes.neon;
      const qrCanvas = document.createElement('canvas');

      await QRCode.toCanvas(qrCanvas, referralUrl, {
        width: 180,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: { dark: colors.qrDark, light: colors.qrLight }
      });

      const canvas = canvasRef.current;
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas context not available');

      const { qrX, qrY, qrSize } = drawAbstractTechDesign(ctx, qrCanvas, colors);
      await addLogoToQRCode(ctx, qrX, qrY, qrSize);

      setQrDataURL(canvas.toDataURL('image/png', 1.0));
    } catch (error) {
      console.error('QR generation failed:', error);
      try {
        const fallbackCanvas = document.createElement('canvas');
        const colors = colorSchemes[selectedColor] || colorSchemes.neon;
        await QRCode.toCanvas(fallbackCanvas, referralUrl, {
          width: 400,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: { dark: colors.primary, light: '#FFFFFF' }
        });
        setQrDataURL(fallbackCanvas.toDataURL('image/png', 1.0));
      } catch (fallbackError) {
        console.error('Fallback failed:', fallbackError);
        alert('Unable to generate QR code. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const timer = setTimeout(generateCustomQRCode, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedColor, referralUrl]);

  const handleDownload = () => {
    if (!qrDataURL) {
      alert('QR code not ready. Please wait for generation to complete.');
      return;
    }
    try {
      const link = document.createElement('a');
      link.download = `aquads-affiliate-qr-${username || 'user'}-${selectedColor}.png`;
      link.href = qrDataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Try right-clicking the image and "Save Image As..."');
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
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Affiliate QR Code</h2>
                <p className="text-gray-400 text-sm">Tech-style shareable QR for your referral link</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
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
                              className="w-8 h-8 rounded-lg"
                              style={{
                                background: `linear-gradient(135deg, ${scheme.primary}, ${scheme.secondary})`,
                                boxShadow: `0 0 12px ${scheme.primary}66`
                              }}
                            />
                            <span className="text-white text-sm font-medium">{scheme.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h3 className="text-blue-400 font-semibold mb-2">About This QR Code</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Abstract tech/neon design</li>
                      <li>• Fully scannable with any QR reader</li>
                      <li>• 400×400px PNG, ready to share</li>
                      <li>• Use as profile pic or social share</li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="block text-white font-semibold mb-3">Preview</label>
                  <div className="bg-gray-800 rounded-lg p-6 flex-1 flex flex-col items-center justify-center">
                    <canvas ref={canvasRef} className="hidden" />

                    {isGenerating ? (
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
                        <p className="text-gray-400">Generating your QR code...</p>
                      </div>
                    ) : qrDataURL ? (
                      <div className="text-center">
                        <img
                          src={qrDataURL}
                          alt="Affiliate QR Code"
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
                      <p className="text-gray-400">Select a color to generate</p>
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
