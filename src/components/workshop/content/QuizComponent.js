import React, { useState } from 'react';
import { 
  FaCheck, FaTimes, FaQuestionCircle, FaTrophy, FaRedo,
  FaLightbulb, FaClock, FaStar, FaBrain
} from 'react-icons/fa';

const QuizComponent = ({ section, sectionIndex, onComplete, isCompleted }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds per quiz

  const getQuizConfig = (contentType) => {
    const baseQuestions = {
      'platform-knowledge': [
        {
          question: "What is the primary benefit of Aquads' token unlock system?",
          options: [
            "Free access to all leads",
            "Only pay for qualified leads you want to pursue",
            "Automatic project matching",
            "Guaranteed project success"
          ],
          correct: 1,
          explanation: "The token system ensures you only invest in leads that match your criteria and have real potential."
        },
        {
          question: "How do skill badges improve your freelancer profile?",
          options: [
            "They make your profile look colorful",
            "They increase your trust score and client confidence",
            "They're required for platform access",
            "They automatically increase your rates"
          ],
          correct: 1,
          explanation: "Skill badges provide verified proof of your expertise, directly improving your trust score."
        },
        {
          question: "What's the most effective way to price your Web3 services?",
          options: [
            "Always price lower than competitors",
            "Use the platform's suggested pricing only",
            "Research market rates and position based on your unique value",
            "Price as high as possible"
          ],
          correct: 2,
          explanation: "Strategic pricing based on market research and your unique value proposition maximizes both bookings and profit."
        }
      ],
      'freelancer-strategy': [
        {
          question: "What should be your first priority when starting on Aquads?",
          options: [
            "Creating as many service listings as possible",
            "Completing your profile and taking relevant skill tests",
            "Immediately unlocking all available leads",
            "Joining every community channel"
          ],
          correct: 1,
          explanation: "A complete profile with verified skills builds trust and attracts better clients from the start."
        },
        {
          question: "How can you maximize your success in the first 30 days?",
          options: [
            "Focus only on high-paying projects",
            "Build reputation with quality work and good reviews",
            "Spend all tokens on lead unlocking immediately",
            "Copy successful freelancers' exact profiles"
          ],
          correct: 1,
          explanation: "Early reputation building through quality work creates a foundation for long-term success."
        },
        {
          question: "What's the best approach to client communication?",
          options: [
            "Respond only during business hours",
            "Be professional, responsive, and ask clarifying questions",
            "Keep all communication through platform only",
            "Always accept projects without negotiation"
          ],
          correct: 1,
          explanation: "Professional, responsive communication with proper scope clarification prevents misunderstandings and builds trust."
        }
      ],
      'web3-knowledge': [
        {
          question: "Which Web3 skill category typically commands the highest rates?",
          options: [
            "Content writing",
            "Social media management", 
            "Smart contract development and security auditing",
            "General marketing"
          ],
          correct: 2,
          explanation: "Technical skills like smart contract development and security auditing are in high demand with premium pricing."
        },
        {
          question: "What makes Web3 freelancing different from traditional freelancing?",
          options: [
            "It's exactly the same, just different clients",
            "Higher rates, faster payments, and specialized skill requirements",
            "Only crypto payments are accepted",
            "You must own cryptocurrency to participate"
          ],
          correct: 1,
          explanation: "Web3 offers higher rates due to specialized skills, faster crypto payments, and growing market demand."
        },
        {
          question: "How should you prepare for the Web3 freelancing market?",
          options: [
            "Only learn the most popular programming languages",
            "Focus on traditional marketing skills only",
            "Understand blockchain concepts, DeFi, and industry trends",
            "Wait for the market to mature before joining"
          ],
          correct: 2,
          explanation: "Understanding the broader Web3 ecosystem helps you serve clients better and identify new opportunities."
        }
      ]
    };

    return {
      title: "Knowledge Check",
      description: "Test your understanding of key concepts",
      timeLimit: 180, // 3 minutes
      passingScore: 70,
      questions: baseQuestions[contentType] || baseQuestions['platform-knowledge'],
      badge: {
        name: "Knowledge Master",
        icon: "🧠",
        description: "Demonstrated strong understanding of course concepts"
      }
    };
  };

  const config = getQuizConfig(section.content || 'platform-knowledge');

  React.useEffect(() => {
    if (!showResults && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResults) {
      handleSubmitQuiz();
    }
  }, [timeLeft, showResults]);

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: answerIndex
    });
  };

  const handleSubmitQuiz = () => {
    let correctCount = 0;
    config.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correct) {
        correctCount++;
      }
    });
    
    const finalScore = Math.round((correctCount / config.questions.length) * 100);
    setScore(finalScore);
    setShowResults(true);
    
    if (finalScore >= config.passingScore && !isCompleted) {
      onComplete(sectionIndex, section.points);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
    setTimeLeft(180);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showResults) {
    return (
      <div className="space-y-6">
        {/* Results Header */}
        <div className={`
          rounded-xl p-6 text-center border
          ${score >= config.passingScore 
            ? 'bg-green-600/20 border-green-500/30' 
            : 'bg-red-600/20 border-red-500/30'
          }
        `}>
          <div className="text-6xl mb-4">
            {score >= config.passingScore ? '🎉' : '😅'}
          </div>
          <h3 className="text-2xl font-bold mb-2">
            {score >= config.passingScore ? 'Excellent Work!' : 'Keep Learning!'}
          </h3>
          <p className="text-4xl font-bold mb-2">
            {score}%
          </p>
          <p className="text-gray-300">
            {score >= config.passingScore 
              ? `You passed! (Required: ${config.passingScore}%)` 
              : `You need ${config.passingScore}% to pass`
            }
          </p>
        </div>

        {/* Detailed Results */}
        <div className="space-y-4">
          <h4 className="text-xl font-bold">Review Your Answers</h4>
          {config.questions.map((question, index) => {
            const userAnswer = selectedAnswers[index];
            const isCorrect = userAnswer === question.correct;
            
            return (
              <div key={index} className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`
                    p-2 rounded-full
                    ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                  `}>
                    {isCorrect ? <FaCheck /> : <FaTimes />}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold mb-2">Question {index + 1}</h5>
                    <p className="text-gray-300 mb-3">{question.question}</p>
                    
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className={`
                          p-2 rounded border text-sm
                          ${optIndex === question.correct 
                            ? 'border-green-500 bg-green-500/10 text-green-400' 
                            : optIndex === userAnswer && userAnswer !== question.correct
                            ? 'border-red-500 bg-red-500/10 text-red-400'
                            : 'border-gray-600 text-gray-300'
                          }
                        `}>
                          {option}
                          {optIndex === question.correct && (
                            <span className="ml-2 text-green-400">✓ Correct</span>
                          )}
                          {optIndex === userAnswer && userAnswer !== question.correct && (
                            <span className="ml-2 text-red-400">✗ Your answer</span>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                      <p className="text-blue-400 text-sm">
                        <FaLightbulb className="inline mr-1" />
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          {score >= config.passingScore ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 rounded-xl border border-green-500/50">
              <FaTrophy />
              Quiz Completed! (+{section.points} points earned)
            </div>
          ) : (
            <button
              onClick={resetQuiz}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              <FaRedo className="inline mr-2" />
              Retake Quiz
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Quiz Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-6 border border-purple-500/30">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-purple-400">{config.title}</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <FaClock />
              <span className="font-bold">{formatTime(timeLeft)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FaBrain />
              <span>{currentQuestion + 1} / {config.questions.length}</span>
            </div>
          </div>
        </div>
        
        <p className="text-gray-300 mb-4">{config.description}</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / config.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Question */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FaQuestionCircle className="text-blue-400" />
            <span className="text-blue-400 font-medium">Question {currentQuestion + 1}</span>
          </div>
          <h4 className="text-xl font-bold text-white leading-relaxed">
            {config.questions[currentQuestion]?.question}
          </h4>
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          {config.questions[currentQuestion]?.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(currentQuestion, index)}
              className={`
                w-full text-left p-4 rounded-lg border transition-all
                ${selectedAnswers[currentQuestion] === index
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                  : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm
                  ${selectedAnswers[currentQuestion] === index
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-500'
                  }
                `}>
                  {String.fromCharCode(65 + index)}
                </div>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
          className={`
            px-4 py-2 rounded-lg transition-colors
            ${currentQuestion === 0 
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-gray-700 hover:bg-gray-600 text-white'
            }
          `}
        >
          Previous
        </button>
        
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            {Object.keys(selectedAnswers).length} of {config.questions.length} answered
          </p>
        </div>
        
        {currentQuestion < config.questions.length - 1 ? (
          <button
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            disabled={selectedAnswers[currentQuestion] === undefined}
            className={`
              px-4 py-2 rounded-lg transition-colors
              ${selectedAnswers[currentQuestion] === undefined
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmitQuiz}
            disabled={Object.keys(selectedAnswers).length < config.questions.length}
            className={`
              px-6 py-2 rounded-lg font-bold transition-colors
              ${Object.keys(selectedAnswers).length < config.questions.length
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
              }
            `}
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizComponent;
