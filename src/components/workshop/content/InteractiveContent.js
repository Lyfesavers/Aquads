import React, { useState } from 'react';
import { 
  FaCheck, FaRocket, FaUsers, FaChartLine, FaDollarSign, 
  FaGlobe, FaShieldAlt, FaCode, FaMegaphone, FaPen, FaLightbulb,
  FaArrowRight, FaStar, FaTrophy, FaEye, FaThumbsUp
} from 'react-icons/fa';

const InteractiveContent = ({ section, sectionIndex, onComplete, isCompleted }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [showResults, setShowResults] = useState(false);

  const getContentConfig = (contentType) => {
    switch (contentType) {
      case 'platform-tour':
        return {
          title: 'Explore the Aquads Ecosystem',
          description: 'Discover all the powerful features that will help you succeed as a Web3 freelancer',
          steps: [
            {
              title: 'Freelancer Marketplace',
              icon: FaUsers,
              content: 'Connect with clients seeking Web3 expertise. Browse active projects and submit proposals.',
              features: ['Service listings', 'Client reviews', 'Secure payments', 'Skill verification'],
              color: 'from-blue-500 to-purple-600'
            },
            {
              title: 'Token Economy',
              icon: FaDollarSign,
              content: 'Unlock premium leads with tokens. Invest in high-value opportunities.',
              features: ['Lead unlocking', 'Token rewards', 'Staking benefits', 'Premium access'],
              color: 'from-green-500 to-teal-600'
            },
            {
              title: 'Skill Testing',
              icon: FaTrophy,
              content: 'Validate your expertise with certified skill tests. Build credibility with badges.',
              features: ['5 test categories', 'Skill badges', 'Trust scores', 'Client confidence'],
              color: 'from-yellow-500 to-orange-600'
            },
            {
              title: 'Community Hub',
              icon: FaGlobe,
              content: 'Join a thriving community of Web3 professionals. Network and collaborate.',
              features: ['Telegram groups', 'Expert networking', 'Knowledge sharing', 'Support system'],
              color: 'from-purple-500 to-pink-600'
            }
          ]
        };

      case 'comparison-chart':
        return {
          title: 'Web3 vs Traditional Freelancing',
          description: 'See why Web3 freelancing offers superior opportunities and earning potential',
          comparison: {
            traditional: {
              title: 'Traditional Freelancing',
              icon: '🏢',
              features: [
                { label: 'Average hourly rate', value: '$25-50', negative: true },
                { label: 'Payment delays', value: '30-60 days', negative: true },
                { label: 'Platform fees', value: '5-20%', negative: true },
                { label: 'Market saturation', value: 'Very High', negative: true },
                { label: 'Skill verification', value: 'Limited', negative: true }
              ]
            },
            web3: {
              title: 'Web3 Freelancing on Aquads',
              icon: '🚀',
              features: [
                { label: 'Average hourly rate', value: '$75-200+', negative: false },
                { label: 'Payment speed', value: 'Instant crypto', negative: false },
                { label: 'Platform fees', value: 'Competitive', negative: false },
                { label: 'Market demand', value: 'Growing rapidly', negative: false },
                { label: 'Skill verification', value: 'Certified badges', negative: false }
              ]
            }
          }
        };

      case 'testimonials':
        return {
          title: 'Success Stories from Our Community',
          description: 'Real freelancers sharing their journey to Web3 success',
          testimonials: [
            {
              name: 'Sarah Chen',
              role: 'Smart Contract Developer',
              avatar: '👩‍💻',
              earnings: '$45,000',
              timeframe: '6 months',
              quote: 'Aquads helped me transition from traditional web dev to Web3. The skill tests gave me credibility, and now I earn 3x more.',
              badges: ['Solidity Expert', 'Security Specialist', 'Top Performer']
            },
            {
              name: 'Marcus Rodriguez',
              role: 'DeFi Marketing Specialist',
              avatar: '👨‍🚀',
              earnings: '$32,000',
              timeframe: '4 months',
              quote: 'The community support is incredible. I went from zero Web3 knowledge to running marketing campaigns for major DeFi protocols.',
              badges: ['Marketing Pro', 'Community Builder', 'Growth Hacker']
            },
            {
              name: 'Emily Thompson',
              role: 'Tokenomics Consultant',
              avatar: '👩‍🔬',
              earnings: '$28,000',
              timeframe: '3 months',
              quote: 'The token unlock system is genius. I only pay for quality leads, which means every client interaction has high potential.',
              badges: ['Token Designer', 'Economics Expert', 'Strategy Master']
            }
          ]
        };

      case 'profile-builder':
        return {
          title: 'Profile Optimization Strategy',
          description: 'Learn the psychology behind profiles that convert visitors into clients',
          sections: [
            {
              title: 'Professional Headline',
              tip: 'Include your niche, years of experience, and key achievement',
              examples: [
                '❌ "Freelancer available for work"',
                '✅ "Senior Solidity Developer | 50+ Smart Contracts Deployed | DeFi Security Expert"'
              ]
            },
            {
              title: 'Value Proposition',
              tip: 'Focus on client benefits, not just your skills',
              examples: [
                '❌ "I know JavaScript and React"',
                '✅ "I help DeFi projects launch faster with bug-free smart contracts and 24/7 support"'
              ]
            },
            {
              title: 'Social Proof Elements',
              tip: 'Showcase achievements, testimonials, and metrics',
              examples: [
                '✅ "Saved clients $2M+ in potential security vulnerabilities"',
                '✅ "100% project completion rate across 47 clients"',
                '✅ "Featured in CoinDesk for innovative tokenomics design"'
              ]
            }
          ]
        };

      case 'categories-explorer':
        return {
          title: 'Service Categories Deep Dive',
          description: 'Choose your specialization based on market demand and earning potential',
          categories: [
            {
              name: 'Smart Contract Development',
              icon: FaCode,
              demand: 95,
              avgRate: '$150/hr',
              skills: ['Solidity', 'Vyper', 'Web3.js', 'Testing'],
              growth: '+340%',
              color: 'from-blue-500 to-purple-600'
            },
            {
              name: 'Security Auditing',
              icon: FaShieldAlt,
              demand: 90,
              avgRate: '$200/hr',
              skills: ['Security analysis', 'Code review', 'Penetration testing'],
              growth: '+280%',
              color: 'from-red-500 to-orange-600'
            },
            {
              name: 'Marketing & PR',
              icon: FaMegaphone,
              demand: 85,
              avgRate: '$75/hr',
              skills: ['Content marketing', 'Community management', 'Social media'],
              growth: '+200%',
              color: 'from-green-500 to-teal-600'
            },
            {
              name: 'Content Writing',
              icon: FaPen,
              demand: 80,
              avgRate: '$50/hr',
              skills: ['Technical writing', 'Whitepaper creation', 'Blog posts'],
              growth: '+150%',
              color: 'from-purple-500 to-pink-600'
            }
          ]
        };

      case 'market-research':
        return {
          title: 'Competitive Analysis Workshop',
          description: 'Research your competition to position yourself strategically',
          steps: [
            {
              title: 'Identify Top Performers',
              action: 'Browse the marketplace and find freelancers in your category with high ratings',
              insights: ['What services do they offer?', 'How do they price their work?', 'What makes them stand out?']
            },
            {
              title: 'Analyze Their Profiles',
              action: 'Study their headlines, descriptions, and portfolio presentations',
              insights: ['What keywords do they use?', 'How do they structure their content?', 'What social proof do they showcase?']
            },
            {
              title: 'Find Your Unique Angle',
              action: 'Identify gaps in the market or ways to differentiate yourself',
              insights: ['What services are underserved?', 'What unique experience do you bring?', 'How can you provide more value?']
            }
          ]
        };

      default:
        return { title: 'Interactive Content', description: 'Engaging learning experience' };
    }
  };

  const config = getContentConfig(section.content);

  const handleStepComplete = (stepIndex) => {
    setSelectedOptions({ ...selectedOptions, [stepIndex]: true });
  };

  const handleSectionComplete = () => {
    if (!isCompleted) {
      onComplete(sectionIndex, section.points);
      setShowResults(true);
    }
  };

  const renderPlatformTour = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {config.steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <div
              key={index}
              className={`
                bg-gradient-to-br ${step.color} p-6 rounded-xl text-white cursor-pointer
                transform transition-all duration-300 hover:scale-105 hover:shadow-2xl
                ${selectedOptions[index] ? 'ring-4 ring-yellow-400' : ''}
              `}
              onClick={() => handleStepComplete(index)}
            >
              <div className="flex items-center gap-3 mb-4">
                <StepIcon className="text-2xl" />
                <h3 className="text-xl font-bold">{step.title}</h3>
              </div>
              <p className="mb-4 opacity-90">{step.content}</p>
              <div className="space-y-2">
                {step.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <FaCheck className="text-sm" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              {selectedOptions[index] && (
                <div className="mt-4 flex items-center gap-2 text-yellow-300">
                  <FaEye /> <span className="text-sm font-medium">Explored!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderComparisonChart = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Traditional Freelancing */}
      <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{config.comparison.traditional.icon}</div>
          <h3 className="text-xl font-bold text-gray-300">{config.comparison.traditional.title}</h3>
        </div>
        <div className="space-y-3">
          {config.comparison.traditional.features.map((feature, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="text-gray-300">{feature.label}</span>
              <span className={`font-bold ${feature.negative ? 'text-red-400' : 'text-green-400'}`}>
                {feature.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Web3 Freelancing */}
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-6 border border-blue-500/30">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{config.comparison.web3.icon}</div>
          <h3 className="text-xl font-bold text-blue-400">{config.comparison.web3.title}</h3>
        </div>
        <div className="space-y-3">
          {config.comparison.web3.features.map((feature, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <span className="text-gray-300">{feature.label}</span>
              <span className="font-bold text-green-400">{feature.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTestimonials = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {config.testimonials.map((testimonial, index) => (
        <div
          key={index}
          className={`
            bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-6 border border-gray-600
            cursor-pointer transform transition-all duration-300 hover:scale-105 hover:border-blue-500/50
            ${selectedOptions[index] ? 'ring-2 ring-blue-500' : ''}
          `}
          onClick={() => handleStepComplete(index)}
        >
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">{testimonial.avatar}</div>
            <h3 className="font-bold text-lg">{testimonial.name}</h3>
            <p className="text-blue-400 text-sm">{testimonial.role}</p>
          </div>
          
          <div className="text-center mb-4">
            <p className="text-2xl font-bold text-green-400">{testimonial.earnings}</p>
            <p className="text-gray-400 text-sm">earned in {testimonial.timeframe}</p>
          </div>

          <blockquote className="text-gray-300 text-sm italic mb-4 text-center">
            "{testimonial.quote}"
          </blockquote>

          <div className="flex flex-wrap gap-1 justify-center">
            {testimonial.badges.map((badge, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                {badge}
              </span>
            ))}
          </div>

          {selectedOptions[index] && (
            <div className="mt-4 text-center">
              <FaThumbsUp className="text-blue-400 mx-auto" />
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const allStepsCompleted = () => {
    const expectedSteps = config.steps?.length || config.testimonials?.length || config.categories?.length || 2;
    return Object.keys(selectedOptions).length >= expectedSteps;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">{config.title}</h3>
        <p className="text-gray-400">{config.description}</p>
      </div>

      {/* Render Content Based on Type */}
      {section.content === 'platform-tour' && renderPlatformTour()}
      {section.content === 'comparison-chart' && renderComparisonChart()}
      {section.content === 'testimonials' && renderTestimonials()}

      {/* Completion Button */}
      <div className="text-center mt-8">
        {allStepsCompleted() && !isCompleted ? (
          <button
            onClick={handleSectionComplete}
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
            Complete all interactions to finish this section
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveContent;
