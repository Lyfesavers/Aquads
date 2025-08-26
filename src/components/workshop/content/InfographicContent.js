import React, { useState, useEffect } from 'react';
import { 
  FaCheck, FaChartLine, FaStar, FaUsers, FaBrain, FaCalculator,
  FaArrowUp, FaArrowDown, FaTrophy, FaShield, FaCoins, FaEye
} from 'react-icons/fa';

const InfographicContent = ({ section, sectionIndex, onComplete, isCompleted }) => {
  const [animatedValues, setAnimatedValues] = useState({});
  const [viewedSections, setViewedSections] = useState({});

  const getInfographicConfig = (contentType) => {
    switch (contentType) {
      case 'trust-calculator':
        return {
          title: 'Trust Score Algorithm Breakdown',
          description: 'Understand how clients evaluate freelancer credibility on Aquads',
          type: 'calculator',
          factors: [
            {
              name: 'Service Rating',
              weight: 50,
              icon: FaStar,
              color: 'text-yellow-400',
              bgColor: 'bg-yellow-400/20',
              ranges: [
                { min: 4.8, max: 5.0, score: 50, label: 'Exceptional (4.8-5.0)' },
                { min: 4.5, max: 4.7, score: 40, label: 'Excellent (4.5-4.7)' },
                { min: 4.0, max: 4.4, score: 30, label: 'Good (4.0-4.4)' },
                { min: 3.5, max: 3.9, score: 15, label: 'Fair (3.5-3.9)' },
                { min: 0, max: 3.4, score: 5, label: 'Poor (Below 3.5)' }
              ]
            },
            {
              name: 'Completion Rate',
              weight: 30,
              icon: FaCheck,
              color: 'text-green-400',
              bgColor: 'bg-green-400/20',
              ranges: [
                { min: 95, max: 100, score: 30, label: 'Outstanding (95%+)' },
                { min: 85, max: 94, score: 24, label: 'Great (85-94%)' },
                { min: 75, max: 84, score: 18, label: 'Good (75-84%)' },
                { min: 65, max: 74, score: 9, label: 'Needs Improvement (65-74%)' },
                { min: 0, max: 64, score: 3, label: 'Poor (Below 65%)' }
              ]
            },
            {
              name: 'Profile Completeness',
              weight: 10,
              icon: FaUsers,
              color: 'text-blue-400',
              bgColor: 'bg-blue-400/20',
              description: 'CV, portfolio, experience details'
            },
            {
              name: 'Account Verification',
              weight: 5,
              icon: FaShield,
              color: 'text-purple-400',
              bgColor: 'bg-purple-400/20',
              description: 'Premium status, freelancer badge'
            },
            {
              name: 'Skill Badges',
              weight: 5,
              icon: FaTrophy,
              color: 'text-orange-400',
              bgColor: 'bg-orange-400/20',
              description: 'Certified skill test completions'
            }
          ]
        };

      case 'pricing-guide':
        return {
          title: 'Web3 Freelancer Pricing Psychology',
          description: 'Data-driven insights on how to price your services competitively',
          type: 'pricing',
          categories: [
            {
              name: 'Smart Contract Development',
              hourlyRange: '$100-250',
              projectRange: '$5k-50k',
              demand: 95,
              competition: 'Medium',
              tips: ['Highlight security expertise', 'Showcase gas optimization', 'Mention audit experience']
            },
            {
              name: 'Security Auditing',
              hourlyRange: '$150-300',
              projectRange: '$10k-100k',
              demand: 90,
              competition: 'Low',
              tips: ['Emphasize vulnerability findings', 'Show certification credentials', 'Demonstrate tool expertise']
            },
            {
              name: 'DeFi Strategy',
              hourlyRange: '$125-200',
              projectRange: '$8k-40k',
              demand: 85,
              competition: 'Medium',
              tips: ['Quantify ROI improvements', 'Show protocol knowledge', 'Highlight risk management']
            },
            {
              name: 'Marketing & Community',
              hourlyRange: '$50-120',
              projectRange: '$3k-25k',
              demand: 80,
              competition: 'High',
              tips: ['Show growth metrics', 'Demonstrate Web3 knowledge', 'Highlight campaign results']
            }
          ]
        };

      case 'token-system':
        return {
          title: 'Token Economy Deep Dive',
          description: 'Master the lead unlocking system for maximum ROI',
          type: 'token-flow',
          flow: [
            {
              step: 1,
              title: 'Client Posts Project',
              description: 'Potential client discovers your service and submits booking request',
              icon: FaUsers,
              color: 'from-blue-500 to-purple-600'
            },
            {
              step: 2,
              title: 'Lead Notification',
              description: 'You receive notification but contact details are hidden until unlocked',
              icon: FaEye,
              color: 'from-purple-500 to-pink-600'
            },
            {
              step: 3,
              title: 'Evaluate Opportunity',
              description: 'Review project details, budget, and timeline to assess fit',
              icon: FaBrain,
              color: 'from-pink-500 to-red-600'
            },
            {
              step: 4,
              title: 'Unlock with 2 Tokens',
              description: 'Spend tokens to reveal client contact info and project details',
              icon: FaCoins,
              color: 'from-yellow-500 to-orange-600'
            },
            {
              step: 5,
              title: 'Direct Client Contact',
              description: 'Reach out directly to discuss project and negotiate terms',
              icon: FaCheck,
              color: 'from-green-500 to-teal-600'
            }
          ],
          roi: {
            tokenCost: 2,
            tokenPrice: '$1',
            averageProjectValue: '$3200',
            conversionRate: '35%',
            expectedROI: '560%'
          }
        };

      case 'scaling-guide':
        return {
          title: 'Freelancer Scaling Framework',
          description: 'Your roadmap from solo freelancer to thriving business',
          type: 'timeline',
          phases: [
            {
              phase: 'Foundation',
              duration: 'Month 1-2',
              goals: ['Complete profile', 'First 3 projects', 'Earn 5-star reviews'],
              revenue: '$2k-5k',
              focus: 'Skill building & reputation',
              color: 'from-blue-500 to-purple-600'
            },
            {
              phase: 'Growth',
              duration: 'Month 3-6',
              goals: ['Specialize in niche', 'Raise rates', 'Build portfolio'],
              revenue: '$5k-15k',
              focus: 'Market positioning & premium pricing',
              color: 'from-purple-500 to-pink-600'
            },
            {
              phase: 'Scale',
              duration: 'Month 7-12',
              goals: ['Multiple income streams', 'Thought leadership', 'Premium clients'],
              revenue: '$15k-30k',
              focus: 'Authority building & high-value services',
              color: 'from-pink-500 to-red-600'
            },
            {
              phase: 'Mastery',
              duration: 'Year 2+',
              goals: ['Team building', 'Agency model', 'Passive income'],
              revenue: '$30k+',
              focus: 'Business scaling & automation',
              color: 'from-yellow-500 to-orange-600'
            }
          ]
        };

      default:
        return { title: 'Infographic Content', type: 'default' };
    }
  };

  const config = getInfographicConfig(section.content);

  useEffect(() => {
    // Animate number values on component mount
    const timer = setTimeout(() => {
      setAnimatedValues({
        trustScore: 85,
        completionRate: 92,
        averageRating: 4.8
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const markSectionViewed = (sectionKey) => {
    setViewedSections(prev => ({ ...prev, [sectionKey]: true }));
  };

  const allSectionsViewed = () => {
    const expectedSections = config.factors?.length || config.categories?.length || config.flow?.length || config.phases?.length || 1;
    return Object.keys(viewedSections).length >= expectedSections;
  };

  const handleComplete = () => {
    if (!isCompleted && allSectionsViewed()) {
      onComplete(sectionIndex, section.points);
    }
  };

  const renderTrustCalculator = () => (
    <div className="space-y-6">
      {/* Trust Score Visualization */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 text-center border border-blue-500/30">
        <h3 className="text-2xl font-bold mb-4">Sample Trust Score Calculation</h3>
        <div className="text-6xl font-bold text-blue-400 mb-2">
          {animatedValues.trustScore || 0}
        </div>
        <p className="text-gray-300">Out of 100 points</p>
        <div className="w-full bg-gray-700 rounded-full h-4 mt-4">
          <div 
            className="h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-2000 ease-out"
            style={{ width: `${animatedValues.trustScore || 0}%` }}
          />
        </div>
      </div>

      {/* Factor Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {config.factors.map((factor, index) => {
          const FactorIcon = factor.icon;
          return (
            <div
              key={index}
              className={`
                ${factor.bgColor} rounded-xl p-4 border border-gray-600 cursor-pointer
                transform transition-all duration-300 hover:scale-105
                ${viewedSections[`factor-${index}`] ? 'ring-2 ring-blue-500' : ''}
              `}
              onClick={() => markSectionViewed(`factor-${index}`)}
            >
              <div className="flex items-center gap-3 mb-3">
                <FactorIcon className={`text-xl ${factor.color}`} />
                <h4 className="font-bold">{factor.name}</h4>
              </div>
              <div className="mb-2">
                <span className="text-2xl font-bold">{factor.weight}%</span>
                <span className="text-gray-400 text-sm ml-2">of total score</span>
              </div>
              {factor.ranges && (
                <div className="space-y-1">
                  {factor.ranges.slice(0, 3).map((range, idx) => (
                    <div key={idx} className="text-xs text-gray-400">
                      {range.label}: {range.score}pts
                    </div>
                  ))}
                </div>
              )}
              {factor.description && (
                <p className="text-sm text-gray-400">{factor.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPricingGuide = () => (
    <div className="space-y-6">
      {config.categories.map((category, index) => (
        <div
          key={index}
          className={`
            bg-gray-700/50 rounded-xl p-6 border border-gray-600 cursor-pointer
            transform transition-all duration-300 hover:scale-102
            ${viewedSections[`category-${index}`] ? 'ring-2 ring-green-500' : ''}
          `}
          onClick={() => markSectionViewed(`category-${index}`)}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-xl font-bold mb-2">{category.name}</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-green-400 font-bold">{category.hourlyRange}</span>
                  <span className="text-gray-400 text-sm ml-2">per hour</span>
                </div>
                <div>
                  <span className="text-blue-400 font-bold">{category.projectRange}</span>
                  <span className="text-gray-400 text-sm ml-2">per project</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Market Demand</span>
                <span className="text-yellow-400 font-bold">{category.demand}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Competition</span>
                <span className={`font-bold ${
                  category.competition === 'Low' ? 'text-green-400' :
                  category.competition === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {category.competition}
                </span>
              </div>
            </div>
            
            <div>
              <h5 className="font-bold mb-2 text-purple-400">Pricing Tips:</h5>
              <ul className="space-y-1">
                {category.tips.map((tip, idx) => (
                  <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                    <FaCheck className="text-green-400 text-xs mt-1 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTokenSystem = () => (
    <div className="space-y-6">
      {/* Token Flow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {config.flow.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <div
              key={index}
              className={`
                bg-gradient-to-br ${step.color} rounded-xl p-4 text-center text-white cursor-pointer
                transform transition-all duration-300 hover:scale-105
                ${viewedSections[`step-${index}`] ? 'ring-4 ring-yellow-400' : ''}
              `}
              onClick={() => markSectionViewed(`step-${index}`)}
            >
              <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <StepIcon className="text-xl" />
              </div>
              <div className="bg-white/20 text-sm font-bold px-2 py-1 rounded-full mb-2">
                Step {step.step}
              </div>
              <h4 className="font-bold text-sm mb-2">{step.title}</h4>
              <p className="text-xs opacity-90">{step.description}</p>
            </div>
          );
        })}
      </div>

      {/* ROI Calculator */}
      <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl p-6 border border-green-500/30">
        <h3 className="text-xl font-bold mb-4 text-center">Token Investment ROI</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-yellow-400">{config.roi.tokenCost}</p>
            <p className="text-gray-400 text-sm">Tokens per lead</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{config.roi.tokenPrice}</p>
            <p className="text-gray-400 text-sm">Cost per token</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{config.roi.averageProjectValue}</p>
            <p className="text-gray-400 text-sm">Avg project value</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">{config.roi.conversionRate}</p>
            <p className="text-gray-400 text-sm">Lead conversion</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-400">{config.roi.expectedROI}</p>
            <p className="text-gray-400 text-sm">Expected ROI</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderScalingGuide = () => (
    <div className="space-y-4">
      {config.phases.map((phase, index) => (
        <div
          key={index}
          className={`
            bg-gradient-to-r ${phase.color} p-6 rounded-xl text-white cursor-pointer
            transform transition-all duration-300 hover:scale-102
            ${viewedSections[`phase-${index}`] ? 'ring-4 ring-yellow-400' : ''}
          `}
          onClick={() => markSectionViewed(`phase-${index}`)}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div>
              <h3 className="text-xl font-bold mb-1">{phase.phase}</h3>
              <p className="text-sm opacity-80">{phase.duration}</p>
            </div>
            <div>
              <p className="text-2xl font-bold mb-1">{phase.revenue}</p>
              <p className="text-sm opacity-80">Monthly revenue</p>
            </div>
            <div>
              <p className="font-bold mb-2">Key Goals:</p>
              <ul className="space-y-1">
                {phase.goals.map((goal, idx) => (
                  <li key={idx} className="text-sm flex items-center gap-2">
                    <FaCheck className="text-xs" />
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-bold text-yellow-300">{phase.focus}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">{config.title}</h3>
        <p className="text-gray-400">{config.description}</p>
      </div>

      {/* Render Content Based on Type */}
      {config.type === 'calculator' && renderTrustCalculator()}
      {config.type === 'pricing' && renderPricingGuide()}
      {config.type === 'token-flow' && renderTokenSystem()}
      {config.type === 'timeline' && renderScalingGuide()}

      {/* Completion Button */}
      <div className="text-center mt-8">
        {allSectionsViewed() && !isCompleted ? (
          <button
            onClick={handleComplete}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transform transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <FaCheck className="inline mr-2" />
            Complete Section (+{section.points} points)
          </button>
        ) : isCompleted ? (
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 rounded-xl border border-green-500/50">
            <FaCheck />
            Section Completed! (+{section.points} points earned)
          </div>
        ) : (
          <div className="text-gray-400">
            Click on all sections to complete this infographic
          </div>
        )}
      </div>
    </div>
  );
};

export default InfographicContent;
