import React, { useState } from 'react';
import { 
  FaPlay, FaCheck, FaDesktop, FaEye, FaComments, FaHandPointer,
  FaUserGraduate, FaChalkboardTeacher, FaMicrophone, FaVideo,
  FaUsers, FaClock, FaQuestionCircle, FaNotes, FaLightbulb,
  FaRocket, FaTools, FaListAlt, FaSearch
} from 'react-icons/fa';

const LiveDemoPlaceholder = ({ section, sectionIndex, onComplete, isCompleted }) => {
  const [demoWatched, setDemoWatched] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);

  const getDemoConfig = (contentType) => {
    switch (contentType) {
      case 'telegram-setup':
        return {
          title: 'Join the Aquads Community',
          description: 'Connect with thousands of Web3 freelancers and access exclusive opportunities',
          estimatedTime: '10 minutes',
          instructor: {
            action: 'Guide students through Telegram group joining process',
            platform: 'Live screen share to aquads.xyz community page'
          },
          steps: [
            {
              title: 'Navigate to Community Section',
              instruction: 'Show students how to find Telegram links on the platform',
              studentAction: 'Follow along on their own devices',
              icon: FaDesktop
            },
            {
              title: 'Join Main Group',
              instruction: 'Demonstrate joining the main Aquads Telegram group',
              studentAction: 'Click join link and introduce themselves',
              icon: FaUsers
            },
            {
              title: 'Explore Channels',
              instruction: 'Tour of different channels (announcements, jobs, networking)',
              studentAction: 'Subscribe to relevant channels for their interests',
              icon: FaEye
            },
            {
              title: 'First Introduction',
              instruction: 'Help students craft their introduction message',
              studentAction: 'Post introduction in newcomers channel',
              icon: FaComments
            }
          ],
          learningOutcomes: [
            'Access to exclusive job postings',
            'Direct networking with potential clients',
            'Real-time support from community',
            'Updates on platform features'
          ],
          tips: [
            'Use your real name for better networking',
            'Mention your skills in introduction',
            'Be active but not spammy',
            'Help others when you can'
          ]
        };

      case 'cv-creation':
        return {
          title: 'Build Your Professional CV',
          description: 'Create a compelling CV that showcases your Web3 expertise',
          estimatedTime: '25 minutes',
          instructor: {
            action: 'Walk through CV builder interface and best practices',
            platform: 'Live demo of CV creation process on Aquads.xyz'
          },
          steps: [
            {
              title: 'Profile Summary',
              instruction: 'Demonstrate writing an effective professional summary',
              studentAction: 'Write their own summary focusing on Web3 experience',
              icon: FaUserGraduate
            },
            {
              title: 'Skills & Expertise',
              instruction: 'Show how to categorize and present technical skills',
              studentAction: 'List their relevant skills with proficiency levels',
              icon: FaTools
            },
            {
              title: 'Work Experience',
              instruction: 'Format work history to highlight Web3-relevant projects',
              studentAction: 'Add their experience with quantified achievements',
              icon: FaListAlt
            },
            {
              title: 'Portfolio Links',
              instruction: 'Add GitHub, portfolio websites, and project demos',
              studentAction: 'Include links to their best work',
              icon: FaRocket
            }
          ],
          learningOutcomes: [
            'Professional CV that builds trust',
            'Higher client conversion rates',
            'Better project matching',
            'Improved search visibility'
          ],
          tips: [
            'Quantify achievements with numbers',
            'Focus on results, not just tasks',
            'Keep it concise but comprehensive',
            'Update regularly with new projects'
          ]
        };

      case 'skill-tests':
        return {
          title: 'Live Skill Test Demonstration',
          description: 'Take actual skill tests and learn strategies for success',
          estimatedTime: '20 minutes',
          instructor: {
            action: 'Take a skill test live while explaining strategies',
            platform: 'Screen share of actual skill test interface'
          },
          steps: [
            {
              title: 'Test Selection Strategy',
              instruction: 'Show how to choose the most impactful tests first',
              studentAction: 'Identify which tests align with their goals',
              icon: FaSearch
            },
            {
              title: 'Live Test Taking',
              instruction: 'Take an English or Communication test live',
              studentAction: 'Follow along and take notes on strategies',
              icon: FaChalkboardTeacher
            },
            {
              title: 'Results Analysis',
              instruction: 'Review results and show how badges appear on profile',
              studentAction: 'Plan their own test-taking schedule',
              icon: FaLightbulb
            },
            {
              title: 'Badge Integration',
              instruction: 'Demonstrate how badges improve trust scores',
              studentAction: 'Take their first skill test',
              icon: FaNotes
            }
          ],
          learningOutcomes: [
            'Skill test taking strategies',
            'Understanding of badge system',
            'Trust score improvement',
            'Client credibility boost'
          ],
          tips: [
            'Read questions carefully',
            'Take your time - no rush',
            'Focus on practical application',
            'Retake if needed (some tests allow it)'
          ]
        };

      case 'service-creation':
        return {
          title: 'Create Your First Service Listing',
          description: 'Build a service listing that attracts high-paying clients',
          estimatedTime: '30 minutes',
          instructor: {
            action: 'Create a complete service listing from scratch',
            platform: 'Live demo of service creation interface'
          },
          steps: [
            {
              title: 'Service Title Optimization',
              instruction: 'Craft titles that include keywords and value propositions',
              studentAction: 'Write 3 different title options for their service',
              icon: FaRocket
            },
            {
              title: 'Description Writing',
              instruction: 'Structure descriptions to address client pain points',
              studentAction: 'Write their service description following the template',
              icon: FaNotes
            },
            {
              title: 'Pricing Strategy',
              instruction: 'Set competitive pricing based on market research',
              studentAction: 'Research competitors and set their pricing',
              icon: FaSearch
            },
            {
              title: 'Image & Portfolio',
              instruction: 'Add compelling visuals and portfolio samples',
              studentAction: 'Upload their service image and portfolio items',
              icon: FaDesktop
            }
          ],
          learningOutcomes: [
            'Optimized service listing',
            'Competitive pricing strategy',
            'Professional presentation',
            'Higher booking conversion'
          ],
          tips: [
            'Focus on client benefits, not features',
            'Use specific numbers and outcomes',
            'Include FAQ section',
            'Update based on client feedback'
          ]
        };

      case 'client-demo':
        return {
          title: 'Client Communication Masterclass',
          description: 'Handle client interactions like a professional',
          estimatedTime: '20 minutes',
          instructor: {
            action: 'Demonstrate booking management and client communication',
            platform: 'Live walkthrough of booking interface and email templates'
          },
          steps: [
            {
              title: 'Booking Response',
              instruction: 'Show how to respond to booking requests professionally',
              studentAction: 'Practice writing response messages',
              icon: FaComments
            },
            {
              title: 'Scope Clarification',
              instruction: 'Demonstrate asking the right questions upfront',
              studentAction: 'Create their list of clarifying questions',
              icon: FaQuestionCircle
            },
            {
              title: 'Token Unlock Demo',
              instruction: 'Show the lead unlocking process and ROI evaluation',
              studentAction: 'Learn to evaluate lead quality before unlocking',
              icon: FaEye
            },
            {
              title: 'Follow-up Strategy',
              instruction: 'Professional follow-up and relationship building',
              studentAction: 'Draft follow-up templates for different scenarios',
              icon: FaUsers
            }
          ],
          learningOutcomes: [
            'Professional communication skills',
            'Effective lead qualification',
            'Higher conversion rates',
            'Long-term client relationships'
          ],
          tips: [
            'Respond quickly to show professionalism',
            'Ask clarifying questions upfront',
            'Set clear expectations early',
            'Always follow up after projects'
          ]
        };

      case 'advanced-demo':
        return {
          title: 'Advanced Platform Features',
          description: 'Leverage premium features for competitive advantage',
          estimatedTime: '20 minutes',
          instructor: {
            action: 'Tour advanced features like games, affiliate program, and analytics',
            platform: 'Comprehensive platform walkthrough'
          },
          steps: [
            {
              title: 'Games & Rewards',
              instruction: 'Show how to earn tokens through platform games',
              studentAction: 'Try the duck hunt game and understand token rewards',
              icon: FaRocket
            },
            {
              title: 'Affiliate Program',
              instruction: 'Demonstrate setting up and promoting referral links',
              studentAction: 'Generate their referral code and plan promotion strategy',
              icon: FaUsers
            },
            {
              title: 'Premium Features',
              instruction: 'Explore banner ads, premium positioning, and analytics',
              studentAction: 'Consider premium upgrade benefits for their business',
              icon: FaDesktop
            },
            {
              title: 'Analytics Dashboard',
              instruction: 'Review performance metrics and optimization opportunities',
              studentAction: 'Set up tracking for their key performance indicators',
              icon: FaChartLine
            }
          ],
          learningOutcomes: [
            'Maximized platform utilization',
            'Additional revenue streams',
            'Competitive positioning',
            'Data-driven optimization'
          ],
          tips: [
            'Participate in community events for visibility',
            'Use analytics to optimize performance',
            'Consider premium features as business investment',
            'Share knowledge to build reputation'
          ]
        };

      default:
        return {
          title: 'Live Demonstration',
          description: 'Instructor-led platform walkthrough',
          estimatedTime: '15 minutes'
        };
    }
  };

  const config = getDemoConfig(section.content);

  const handleDemoComplete = () => {
    setDemoWatched(true);
    if (!isCompleted) {
      onComplete(sectionIndex, section.points);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Demo Header */}
      <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-xl p-6 border border-orange-500/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-orange-500/20 p-3 rounded-full">
            <FaVideo className="text-2xl text-orange-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-orange-400">{config.title}</h3>
            <p className="text-gray-300">{config.description}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-gray-300">
            <FaClock className="text-orange-400" />
            <span>{config.estimatedTime}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <FaChalkboardTeacher className="text-orange-400" />
            <span>Live Demo</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <FaHandPointer className="text-orange-400" />
            <span>Interactive</span>
          </div>
        </div>
      </div>

      {/* Instructor Instructions */}
      <div className="bg-blue-600/20 rounded-xl p-6 border border-blue-500/30">
        <h4 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
          <FaMicrophone />
          Instructor Guide
        </h4>
        <div className="space-y-2">
          <p className="text-gray-300">
            <strong>Action:</strong> {config.instructor?.action}
          </p>
          <p className="text-gray-300">
            <strong>Platform:</strong> {config.instructor?.platform}
          </p>
        </div>
      </div>

      {/* Demo Steps */}
      <div className="space-y-4">
        <h4 className="text-xl font-bold text-white mb-4">Demo Steps</h4>
        {config.steps?.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <div key={index} className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
              <div className="flex items-start gap-4">
                <div className="bg-blue-500/20 p-2 rounded-lg mt-1">
                  <StepIcon className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <h5 className="font-bold text-lg mb-2">
                    Step {index + 1}: {step.title}
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-orange-400 font-medium mb-1">Instructor:</p>
                      <p className="text-gray-300 text-sm">{step.instruction}</p>
                    </div>
                    <div>
                      <p className="text-green-400 font-medium mb-1">Students:</p>
                      <p className="text-gray-300 text-sm">{step.studentAction}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Learning Outcomes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-600/20 rounded-xl p-6 border border-green-500/30">
          <h4 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
            <FaLightbulb />
            Learning Outcomes
          </h4>
          <ul className="space-y-2">
            {config.learningOutcomes?.map((outcome, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-300">
                <FaCheck className="text-green-400 text-sm mt-1 flex-shrink-0" />
                <span className="text-sm">{outcome}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-purple-600/20 rounded-xl p-6 border border-purple-500/30">
          <h4 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
            <FaNotes />
            Pro Tips
          </h4>
          <ul className="space-y-2">
            {config.tips?.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-300">
                <FaLightbulb className="text-purple-400 text-sm mt-1 flex-shrink-0" />
                <span className="text-sm">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Interactive Notes Section */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-600">
        <button
          onClick={() => setNotesVisible(!notesVisible)}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-lg font-bold text-yellow-400">📝 Take Notes During Demo</h4>
          <span className="text-gray-400">{notesVisible ? '−' : '+'}</span>
        </button>
        
        {notesVisible && (
          <div className="mt-4">
            <textarea
              placeholder="Write your notes here during the live demonstration..."
              className="w-full h-32 bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Demo Completion */}
      <div className="text-center">
        {!demoWatched && !isCompleted ? (
          <button
            onClick={handleDemoComplete}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-xl transform transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <FaPlay className="inline mr-2" />
            Mark Demo as Watched (+{section.points} points)
          </button>
        ) : isCompleted ? (
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 rounded-xl border border-green-500/50">
            <FaCheck />
            Demo Completed! (+{section.points} points earned)
          </div>
        ) : (
          <div className="text-gray-400">
            Click the button above to mark this demo as completed
          </div>
        )}
      </div>

      {/* Instructor Transition Note */}
      <div className="bg-yellow-600/20 rounded-xl p-4 border border-yellow-500/30 text-center">
        <p className="text-yellow-400 font-medium">
          🎯 <strong>Instructor:</strong> After the live demo, return to this course to continue with the next section
        </p>
      </div>
    </div>
  );
};

export default LiveDemoPlaceholder;
