import React, { useRef, useState } from 'react';
import { FaDownload, FaCode, FaCopy, FaCheck } from 'react-icons/fa';

// Grade calculation based on trust score
const getGradeInfo = (score) => {
  if (score >= 90) return { 
    grade: 'S', 
    tier: 'Elite', 
    colors: { 
      primary: '#FFD700', 
      secondary: '#FFA500', 
      glow: '#FFD700',
      bg: 'linear-gradient(135deg, #1a1a2e 0%, #2d1f3d 50%, #1a1a2e 100%)',
      accent: '#FFE55C'
    }
  };
  if (score >= 80) return { 
    grade: 'A', 
    tier: 'Expert', 
    colors: { 
      primary: '#3B82F6', 
      secondary: '#1D4ED8', 
      glow: '#60A5FA',
      bg: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      accent: '#93C5FD'
    }
  };
  if (score >= 70) return { 
    grade: 'B+', 
    tier: 'Proficient', 
    colors: { 
      primary: '#14B8A6', 
      secondary: '#0D9488', 
      glow: '#2DD4BF',
      bg: 'linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #0f172a 100%)',
      accent: '#5EEAD4'
    }
  };
  if (score >= 60) return { 
    grade: 'B', 
    tier: 'Competent', 
    colors: { 
      primary: '#22C55E', 
      secondary: '#16A34A', 
      glow: '#4ADE80',
      bg: 'linear-gradient(135deg, #0f172a 0%, #14532d 50%, #0f172a 100%)',
      accent: '#86EFAC'
    }
  };
  if (score >= 50) return { 
    grade: 'C', 
    tier: 'Developing', 
    colors: { 
      primary: '#F59E0B', 
      secondary: '#D97706', 
      glow: '#FBBF24',
      bg: 'linear-gradient(135deg, #0f172a 0%, #451a03 50%, #0f172a 100%)',
      accent: '#FCD34D'
    }
  };
  return { 
    grade: 'D', 
    tier: 'Beginner', 
    colors: { 
      primary: '#6B7280', 
      secondary: '#4B5563', 
      glow: '#9CA3AF',
      bg: 'linear-gradient(135deg, #0f172a 0%, #1f2937 50%, #0f172a 100%)',
      accent: '#D1D5DB'
    }
  };
};

