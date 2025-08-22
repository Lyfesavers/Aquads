import React from 'react';

const RiskBadge = ({ 
  seller, 
  service, 
  completionRate = null,
  showTooltip = true 
}) => {
  // Calculate overall risk score based on multiple factors
  const calculateRiskScore = () => {
    let totalScore = 0;
    let maxPossibleScore = 0;
    let factors = [];

    // Factor 1: Service Rating (40% weight)
    const rating = service?.rating || 0;
    const reviewCount = service?.reviews || 0;
    const ratingWeight = 40;
    maxPossibleScore += ratingWeight;
    
    if (reviewCount === 0) {
      totalScore += 0;
      factors.push({ factor: 'No reviews yet', impact: 'negative', points: 0, maxPoints: ratingWeight });
    } else if (rating >= 4.5) {
      totalScore += ratingWeight;
      factors.push({ factor: `Excellent rating (${rating.toFixed(1)}/5)`, impact: 'positive', points: ratingWeight, maxPoints: ratingWeight });
    } else if (rating >= 4.0) {
      totalScore += ratingWeight * 0.8;
      factors.push({ factor: `Good rating (${rating.toFixed(1)}/5)`, impact: 'positive', points: ratingWeight * 0.8, maxPoints: ratingWeight });
    } else if (rating >= 3.5) {
      totalScore += ratingWeight * 0.6;
      factors.push({ factor: `Fair rating (${rating.toFixed(1)}/5)`, impact: 'neutral', points: ratingWeight * 0.6, maxPoints: ratingWeight });
    } else if (rating >= 3.0) {
      totalScore += ratingWeight * 0.4;
      factors.push({ factor: `Below average rating (${rating.toFixed(1)}/5)`, impact: 'negative', points: ratingWeight * 0.4, maxPoints: ratingWeight });
    } else {
      totalScore += ratingWeight * 0.2;
      factors.push({ factor: `Low rating (${rating.toFixed(1)}/5)`, impact: 'negative', points: ratingWeight * 0.2, maxPoints: ratingWeight });
    }

    // Factor 2: Completion Rate (25% weight)
    const completionWeight = 25;
    maxPossibleScore += completionWeight;
    
    if (completionRate !== null) {
      if (completionRate >= 90) {
        totalScore += completionWeight;
        factors.push({ factor: `Excellent completion rate (${completionRate}%)`, impact: 'positive', points: completionWeight, maxPoints: completionWeight });
      } else if (completionRate >= 80) {
        totalScore += completionWeight * 0.8;
        factors.push({ factor: `Good completion rate (${completionRate}%)`, impact: 'positive', points: completionWeight * 0.8, maxPoints: completionWeight });
      } else if (completionRate >= 70) {
        totalScore += completionWeight * 0.6;
        factors.push({ factor: `Fair completion rate (${completionRate}%)`, impact: 'neutral', points: completionWeight * 0.6, maxPoints: completionWeight });
      } else if (completionRate >= 60) {
        totalScore += completionWeight * 0.4;
        factors.push({ factor: `Low completion rate (${completionRate}%)`, impact: 'negative', points: completionWeight * 0.4, maxPoints: completionWeight });
      } else {
        totalScore += completionWeight * 0.2;
        factors.push({ factor: `Very low completion rate (${completionRate}%)`, impact: 'negative', points: completionWeight * 0.2, maxPoints: completionWeight });
      }
    } else {
      // No booking history - neutral impact
      totalScore += completionWeight * 0.5;
      factors.push({ factor: 'No booking history', impact: 'neutral', points: completionWeight * 0.5, maxPoints: completionWeight });
    }

    // Factor 3: CV/Profile Completeness (15% weight)
    const cvWeight = 15;
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

    // Factor 4: Account Verification (10% weight)
    const verificationWeight = 10;
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

    // Factor 5: Skill Badges (10% weight)
    const skillWeight = 10;
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

  // Determine risk level and badge appearance
  const getRiskLevel = (score) => {
    if (score >= 80) return { 
      level: 'safe', 
      color: 'bg-green-500/20 text-green-400 border-green-500/30', 
      label: 'Safe',
      dot: 'bg-green-500'
    };
    if (score >= 60) return { 
      level: 'moderate', 
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', 
      label: 'OK',
      dot: 'bg-yellow-500'
    };
    if (score >= 40) return { 
      level: 'risky', 
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', 
      label: 'Risky',
      dot: 'bg-orange-500'
    };
    return { 
      level: 'unproven', 
      color: 'bg-red-500/20 text-red-400 border-red-500/30', 
      label: 'New',
      dot: 'bg-red-500'
    };
  };

  const risk = getRiskLevel(score);

  return (
    <div className="relative group">
      {/* Badge */}
      <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border shadow-lg ${risk.color} transition-all duration-200 hover:scale-105 cursor-help`}>
        <div className={`w-2.5 h-2.5 rounded-full ${risk.dot} mr-2 shadow-sm`}></div>
        <span className="font-bold">{score}%</span>
        <span className="ml-2 font-medium">{risk.label}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg w-64">
            <div className="font-semibold mb-2 text-center">
              Risk Assessment: {score}%
            </div>
            <div className="text-center mb-3" style={{ color: risk.level === 'safe' ? '#22c55e' : risk.level === 'moderate' ? '#eab308' : risk.level === 'risky' ? '#f97316' : '#ef4444' }}>
              <strong>{risk.level === 'safe' ? 'Safe to Book' : risk.level === 'moderate' ? 'Moderate Risk' : risk.level === 'risky' ? 'Risky' : 'Unproven'}</strong>
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
              Overall reliability score based on reviews, completion rate, profile completeness, and verification
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

export default RiskBadge;
