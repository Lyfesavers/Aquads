import React from 'react';

const RiskGaugeImprovement = ({ 
  seller, 
  service, 
  completionRate = null, 
  currentUser = null,
  showForOwner = false // Show improvement suggestions for service owner
}) => {
  // Only show if this is the current user's service or if explicitly requested
  const shouldShow = showForOwner || (currentUser && seller && currentUser._id === seller._id);
  
  if (!shouldShow) return null;

  // Calculate current score and missing points (reusing RiskGauge logic)
  const calculateImprovements = () => {
    let currentScore = 0;
    let maxPossibleScore = 100; // Total possible points
    let improvements = [];

    // Factor 1: Service Rating (50% weight)
    const rating = service?.rating || 0;
    const reviewCount = service?.reviews || 0;
    const ratingWeight = 50;
    let ratingScore = 0;
    
    if (reviewCount === 0) {
      ratingScore = 0;
      improvements.push({
        category: 'Service Rating',
        current: 0,
        needed: ratingWeight,
        description: 'Get your first customer review',
        actionItems: [
          'Complete your first booking successfully',
          'Follow up with customers to request reviews',
          'Provide excellent service to earn 4.8+ star ratings'
        ],
        priority: 'high',
        impact: 'High - Worth 50 points'
      });
    } else if (rating < 4.8) {
      if (rating >= 4.5) {
        ratingScore = ratingWeight * 0.8;
        improvements.push({
          category: 'Service Rating',
          current: Math.round(ratingScore),
          needed: ratingWeight - ratingScore,
          description: `Improve rating from ${rating.toFixed(1)} to 4.8+ stars`,
          actionItems: [
            'Focus on exceeding customer expectations',
            'Communicate clearly and professionally',
            'Deliver work on time and as specified',
            'Ask satisfied customers for updated reviews'
          ],
          priority: 'medium',
          impact: `Medium - Gain ${Math.round(ratingWeight - ratingScore)} points`
        });
      } else if (rating >= 4.0) {
        ratingScore = ratingWeight * 0.6;
        improvements.push({
          category: 'Service Rating',
          current: Math.round(ratingScore),
          needed: ratingWeight - ratingScore,
          description: `Improve rating from ${rating.toFixed(1)} to 4.8+ stars`,
          actionItems: [
            'Review customer feedback and address common issues',
            'Improve service quality and delivery time',
            'Enhance communication with customers',
            'Consider revising your service offerings'
          ],
          priority: 'high',
          impact: `High - Gain ${Math.round(ratingWeight - ratingScore)} points`
        });
      } else {
        ratingScore = rating >= 3.5 ? ratingWeight * 0.3 : ratingWeight * 0.1;
        improvements.push({
          category: 'Service Rating',
          current: Math.round(ratingScore),
          needed: ratingWeight - ratingScore,
          description: `Significantly improve rating from ${rating.toFixed(1)} to 4.8+ stars`,
          actionItems: [
            'Analyze all negative feedback carefully',
            'Consider restructuring your service approach',
            'Focus on under-promising and over-delivering',
            'Get additional training or skills if needed'
          ],
          priority: 'critical',
          impact: `Critical - Gain ${Math.round(ratingWeight - ratingScore)} points`
        });
      }
    } else {
      ratingScore = ratingWeight;
    }
    currentScore += ratingScore;

    // Factor 2: Completion Rate (30% weight)
    const completionWeight = 30;
    let completionScore = 0;
    
    if (completionRate === null) {
      completionScore = completionWeight * 0.2;
      improvements.push({
        category: 'Completion Rate',
        current: Math.round(completionScore),
        needed: completionWeight - completionScore,
        description: 'Establish booking history',
        actionItems: [
          'Complete your first few bookings successfully',
          'Focus on building a track record of reliability',
          'Always deliver what you promise'
        ],
        priority: 'high',
        impact: `High - Gain ${Math.round(completionWeight - completionScore)} points`
      });
    } else if (completionRate < 95) {
      if (completionRate >= 85) {
        completionScore = completionWeight * 0.8;
      } else if (completionRate >= 75) {
        completionScore = completionWeight * 0.6;
      } else if (completionRate >= 65) {
        completionScore = completionWeight * 0.3;
      } else {
        completionScore = completionWeight * 0.1;
      }
      
      improvements.push({
        category: 'Completion Rate',
        current: Math.round(completionScore),
        needed: completionWeight - completionScore,
        description: `Improve completion rate from ${completionRate}% to 95%+`,
        actionItems: [
          'Only accept bookings you can realistically complete',
          'Communicate proactively if issues arise',
          'Set realistic deadlines and stick to them',
          'Have backup plans for unexpected situations'
        ],
        priority: completionRate < 75 ? 'critical' : 'high',
        impact: `${completionRate < 75 ? 'Critical' : 'High'} - Gain ${Math.round(completionWeight - completionScore)} points`
      });
    } else {
      completionScore = completionWeight;
    }
    currentScore += completionScore;

    // Factor 3: CV/Profile Completeness (10% weight)
    const cvWeight = 10;
    const hasCV = seller?.cv && (
      seller.cv.fullName || 
      seller.cv.summary || 
      (seller.cv.experience && seller.cv.experience.length > 0) ||
      (seller.cv.education && seller.cv.education.length > 0) ||
      (seller.cv.skills && seller.cv.skills.length > 0)
    );
    
    if (!hasCV) {
      improvements.push({
        category: 'Profile Completeness',
        current: 0,
        needed: cvWeight,
        description: 'Complete your CV/profile',
        actionItems: [
          'Add your full name and professional summary',
          'List your work experience and achievements',
          'Include your education background',
          'Add relevant skills and expertise',
          'Upload a professional profile photo'
        ],
        priority: 'medium',
        impact: `Medium - Gain ${cvWeight} points`
      });
    } else {
      currentScore += cvWeight;
    }

    // Factor 4: Account Verification (5% weight)
    const verificationWeight = 5;
    let verificationScore = 0;
    let missingVerification = [];
    
    if (seller?.userType !== 'freelancer') {
      missingVerification.push('Set account type to freelancer');
    } else {
      verificationScore += verificationWeight * 0.5;
    }
    
    if (!service?.isPremium) {
      missingVerification.push('Upgrade to premium service');
    } else {
      verificationScore += verificationWeight * 0.5;
    }
    
    if (missingVerification.length > 0) {
      improvements.push({
        category: 'Account Verification',
        current: Math.round(verificationScore),
        needed: verificationWeight - verificationScore,
        description: 'Complete account verification',
        actionItems: missingVerification,
        priority: 'low',
        impact: `Low - Gain ${Math.round(verificationWeight - verificationScore)} points`
      });
    } else {
      currentScore += verificationWeight;
    }

    // Factor 5: Skill Badges (5% weight)
    const skillWeight = 5;
    const skillBadges = seller?.skillBadges || [];
    let skillScore = 0;
    
    if (skillBadges.length < 3) {
      if (skillBadges.length >= 1) {
        skillScore = skillWeight * 0.5;
      }
      
      improvements.push({
        category: 'Skill Badges',
        current: Math.round(skillScore),
        needed: skillWeight - skillScore,
        description: `Earn ${3 - skillBadges.length} more skill badge${3 - skillBadges.length === 1 ? '' : 's'}`,
        actionItems: [
          'Take skill tests in your area of expertise',
          'Complete available certification programs',
          'Demonstrate your abilities through tests',
          `Current: ${skillBadges.length}/3 badges needed`
        ],
        priority: 'low',
        impact: `Low - Gain ${Math.round(skillWeight - skillScore)} points`
      });
    } else {
      skillScore = skillWeight;
      currentScore += skillWeight;
    }

    const currentPercentage = Math.round(currentScore);
    const pointsNeeded = 85 - currentPercentage;

    return {
      currentScore: currentPercentage,
      targetScore: 85,
      pointsNeeded: Math.max(0, pointsNeeded),
      improvements: improvements.sort((a, b) => {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      isAlreadySafe: currentPercentage >= 85
    };
  };

  const analysis = calculateImprovements();

  if (analysis.isAlreadySafe) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-green-800">Congratulations!</h3>
            <p className="text-green-600">Your service has achieved "Safe to Book" status with {analysis.currentScore}% score.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Improve Your Service Score
        </h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-blue-600">Current Score: <strong>{analysis.currentScore}%</strong></span>
          <span className="text-blue-600">Target: <strong>85% (Safe to Book)</strong></span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-3">
          <div 
            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(analysis.currentScore / 85) * 100}%` }}
          ></div>
        </div>
        <p className="text-blue-600 mt-2">
          You need <strong>{analysis.pointsNeeded} more points</strong> to reach "Safe to Book" status.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-blue-800">Recommended Improvements:</h4>
        {analysis.improvements.map((improvement, index) => (
          <div 
            key={index} 
            className={`border rounded-lg p-3 ${
              improvement.priority === 'critical' ? 'border-red-300 bg-red-50' :
              improvement.priority === 'high' ? 'border-orange-300 bg-orange-50' :
              improvement.priority === 'medium' ? 'border-yellow-300 bg-yellow-50' :
              'border-gray-300 bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h5 className={`font-semibold ${
                  improvement.priority === 'critical' ? 'text-red-800' :
                  improvement.priority === 'high' ? 'text-orange-800' :
                  improvement.priority === 'medium' ? 'text-yellow-800' :
                  'text-gray-800'
                }`}>
                  {improvement.category}
                </h5>
                <p className={`text-sm ${
                  improvement.priority === 'critical' ? 'text-red-600' :
                  improvement.priority === 'high' ? 'text-orange-600' :
                  improvement.priority === 'medium' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {improvement.description}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  improvement.priority === 'critical' ? 'text-red-700' :
                  improvement.priority === 'high' ? 'text-orange-700' :
                  improvement.priority === 'medium' ? 'text-yellow-700' :
                  'text-gray-700'
                }`}>
                  +{Math.round(improvement.needed)} pts
                </div>
                <div className="text-xs text-gray-500">
                  {improvement.impact}
                </div>
              </div>
            </div>
            
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-700 mb-1">Action Items:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                {improvement.actionItems.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>Tip:</strong> Focus on high-priority improvements first for the biggest impact on your score. 
          Customer reviews and completion rate have the highest weight in the scoring system.
        </p>
      </div>
    </div>
  );
};

export default RiskGaugeImprovement;
