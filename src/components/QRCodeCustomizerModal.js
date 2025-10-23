import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { FaTimes, FaDownload, FaMale, FaFemale } from 'react-icons/fa';

const QRCodeCustomizerModal = ({ isOpen, onClose, referralUrl, username }) => {
  const [selectedGender, setSelectedGender] = useState('male');
  const [selectedColor, setSelectedColor] = useState('purple');
  const [selectedAccessory, setSelectedAccessory] = useState('none');
  const [qrDataURL, setQrDataURL] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);

  const colorSchemes = {
    purple: {
      name: 'Purple & Yellow',
      primary: '#A855F7',
      secondary: '#7C3AED',
      accent: '#FEBC10',
      glow: '#FFE896',
      bg: '#FEBC10',        // Solid brand yellow background
      qrDark: '#51159D',    // Brand purple for QR data pixels
      qrLight: '#FEBC10'    // Brand yellow for QR background (bright & easy on eyes)
    },
    yellow: {
      name: 'Yellow & Purple',
      primary: '#FEBC10',
      secondary: '#F59E0B',
      accent: '#A855F7',
      glow: '#DDD6FE',
      bg: '#51159D',        // Solid brand purple background
      qrDark: '#FEBC10',    // Brand yellow for QR data pixels
      qrLight: '#51159D'    // Brand purple for QR background
    },
    purpleLight: {
      name: 'Purple & White',
      primary: '#A855F7',
      secondary: '#7C3AED',
      accent: '#C084FC',
      glow: '#DDD6FE',
      bg: '#FEBC10',        // Solid brand yellow background (contrast with purple)
      qrDark: '#51159D',    // Brand purple for QR data pixels
      qrLight: '#FFFFFF'    // White background for maximum contrast
    },
    yellowLight: {
      name: 'Yellow & White',
      primary: '#FEBC10',
      secondary: '#F59E0B',
      accent: '#FBBf24',
      glow: '#FEF3C7',
      bg: '#51159D',        // Solid brand purple background (contrast with yellow)
      qrDark: '#C79100',    // Darker yellow for QR data pixels
      qrLight: '#FFFFFF'    // White background for maximum contrast
    },
    classic: {
      name: 'Classic Black & White',
      primary: '#A855F7',
      secondary: '#7C3AED',
      accent: '#FEBC10',
      glow: '#FFE896',
      bg: '#FEBC10',        // Solid brand yellow background
      qrDark: '#000000',    // Black for QR data pixels
      qrLight: '#FFFFFF'    // White background (most scannable)
    },
    purpleDark: {
      name: 'Black, White & Yellow',
      primary: '#000000',
      secondary: '#FFFFFF',
      accent: '#FEBC10',
      glow: '#FFE896',
      bg: '#FFFFFF',        // White background for clean contrast
      qrDark: '#000000',    // Black for QR data pixels
      qrLight: '#FFFFFF'    // White background for maximum scannability
    }
  };

  const accessories = {
    none: { name: 'None', icon: '🚫' },
    cigar: { name: 'Cigar', icon: '🚬' },
    bible: { name: 'Bible', icon: '📖' },
    wine: { name: 'Wine Glass', icon: '🍷' },
    controller: { name: 'Game Controller', icon: '🎮' },
    microphone: { name: 'Microphone', icon: '🎤' },
    palette: { name: 'Artist Palette', icon: '🎨' }
  };

  // Pixel art character templates
  const drawPixelCharacter = (ctx, qrCanvas, gender, colors) => {
    const canvas = ctx.canvas;
    const size = 400; // Canvas size
    const pixelSize = 8; // Size of each pixel block
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw solid background (brand color)
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, size, size);
    
    // Draw pixel art character body FIRST (behind QR)
    if (gender === 'male') {
      drawMaleCyberquadsBody(ctx, size, colors, pixelSize);
    } else {
      drawFemaleCyberquadsBody(ctx, size, colors, pixelSize);
    }
    
    // Calculate QR code position (center, but smaller to leave room for character)
    const qrSize = 160;
    const qrX = (size - qrSize) / 2;
    const qrY = (size - qrSize) / 2 + 20; // Shifted down for head
    
    // Draw the QR code (no white backing - using bright solid colors)
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    
    // Draw cyberquads frame around QR code
    drawCyberquadsFrame(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, colors, pixelSize);
    
    // Draw pixel art character HEAD on top
    if (gender === 'male') {
      drawMaleCyberquadsHead(ctx, size, colors, pixelSize, qrY);
    } else {
      drawFemaleCyberquadsHead(ctx, size, colors, pixelSize, qrY);
    }
    
    // Draw selected accessory (after character is fully drawn)
    drawAccessory(ctx, size, gender, selectedAccessory, colors, qrY);
  };

  const drawCyberquadsFrame = (ctx, x, y, width, height, colors, pixelSize) => {
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
  const drawMaleCyberquadsBody = (ctx, size, colors, pixelSize) => {
    const centerX = size / 2;
    
    // Jacket/hoodie shoulders (stylish) - HIGHER UP
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 100, 245, 65, 30); // Left shoulder
    ctx.fillRect(centerX + 35, 245, 65, 30);  // Right shoulder
    
    // Hoodie collar/jacket collar
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 30, 245, 60, 12);
    
    // Cool jacket details
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 95, 252, 55, 3);
    ctx.fillRect(centerX + 40, 252, 55, 3);
    
    // Glowing Aquads pins/badges on jacket
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 85, 260, 12, 12);
    ctx.fillRect(centerX + 73, 260, 12, 12);
    ctx.shadowBlur = 0;
    
    // ARMS extending from shoulders (clearly at shoulder level)
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 105, 250, 20, 65); // Left arm
    ctx.fillRect(centerX + 85, 250, 20, 65);  // Right arm
    
    // Watch/tech bracelet on wrist
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 105, 305, 20, 8);
    ctx.fillRect(centerX + 85, 305, 20, 8);
    
    // Hands
    ctx.fillStyle = '#D4A574';
    ctx.fillRect(centerX - 105, 315, 20, 15);
    ctx.fillRect(centerX + 85, 315, 20, 15);
    
    // Torso/chest (behind QR) - hoodie/jacket
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 50, 275, 100, 100);
    
    // Jacket zipper
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 2, 280, 4, 90);
    
    // Jacket pockets/details
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 35, 310, 20, 3);
    ctx.fillRect(centerX + 15, 310, 20, 3);
    
    // LEGS (clearly at bottom, separate from arms)
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 40, 375, 30, 20); // Left thigh
    ctx.fillRect(centerX + 10, 375, 30, 20); // Right thigh
    
    // Shoes/feet
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 42, 395, 34, 5); // Left shoe
    ctx.fillRect(centerX + 8, 395, 34, 5);  // Right shoe
  };

  const drawMaleCyberquadsHead = (ctx, size, colors, pixelSize, qrY) => {
    const centerX = size / 2;
    const headY = qrY - 90;
    
    // Neck/collar
    const skinTone = '#D4A574';
    ctx.fillStyle = skinTone;
    ctx.fillRect(centerX - 18, headY + 68, 36, 22);
    
    // Head base (skin tone)
    ctx.fillStyle = skinTone;
    ctx.fillRect(centerX - 38, headY + 5, 76, 65);
    
    // Cool hair/undercut style
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 40, headY, 80, 25); // Top hair
    ctx.fillRect(centerX - 42, headY + 8, 10, 35); // Left sideburn
    ctx.fillRect(centerX + 32, headY + 8, 10, 35); // Right sideburn
    
    // Hair highlights
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 30, headY + 3, 60, 6);
    ctx.fillRect(centerX - 20, headY + 12, 40, 4);
    
    // Cyberquads headband/tech band
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 40, headY + 28, 80, 8);
    ctx.shadowBlur = 0;
    
    // Eyes (human-like)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(centerX - 26, headY + 38, 14, 10);
    ctx.fillRect(centerX + 12, headY + 38, 14, 10);
    
    // Pupils (glowing cyber eyes)
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 21, headY + 41, 6, 6);
    ctx.fillRect(centerX + 17, headY + 41, 6, 6);
    ctx.shadowBlur = 0;
    
    // Eyebrows
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 28, headY + 34, 16, 3);
    ctx.fillRect(centerX + 12, headY + 34, 16, 3);
    
    // Nose (simple pixel art)
    ctx.fillStyle = '#C4956A';
    ctx.fillRect(centerX - 4, headY + 48, 8, 8);
    
    // Mouth/smirk
    ctx.fillStyle = '#8B6F5E';
    ctx.fillRect(centerX - 12, headY + 60, 24, 5);
    ctx.fillRect(centerX + 8, headY + 57, 4, 3); // Smirk corner
    
    // Ear tech/earpiece
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 42, headY + 40, 4, 12);
    ctx.fillRect(centerX + 38, headY + 40, 4, 12);
    
    // Beard/facial hair (optional stylish detail)
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 20, headY + 65, 40, 6);
  };

  // Female character body (shoulders and torso behind QR)
  const drawFemaleCyberquadsBody = (ctx, size, colors, pixelSize) => {
    const centerX = size / 2;
    
    // Stylish jacket shoulders - HIGHER UP
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 95, 247, 60, 28);
    ctx.fillRect(centerX + 35, 247, 60, 28);
    
    // Collar/neckline
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 28, 247, 56, 10);
    
    // Jacket details/trim
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 92, 254, 55, 3);
    ctx.fillRect(centerX + 37, 254, 55, 3);
    
    // Glowing Aquads badges/pins
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 82, 263, 10, 10);
    ctx.fillRect(centerX + 72, 263, 10, 10);
    ctx.shadowBlur = 0;
    
    // ARMS extending from shoulders (clearly at shoulder level)
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 100, 252, 18, 60); // Left arm
    ctx.fillRect(centerX + 82, 252, 18, 60);  // Right arm
    
    // Bracelet/tech bands
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 100, 290, 18, 6);
    ctx.fillRect(centerX + 82, 290, 18, 6);
    ctx.shadowBlur = 0;
    
    // Hands
    ctx.fillStyle = '#E8C5A0';
    ctx.fillRect(centerX - 100, 312, 18, 12);
    ctx.fillRect(centerX + 82, 312, 18, 12);
    
    // Torso/jacket (behind QR)
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 48, 275, 96, 100);
    
    // Jacket/top design lines
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(centerX - 42, 290, 16, 75);
    ctx.fillRect(centerX + 26, 290, 16, 75);
    
    // Belt/waist accent
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 46, 365, 92, 8);
    
    // LEGS (clearly at bottom, separate from arms)
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 38, 375, 28, 20); // Left leg
    ctx.fillRect(centerX + 10, 375, 28, 20); // Right leg
    
    // Shoes/boots
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 40, 395, 32, 5); // Left shoe
    ctx.fillRect(centerX + 8, 395, 32, 5);  // Right shoe
  };

  const drawFemaleCyberquadsHead = (ctx, size, colors, pixelSize, qrY) => {
    const centerX = size / 2;
    const headY = qrY - 90;
    
    // Neck
    const skinTone = '#E8C5A0';
    ctx.fillStyle = skinTone;
    ctx.fillRect(centerX - 16, headY + 70, 32, 20);
    
    // Head base (skin tone)
    ctx.fillStyle = skinTone;
    ctx.fillRect(centerX - 36, headY + 8, 72, 62);
    
    // Long flowing hair (cyberquads style)
    ctx.fillStyle = colors.primary;
    // Top of hair
    ctx.fillRect(centerX - 42, headY - 2, 84, 18);
    // Hair volume sides
    ctx.fillRect(centerX - 48, headY + 10, 12, 55);
    ctx.fillRect(centerX + 36, headY + 10, 12, 55);
    // Hair flowing over shoulders
    ctx.fillRect(centerX - 54, headY + 35, 10, 40);
    ctx.fillRect(centerX + 44, headY + 35, 10, 40);
    
    // Hair highlights/streaks
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 35, headY + 2, 70, 5);
    ctx.fillRect(centerX - 45, headY + 20, 8, 30);
    ctx.fillRect(centerX + 37, headY + 20, 8, 30);
    
    // Cyberquads hair accessory/clip
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 35, headY + 5, 20, 8);
    ctx.fillRect(centerX + 15, headY + 5, 20, 8);
    ctx.shadowBlur = 0;
    
    // Eyes (beautiful, human-like)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(centerX - 24, headY + 32, 13, 11);
    ctx.fillRect(centerX + 11, headY + 32, 13, 11);
    
    // Pupils (glowing cyber eyes)
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 20, headY + 36, 6, 6);
    ctx.fillRect(centerX + 15, headY + 36, 6, 6);
    ctx.shadowBlur = 0;
    
    // Eyelashes (upper)
    ctx.fillStyle = '#000000';
    ctx.fillRect(centerX - 24, headY + 31, 13, 2);
    ctx.fillRect(centerX + 11, headY + 31, 13, 2);
    
    // Eyebrows (styled)
    ctx.fillStyle = colors.primary;
    ctx.fillRect(centerX - 26, headY + 27, 15, 3);
    ctx.fillRect(centerX + 11, headY + 27, 15, 3);
    
    // Nose (delicate pixel art)
    ctx.fillStyle = '#D4A080';
    ctx.fillRect(centerX - 3, headY + 44, 6, 8);
    
    // Lips/smile
    ctx.fillStyle = '#C96A7D';
    ctx.fillRect(centerX - 10, headY + 56, 20, 6);
    ctx.fillStyle = '#E88FA5';
    ctx.fillRect(centerX - 8, headY + 57, 16, 3);
    
    // Earrings (glowing)
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX - 40, headY + 48, 4, 14);
    ctx.fillRect(centerX + 36, headY + 48, 4, 14);
    ctx.fillRect(centerX - 41, headY + 62, 6, 6);
    ctx.fillRect(centerX + 35, headY + 62, 6, 6);
    ctx.shadowBlur = 0;
    
    // Tech implant/face marking
    ctx.fillStyle = colors.accent;
    ctx.fillRect(centerX + 25, headY + 42, 2, 12);
    ctx.fillRect(centerX + 25, headY + 40, 6, 2);
  };

  // Draw accessories based on character and type
  const drawAccessory = (ctx, size, gender, accessory, colors, qrY) => {
    const centerX = size / 2;
    const headY = qrY - 90;

    if (accessory === 'none') return;

    switch (accessory) {
      case 'cigar':
        drawCigar(ctx, centerX, headY, gender, colors);
        break;
      case 'bible':
        drawBible(ctx, centerX, size, gender, colors);
        break;
      case 'wine':
        drawWineGlass(ctx, centerX, size, gender, colors);
        break;
      case 'controller':
        drawGameController(ctx, centerX, size, gender, colors);
        break;
      case 'microphone':
        drawMicrophone(ctx, centerX, headY, gender, colors);
        break;
      case 'palette':
        drawArtistPalette(ctx, centerX, size, gender, colors);
        break;
      default:
        break;
    }
  };

  const drawCigar = (ctx, centerX, headY, gender, colors) => {
    // Position in mouth (bigger and more visible)
    const mouthY = headY + 58;
    const cigarX = centerX + 12;
    
    // Cigar body (brown) - thicker
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(cigarX, mouthY, 28, 6);
    
    // Cigar tip (darker)
    ctx.fillStyle = '#654321';
    ctx.fillRect(cigarX + 28, mouthY, 4, 6);
    
    // Glowing ember (bigger)
    ctx.shadowColor = '#FF6600';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#FF4500';
    ctx.fillRect(cigarX + 29, mouthY + 1, 3, 4);
    ctx.shadowBlur = 0;
    
    // Smoke (more visible)
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#CCCCCC';
    ctx.fillRect(cigarX + 32, mouthY - 3, 3, 3);
    ctx.fillRect(cigarX + 35, mouthY - 6, 3, 3);
    ctx.fillRect(cigarX + 38, mouthY - 10, 3, 3);
    ctx.globalAlpha = 1.0;
  };

  const drawBible = (ctx, centerX, size, gender, colors) => {
    // Held in right hand (bigger and more visible)
    const handX = gender === 'male' ? centerX + 85 : centerX + 82;
    const handY = 315;
    
    // Bible book (dark cover) - bigger
    ctx.fillStyle = '#2C1810';
    ctx.fillRect(handX - 8, handY - 32, 24, 32);
    
    // Cross on cover (gold) - bigger
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(handX - 2, handY - 22, 10, 3);
    ctx.fillRect(handX + 1, handY - 26, 4, 12);
    
    // Pages edge (white)
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(handX + 16, handY - 30, 3, 28);
    
    // Highlight
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(handX - 7, handY - 30, 8, 3);
    ctx.globalAlpha = 1.0;
  };

  const drawWineGlass = (ctx, centerX, size, gender, colors) => {
    // Held in left hand (bigger and more visible)
    const handX = gender === 'male' ? centerX - 105 : centerX - 100;
    const handY = 320;
    
    // Glass stem (thicker)
    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(handX + 6, handY - 30, 4, 26);
    
    // Glass base (wider)
    ctx.fillRect(handX + 2, handY - 4, 12, 3);
    
    // Glass bowl (bigger)
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(handX + 1, handY - 42, 14, 12);
    
    // Wine (red) - more wine
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(handX + 2, handY - 38, 12, 8);
    
    // Glass shine (bigger)
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(handX + 3, handY - 40, 4, 5);
    ctx.globalAlpha = 1.0;
  };

  const drawGameController = (ctx, centerX, size, gender, colors) => {
    // Held in front (both hands) - bigger and more visible
    const controllerX = centerX - 30;
    const controllerY = 325;
    
    // Controller body (bigger)
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(controllerX, controllerY, 60, 24);
    
    // D-pad (left side) - bigger
    ctx.fillStyle = colors.primary;
    ctx.fillRect(controllerX + 10, controllerY + 7, 12, 12);
    
    // D-pad cross pattern
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(controllerX + 11, controllerY + 11, 10, 4);
    ctx.fillRect(controllerX + 14, controllerY + 8, 4, 10);
    
    // Buttons (right side) - bigger
    ctx.fillStyle = colors.accent;
    ctx.fillRect(controllerX + 38, controllerY + 7, 5, 5);
    ctx.fillRect(controllerX + 45, controllerY + 7, 5, 5);
    ctx.fillRect(controllerX + 38, controllerY + 14, 5, 5);
    ctx.fillRect(controllerX + 45, controllerY + 14, 5, 5);
    
    // Grips (bigger)
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(controllerX - 6, controllerY + 12, 6, 18);
    ctx.fillRect(controllerX + 60, controllerY + 12, 6, 18);
    
    // Glow effect (more intense)
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(controllerX, controllerY, 60, 24);
    ctx.shadowBlur = 0;
  };

  const drawMicrophone = (ctx, centerX, headY, gender, colors) => {
    // Held near mouth (bigger and more visible)
    const micX = centerX - 40;
    const micY = headY + 50;
    
    // Microphone head (grille) - bigger
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(micX, micY, 18, 24);
    
    // Grille pattern (more detailed)
    ctx.fillStyle = '#2A2A2A';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(micX + 3, micY + 3 + i * 3, 12, 2);
    }
    
    // Microphone handle (thicker)
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(micX + 4, micY + 24, 10, 30);
    
    // Brand ring (accent color) - bigger
    ctx.fillStyle = colors.accent;
    ctx.fillRect(micX + 2, micY + 22, 14, 4);
    
    // Shine on grille (bigger)
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(micX + 3, micY + 3, 6, 10);
    ctx.globalAlpha = 1.0;
    
    // Cable (thicker and more visible)
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(micX + 9, micY + 54);
    ctx.lineTo(micX + 14, micY + 70);
    ctx.stroke();
  };

  const drawArtistPalette = (ctx, centerX, size, gender, colors) => {
    // Palette in right hand, brush in left hand (bigger and more visible)
    const handX = gender === 'male' ? centerX + 85 : centerX + 82;
    const handY = 315;
    
    // Palette shape (wood/tan color) - bigger
    ctx.fillStyle = '#D2B48C';
    ctx.fillRect(handX - 12, handY - 28, 32, 26);
    
    // Thumb hole (bigger)
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(handX + 14, handY - 20, 6, 12);
    
    // Paint spots (various colors) - bigger and more
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(handX - 8, handY - 24, 6, 6);
    
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(handX + 0, handY - 24, 6, 6);
    
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(handX - 8, handY - 16, 6, 6);
    
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(handX + 0, handY - 16, 6, 6);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(handX + 8, handY - 20, 5, 5);
    
    ctx.fillStyle = '#FF00FF';
    ctx.fillRect(handX - 8, handY - 8, 6, 6);
    
    // Brush in left hand (bigger)
    const brushX = gender === 'male' ? centerX - 105 : centerX - 100;
    const brushY = 320;
    
    // Brush handle (thicker)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(brushX + 4, brushY - 38, 5, 32);
    
    // Brush ferrule (metal) - bigger
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(brushX + 3, brushY - 42, 7, 4);
    
    // Brush bristles (bigger)
    ctx.fillStyle = colors.accent;
    ctx.fillRect(brushX + 2, brushY - 48, 9, 6);
  };

  const addGlitchEffects = (ctx, size, colors) => {
    // Random glitch bars (cyberquads aesthetic)
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
      // Load Aquads symbol SVG
      const logo = new Image();
      logo.crossOrigin = 'anonymous'; // Prevent CORS issues
      logo.src = '/AquadsSymbol.svg';
      
      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = () => {
          console.warn('Could not load logo, skipping...');
          resolve(); // Continue without logo if it fails
        };
      });
      
      // Draw white background circle for logo (bigger to fit symbol)
      const bgSize = qrSize * 0.40; // 40% of QR code size
      
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
      
      // Calculate logo size to fill most of the circle (90% of circle diameter)
      const logoSize = bgSize * 0.9;
      
      // Center the logo in the circle
      const logoX = qrX + (qrSize - logoSize) / 2;
      const logoY = qrY + (qrSize - logoSize) / 2;
      
      // Draw logo with high quality - fill the circle
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
      
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
  }, [isOpen, selectedGender, selectedColor, selectedAccessory, referralUrl]);

  const handleDownload = () => {
    if (!qrDataURL) {
      alert('QR code not ready. Please wait for generation to complete.');
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.download = `aquads-cyberquads-qr-${username || 'user'}-${selectedGender}-${selectedColor}-${selectedAccessory}.png`;
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
              <h2 className="text-2xl font-bold text-white mb-1">Cyberquads QR Code Generator</h2>
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

                {/* Accessory Selection */}
                <div>
                  <label className="block text-white font-semibold mb-3">Accessories</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(accessories).map(([key, acc]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedAccessory(key)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedAccessory === key
                            ? 'border-yellow-500 bg-yellow-500/20'
                            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-1">{acc.icon}</div>
                          <span className="text-white text-xs font-medium">{acc.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-blue-400 font-semibold mb-2">✨ About This QR Code</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Unique pixel art cyberquads design</li>
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
                      <p className="text-gray-400">Generating your cyberquads QR code...</p>
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

