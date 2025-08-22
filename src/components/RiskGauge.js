import React from 'react';

const RiskGauge = ({ 
  seller, 
  service, 
  completionRate = null, 
  size = 'normal',
  showLabel = true,
  showTooltip = true 
}) => {
  // Calculate overall risk score with stricter weighting
  const calculateRiskScore = () => {
    let totalScore = 0;
    let maxPossibleScore = 0;
    let factors = [];

    // Factor 1: Service Rating (50% weight - INCREASED from 40%)
    const rating = service?.rating || 0;
    const reviewCount = service?.reviews || 0;
    const ratingWeight = 50;
    maxPossibleScore += ratingWeight;
    
    if (reviewCount === 0) {
      totalScore += 0;
      factors.push({ factor: 'No reviews yet', impact: 'negative', points: 0, maxPoints: ratingWeight });
    } else if (rating >= 4.8) { // STRICTER: was 4.5
      totalScore += ratingWeight;
      factors.push({ factor: `Excellent rating (${rating.toFixed(1)}/5)`, impact: 'positive', points: ratingWeight, maxPoints: ratingWeight });
    } else if (rating >= 4.5) { // STRICTER: was 4.0
      totalScore += ratingWeight * 0.8;
      factors.push({ factor: `Good rating (${rating.toFixed(1)}/5)`, impact: 'positive', points: ratingWeight * 0.8, maxPoints: ratingWeight });
    } else if (rating >= 4.0) { // STRICTER: was 3.5
      totalScore += ratingWeight * 0.6;
      factors.push({ factor: `Fair rating (${rating.toFixed(1)}/5)`, impact: 'neutral', points: ratingWeight * 0.6, maxPoints: ratingWeight });
    } else if (rating >= 3.5) { // STRICTER: was 3.0
      totalScore += ratingWeight * 0.3;
      factors.push({ factor: `Below average rating (${rating.toFixed(1)}/5)`, impact: 'negative', points: ratingWeight * 0.3, maxPoints: ratingWeight });
    } else {
      totalScore += ratingWeight * 0.1;
      factors.push({ factor: `Low rating (${rating.toFixed(1)}/5)`, impact: 'negative', points: ratingWeight * 0.1, maxPoints: ratingWeight });
    }

    // Factor 2: Completion Rate (30% weight - INCREASED from 25%)
    const completionWeight = 30;
    maxPossibleScore += completionWeight;
    
    if (completionRate !== null) {
      if (completionRate >= 95) { // STRICTER: was 90
        totalScore += completionWeight;
        factors.push({ factor: `Excellent completion rate (${completionRate}%)`, impact: 'positive', points: completionWeight, maxPoints: completionWeight });
      } else if (completionRate >= 85) { // STRICTER: was 80
        totalScore += completionWeight * 0.8;
        factors.push({ factor: `Good completion rate (${completionRate}%)`, impact: 'positive', points: completionWeight * 0.8, maxPoints: completionWeight });
      } else if (completionRate >= 75) { // STRICTER: was 70
        totalScore += completionWeight * 0.6;
        factors.push({ factor: `Fair completion rate (${completionRate}%)`, impact: 'neutral', points: completionWeight * 0.6, maxPoints: completionWeight });
      } else if (completionRate >= 65) { // STRICTER: was 60
        totalScore += completionWeight * 0.3;
        factors.push({ factor: `Low completion rate (${completionRate}%)`, impact: 'negative', points: completionWeight * 0.3, maxPoints: completionWeight });
      } else {
        totalScore += completionWeight * 0.1;
        factors.push({ factor: `Very low completion rate (${completionRate}%)`, impact: 'negative', points: completionWeight * 0.1, maxPoints: completionWeight });
      }
    } else {
      // No booking history - penalized more heavily
      totalScore += completionWeight * 0.2; // REDUCED from 0.5
      factors.push({ factor: 'No booking history', impact: 'negative', points: completionWeight * 0.2, maxPoints: completionWeight });
    }

    // Factor 3: CV/Profile Completeness (10% weight - REDUCED from 15%)
    const cvWeight = 10;
    maxPossibleScore += cvWeight;
    
    const hasCV = seller?.cv && (
      seller.cv.fullName || 
      seller.cv.summary || 
      (seller.cv.experience && seller.cv.experience.length > 0) ||
      (seller.cv.education && seller.cv.education.length > 0) ||
      (seller.cv.skills && seller.cv.skills.length > 0)
    );
    
    if (hasCV) {
      totalScore += cvWeight;
      factors.push({ factor: 'Complete profile with CV', impact: 'positive', points: cvWeight, maxPoints: cvWeight });
    } else {
      factors.push({ factor: 'No CV/incomplete profile', impact: 'negative', points: 0, maxPoints: cvWeight });
    }

    // Factor 4: Account Verification (5% weight - REDUCED from 10%)
    const verificationWeight = 5;
    maxPossibleScore += verificationWeight;
    let verificationScore = 0;
    
    if (seller?.userType === 'freelancer') {
      verificationScore += verificationWeight * 0.5;
    }
    
    if (service?.isPremium) {
      verificationScore += verificationWeight * 0.5;
    }
    
    totalScore += verificationScore;
    if (verificationScore === verificationWeight) {
      factors.push({ factor: 'Fully verified account', impact: 'positive', points: verificationScore, maxPoints: verificationWeight });
    } else if (verificationScore > 0) {
      factors.push({ factor: 'Partially verified account', impact: 'neutral', points: verificationScore, maxPoints: verificationWeight });
    } else {
      factors.push({ factor: 'Unverified account', impact: 'negative', points: 0, maxPoints: verificationWeight });
    }

    // Factor 5: Skill Badges (5% weight - REDUCED from 10%)
    const skillWeight = 5;
    maxPossibleScore += skillWeight;
    
    const skillBadges = seller?.skillBadges || [];
    if (skillBadges.length >= 3) {
      totalScore += skillWeight;
      factors.push({ factor: `${skillBadges.length} skill badges earned`, impact: 'positive', points: skillWeight, maxPoints: skillWeight });
    } else if (skillBadges.length >= 1) {
      totalScore += skillWeight * 0.5;
      factors.push({ factor: `${skillBadges.length} skill badge(s) earned`, impact: 'neutral', points: skillWeight * 0.5, maxPoints: skillWeight });
    } else {
      factors.push({ factor: 'No skill badges', impact: 'negative', points: 0, maxPoints: skillWeight });
    }

    // Calculate percentage score
    const percentageScore = Math.round((totalScore / maxPossibleScore) * 100);
    
    return { score: percentageScore, factors, totalScore, maxPossibleScore };
  };

  const { score, factors } = calculateRiskScore();

  // Determine risk level and gauge zones - STRICTER THRESHOLDS
  const getRiskLevel = (score) => {
    if (score >= 85) return { // INCREASED from 80
      level: 'safe', 
      color: '#22c55e', 
      label: 'Safe to Book',
      zone: 'safe'
    };
    if (score >= 70) return { // INCREASED from 60
      level: 'moderate', 
      color: '#eab308', 
      label: 'Moderate Risk',
      zone: 'moderate'
    };
    if (score >= 50) return { // INCREASED from 40
      level: 'risky', 
      color: '#f97316', 
      label: 'Risky',
      zone: 'risky'
    };
    return { 
      level: 'unproven', 
      color: '#ef4444', 
      label: 'Unproven',
      zone: 'unproven'
    };
  };

  const risk = getRiskLevel(score);

  // Size configurations
  const sizes = {
    compact: {
      container: 'w-20 h-10',
      gauge: 80,
      needle: 1.5,
      text: 'text-xs',
      tooltip: 'text-xs',
      labelOffset: 12,
      showZoneLabels: false
    },
    small: {
      container: 'w-24 h-12',
      gauge: 96,
      needle: 2,
      text: 'text-xs',
      tooltip: 'text-xs',
      labelOffset: 14,
      showZoneLabels: false
    },
    normal: {
      container: 'w-32 h-16',
      gauge: 128,
      needle: 2.5,
      text: 'text-sm',
      tooltip: 'text-sm',
      labelOffset: 18,
      showZoneLabels: true
    },
    large: {
      container: 'w-40 h-20',
      gauge: 160,
      needle: 3,
      text: 'text-base',
      tooltip: 'text-base',
      labelOffset: 22,
      showZoneLabels: true
    }
  };

  const sizeConfig = sizes[size] || sizes.normal;

  // Calculate needle angle (180 degrees total, from left to right)
  const needleAngle = (score / 100) * 180 - 90; // -90 to 90 degrees

  // Create the gauge SVG
  const createGaugeSVG = () => {
    const radius = sizeConfig.gauge / 2 - 10;
    const centerX = sizeConfig.gauge / 2;
    const centerY = sizeConfig.gauge / 2;
    
    // Create arc paths for different zones with STRICTER boundaries
    const createArc = (startAngle, endAngle) => {
      const start = (startAngle * Math.PI) / 180;
      const end = (endAngle * Math.PI) / 180;
      
      const x1 = centerX + radius * Math.cos(start);
      const y1 = centerY + radius * Math.sin(start);
      const x2 = centerX + radius * Math.cos(end);
      const y2 = centerY + radius * Math.sin(end);
      
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      
      return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
    };

    const strokeWidth = Math.max(3, sizeConfig.gauge / 32);
    const centerDotRadius = Math.max(2, sizeConfig.gauge / 64);

    return (
      <svg width={sizeConfig.gauge} height={sizeConfig.gauge / 2 + 15} className="overflow-visible">
        {/* Background arc */}
        <path
          d={createArc(180, 360)}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Colored zones with stricter boundaries */}
        {/* Unproven zone (0-50%) */}
        <path
          d={createArc(180, 180 + (50 * 180) / 100)}
          fill="none"
          stroke="#ef4444"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Risky zone (50-70%) */}
        <path
          d={createArc(180 + (50 * 180) / 100, 180 + (70 * 180) / 100)}
          fill="none"
          stroke="#f97316"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Moderate zone (70-85%) */}
        <path
          d={createArc(180 + (70 * 180) / 100, 180 + (85 * 180) / 100)}
          fill="none"
          stroke="#eab308"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Safe zone (85-100%) */}
        <path
          d={createArc(180 + (85 * 180) / 100, 360)}
          fill="none"
          stroke="#22c55e"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={centerDotRadius}
          fill="#6b7280"
        />
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={centerX + (radius - strokeWidth) * Math.cos((needleAngle * Math.PI) / 180)}
          y2={centerY + (radius - strokeWidth) * Math.sin((needleAngle * Math.PI) / 180)}
          stroke={risk.color}
          strokeWidth={sizeConfig.needle}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        
        {/* Zone labels - only show for normal and large sizes */}
        {sizeConfig.showZoneLabels && (
          <>
            <text
              x={centerX - radius + 10}
              y={centerY + sizeConfig.labelOffset}
              fill="#ef4444"
              fontSize="9"
              fontWeight="bold"
              textAnchor="start"
            >
              Unproven
            </text>
            
            <text
              x={centerX + radius - 10}
              y={centerY + sizeConfig.labelOffset}
              fill="#22c55e"
              fontSize="9"
              fontWeight="bold"
              textAnchor="end"
            >
              Safe
            </text>
          </>
        )}
      </svg>
    );
  };

  return (
    <div className={`relative group flex flex-col items-center ${sizeConfig.container}`}>
      {/* RPM-style Gauge */}
      {createGaugeSVG()}
      
      {/* Score and Label */}
      {showLabel && (
        <div className="text-center mt-1">
          <div className={`${sizeConfig.text} font-bold`} style={{ color: risk.color }}>
            {score}%
          </div>
          <div className={`${sizeConfig.text} font-medium text-gray-400`}>
            {risk.label}
          </div>
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className={`bg-gray-900 text-white ${sizeConfig.tooltip} rounded-lg p-3 shadow-lg w-64`}>
            <div className="font-semibold mb-2 text-center">
              Risk Assessment: {score}%
            </div>
            <div className="text-center mb-3" style={{ color: risk.color }}>
              <strong>{risk.label}</strong>
            </div>
            <div className="space-y-1">
              {factors.map((factor, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className={`flex-1 ${
                    factor.impact === 'positive' ? 'text-green-400' :
                    factor.impact === 'negative' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {factor.factor}
                  </span>
                  <span className="ml-2 text-gray-300">
                    {Math.round(factor.points)}/{factor.maxPoints}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
              Stricter scoring focuses on reviews & completion rates to encourage legitimate freelancers
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

export default RiskGauge;