// SVG Badge Component
const BadgeSVG = ({ username, score, size = 'medium', gradeInfo }) => {
  const sizes = {
    small: { width: 150, height: 180, fontSize: 0.75 },
    medium: { width: 200, height: 240, fontSize: 1 },
    large: { width: 300, height: 360, fontSize: 1.5 }
  };
  
  const { width, height, fontSize } = sizes[size] || sizes.medium;
  const { grade, tier, colors } = gradeInfo;
  
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 200 240" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 20px ${colors.glow}40)` }}
    >
      <defs>
        {/* Gradient definitions */}
        <linearGradient id={`bgGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        
        <linearGradient id={`gradeGrad-${score}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>
        
        <linearGradient id={`borderGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="50%" stopColor={colors.accent} />
          <stop offset="100%" stopColor={colors.primary} />
        </linearGradient>
        
        <linearGradient id={`shineGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.1" />
          <stop offset="50%" stopColor="white" stopOpacity="0.05" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Glow filter */}
        <filter id={`glow-${score}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Chain pattern */}
        <pattern id={`chainPattern-${score}`} patternUnits="userSpaceOnUse" width="20" height="20">
          <circle cx="10" cy="10" r="3" fill="none" stroke={colors.primary} strokeWidth="0.5" opacity="0.1"/>
          <line x1="13" y1="10" x2="20" y2="10" stroke={colors.primary} strokeWidth="0.5" opacity="0.1"/>
          <line x1="0" y1="10" x2="7" y2="10" stroke={colors.primary} strokeWidth="0.5" opacity="0.1"/>
        </pattern>

        {/* Clip path for hexagon shape */}
        <clipPath id="hexClip">
          <path d="M100 5 L185 50 L185 190 L100 235 L15 190 L15 50 Z" />
        </clipPath>
      </defs>

      {/* Background with hexagon shape */}
      <path 
        d="M100 5 L185 50 L185 190 L100 235 L15 190 L15 50 Z" 
        fill={`url(#bgGrad-${score})`}
        stroke={`url(#borderGrad-${score})`}
        strokeWidth="3"
      />

      {/* Chain pattern overlay */}
      <path 
        d="M100 5 L185 50 L185 190 L100 235 L15 190 L15 50 Z" 
        fill={`url(#chainPattern-${score})`}
        clipPath="url(#hexClip)"
      />

      {/* Shine effect */}
      <path 
        d="M100 5 L185 50 L185 120 L100 80 L15 120 L15 50 Z" 
        fill={`url(#shineGrad-${score})`}
      />

      {/* Aquads Logo/Text at top */}
      <text 
        x="100" 
        y="45" 
        textAnchor="middle" 
        fill="white" 
        fontFamily="'Segoe UI', Arial, sans-serif" 
        fontSize="16" 
        fontWeight="bold"
        letterSpacing="2"
      >
        AQUADS
      </text>
      
      {/* Decorative line */}
      <line x1="50" y1="55" x2="150" y2="55" stroke={colors.primary} strokeWidth="1" opacity="0.5"/>

      {/* Grade Circle */}
      <circle 
        cx="100" 
        cy="110" 
        r="45" 
        fill="none" 
        stroke={`url(#gradeGrad-${score})`}
        strokeWidth="4"
        filter={`url(#glow-${score})`}
      />
      
      {/* Inner circle */}
      <circle 
        cx="100" 
        cy="110" 
        r="38" 
        fill="#0f172a"
        stroke={colors.primary}
        strokeWidth="1"
        opacity="0.8"
      />

      {/* Grade Letter */}
      <text 
        x="100" 
        y="122" 
        textAnchor="middle" 
        fill={`url(#gradeGrad-${score})`}
        fontFamily="'Segoe UI', Arial, sans-serif" 
        fontSize="36" 
        fontWeight="bold"
        filter={`url(#glow-${score})`}
      >
        {grade}
      </text>

      {/* Tier Label */}
      <rect 
        x="55" 
        y="158" 
        width="90" 
        height="20" 
        rx="10" 
        fill={colors.primary}
        opacity="0.2"
      />
      <text 
        x="100" 
        y="172" 
        textAnchor="middle" 
        fill={colors.accent}
        fontFamily="'Segoe UI', Arial, sans-serif" 
        fontSize="10" 
        fontWeight="600"
        letterSpacing="1"
      >
        {tier.toUpperCase()}
      </text>

      {/* Trust Score */}
      <text 
        x="100" 
        y="195" 
        textAnchor="middle" 
        fill="white"
        fontFamily="'Segoe UI', Arial, sans-serif" 
        fontSize="14" 
        fontWeight="bold"
      >
        {score}
        <tspan fill="#9CA3AF" fontSize="10">/100</tspan>
      </text>

      {/* Verified Badge */}
      <g transform="translate(65, 205)">
        <rect width="70" height="16" rx="8" fill={colors.primary} opacity="0.3"/>
        <circle cx="12" cy="8" r="5" fill={colors.primary}/>
        <path d="M10 8 L11.5 9.5 L14 7" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="22" y="11.5" fill="white" fontFamily="'Segoe UI', Arial, sans-serif" fontSize="8" fontWeight="600">VERIFIED</text>
      </g>

      {/* Username at bottom */}
      <text 
        x="100" 
        y="230" 
        textAnchor="middle" 
        fill="#9CA3AF"
        fontFamily="'Segoe UI', Arial, sans-serif" 
        fontSize="9"
      >
        @{username?.length > 18 ? username.substring(0, 18) + '...' : username}
      </text>

      {/* Base chain indicator */}
      <g transform="translate(170, 220)" opacity="0.6">
        <circle cx="0" cy="0" r="8" fill="#0052FF"/>
        <text x="0" y="3" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">B</text>
      </g>
    </svg>
  );
};

// Main ResumeBadge Component with download functionality
const ResumeBadge = ({ username, score, resumeUrl, showEmbed = true }) => {
  const badgeRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [selectedSize, setSelectedSize] = useState('medium');
  
  const gradeInfo = getGradeInfo(score);
  
  // Download badge as PNG
  const downloadBadge = async () => {
    setDownloading(true);
    try {
      const svgElement = badgeRef.current?.querySelector('svg');
      if (!svgElement) return;

      // Get SVG dimensions
      const sizes = {
        small: { width: 150, height: 180 },
        medium: { width: 200, height: 240 },
        large: { width: 300, height: 360 }
      };
      const { width, height } = sizes[selectedSize];

      // Create a canvas
      const canvas = document.createElement('canvas');
      const scale = 2; // For retina quality
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Create image from SVG
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(svgUrl);

        // Download as PNG
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `aquads-badge-${username}-${gradeInfo.grade}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setDownloading(false);
        }, 'image/png');
      };
      img.onerror = () => {
        console.error('Error loading SVG');
        setDownloading(false);
      };
      img.src = svgUrl;
    } catch (error) {
      console.error('Error downloading badge:', error);
      setDownloading(false);
    }
  };

  // Generate embed code
  const embedCode = `<a href="${resumeUrl}" target="_blank" rel="noopener noreferrer" title="View ${username}'s Verified On-Chain Resume on Aquads">
  <img src="${resumeUrl}/badge.png" alt="${username} - Aquads Verified ${gradeInfo.tier}" width="200" height="240" />
</a>`;

  // Generate markdown
  const markdownCode = `[![${username} - Aquads Verified ${gradeInfo.tier}](${resumeUrl}/badge.png)](${resumeUrl})`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'embed') {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } else {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
        🎖️ Your Credential Badge
        <span className={`text-xs px-2 py-0.5 rounded-full`} style={{ 
          backgroundColor: `${gradeInfo.colors.primary}20`, 
          color: gradeInfo.colors.accent 
        }}>
          Grade {gradeInfo.grade}
        </span>
      </h4>
      
      {/* Badge Preview */}
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
        {/* Badge Display */}
        <div className="flex flex-col items-center">
          <div 
            ref={badgeRef} 
            className="mb-4 transition-transform hover:scale-105"
            style={{ filter: `drop-shadow(0 0 30px ${gradeInfo.colors.glow}30)` }}
          >
            <BadgeSVG 
              username={username} 
              score={score} 
              size={selectedSize}
              gradeInfo={gradeInfo}
            />
          </div>
          
          {/* Size selector */}
          <div className="flex gap-2 mb-4">
            {['small', 'medium', 'large'].map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  selectedSize === size 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Download Button */}
          <button
            onClick={downloadBadge}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-semibold transition-all disabled:opacity-50"
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Generating...
              </>
            ) : (
              <>
                <FaDownload /> Download PNG
              </>
            )}
          </button>
        </div>

        {/* Embed Codes */}
        {showEmbed && (
          <div className="flex-1 w-full space-y-4">
            <p className="text-sm text-gray-400">
              Add this badge to your portfolio, LinkedIn, GitHub README, or anywhere else to showcase your verified credentials!
            </p>
            
            {/* HTML Embed */}
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-2 mb-1">
                <FaCode /> HTML Embed Code
              </label>
              <div className="relative">
                <pre className="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">
                  {embedCode}
                </pre>
                <button
                  onClick={() => copyToClipboard(embedCode, 'embed')}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  {copiedEmbed ? <FaCheck className="text-green-400" /> : <FaCopy />}
                </button>
              </div>
            </div>

            {/* Markdown */}
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-2 mb-1">
                📝 Markdown (GitHub, etc.)
              </label>
              <div className="relative">
                <pre className="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">
                  {markdownCode}
                </pre>
                <button
                  onClick={() => copyToClipboard(markdownCode, 'markdown')}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  {copiedMarkdown ? <FaCheck className="text-green-400" /> : <FaCopy />}
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-300">
                💡 <strong>Tip:</strong> The badge links to your public resume page where employers can verify your on-chain credentials instantly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export both components
export { BadgeSVG, getGradeInfo };
export default ResumeBadge;

