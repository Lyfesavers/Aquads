import React from 'react';
import { FaTimes, FaTrophy, FaCheckCircle, FaTimesCircle, FaClock, FaStar } from 'react-icons/fa';

const SkillTestResults = ({ results, test, onClose }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-blue-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreMessage = (score) => {
    if (score >= 90) return 'Excellent! Outstanding performance!';
    if (score >= 80) return 'Great job! You passed the test!';
    if (score >= 70) return 'Good effort! Keep practicing.';
    return 'Keep studying and try again!';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-700 p-4 flex items-center justify-between sticky top-0">
          <h2 className="text-xl font-semibold text-white">Test Results</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Score Summary */}
          <div className="text-center">
            <div className={`text-6xl font-bold mb-4 ${getScoreColor(results.score)}`}>
              {results.score}%
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">{test.title}</h3>
            <p className="text-gray-400 mb-4">{getScoreMessage(results.score)}</p>
            
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <FaClock />
                <span>Time: {formatTime(results.timeTaken)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaCheckCircle className="text-green-400" />
                <span>{results.correctAnswers} / {results.totalQuestions} correct</span>
              </div>
              {results.attempts > 1 && (
                <div className="flex items-center space-x-2">
                  <span>Attempt #{results.attempts}</span>
                </div>
              )}
            </div>
            
            {/* Show best score on retakes */}
            {results.isRetake && results.bestScore !== undefined && (
              <div className="mt-3 text-sm">
                <span className="text-gray-400">Best Score: </span>
                <span className={getScoreColor(results.bestScore)}>{results.bestScore}%</span>
              </div>
            )}
          </div>

          {/* Pass/Fail Status */}
          <div className={`text-center p-4 rounded-lg ${
            results.passed 
              ? 'bg-green-500/20 border border-green-500/50' 
              : 'bg-red-500/20 border border-red-500/50'
          }`}>
            <div className="flex items-center justify-center space-x-2 mb-2">
              {results.passed ? (
                <>
                  <FaCheckCircle className="text-green-400 text-2xl" />
                  <span className="text-green-400 font-semibold text-lg">PASSED</span>
                </>
              ) : (
                <>
                  <FaTimesCircle className="text-red-400 text-2xl" />
                  <span className="text-red-400 font-semibold text-lg">FAILED</span>
                </>
              )}
            </div>
            <p className="text-gray-300">
              {results.passed 
                ? `You scored ${results.score}% which meets the ${test.passingScore}% passing requirement.`
                : `You need ${test.passingScore}% to pass. You scored ${results.score}%.`
              }
            </p>
          </div>

          {/* Badge Award */}
          {results.passed && results.badgeEarned && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <span className="text-4xl">{results.badgeEarned.icon}</span>
                <div>
                  <h4 className="text-xl font-semibold text-white">{results.badgeEarned.name}</h4>
                  <p className="text-gray-400">{results.badgeEarned.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-yellow-400">
                <FaTrophy />
                <span className="font-semibold">Badge Earned!</span>
              </div>
              <p className="text-gray-300 mt-2">
                This badge will now appear on your service listings to showcase your skills.
              </p>
            </div>
          )}

          {/* Detailed Results */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Question Review</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {results.answers.map((answer, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  answer.isCorrect 
                    ? 'border-green-500/50 bg-green-500/10' 
                    : 'border-red-500/50 bg-red-500/10'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                      answer.isCorrect 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {answer.isCorrect ? (
                          <FaCheckCircle className="text-green-400" />
                        ) : (
                          <FaTimesCircle className="text-red-400" />
                        )}
                        <span className={`font-semibold ${
                          answer.isCorrect ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {answer.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      {!answer.isCorrect && answer.explanation && (
                        <p className="text-gray-300 text-sm bg-gray-700/50 p-2 rounded">
                          <strong>Explanation:</strong> {answer.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
              <FaStar className="mr-2 text-yellow-400" />
              Performance Insights
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Accuracy:</span>
                <span className="text-white">{Math.round((results.correctAnswers / results.totalQuestions) * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Time Efficiency:</span>
                <span className="text-white">
                  {results.timeTaken < test.timeLimit * 60 ? 'Good' : 'Could be faster'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Difficulty Level:</span>
                <span className="text-white capitalize">{test.difficulty}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg transition-colors"
            >
              Continue to Dashboard
            </button>
            {!results.passed && (
              <button
                onClick={onClose}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg transition-colors"
              >
                Retake Test
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillTestResults;
