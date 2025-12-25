import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaClock, FaChevronLeft, FaChevronRight, FaCheck } from 'react-icons/fa';
import { API_URL } from '../services/api';

const SkillTestModal = ({ test, onClose, onComplete, currentUser }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(test.timeLimit * 60); // Convert to seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    fetchTestData();
  }, [test._id]);

  useEffect(() => {
    if (testData && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [testData, timeLeft]);

  const fetchTestData = async () => {
    try {
      const response = await fetch(`${API_URL}/skill-tests/${test._id}`);
      if (response.ok) {
        const data = await response.json();
        setTestData(data);
        // Initialize answers object
        const initialAnswers = {};
        data.questions.forEach((_, index) => {
          initialAnswers[index] = { selectedAnswer: null, timeSpent: 0 };
        });
        setAnswers(initialAnswers);
      }
    } catch (error) {
      setError('Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    const currentTime = Date.now();
    const timeSpent = currentTime - startTimeRef.current;
    
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: {
        selectedAnswer: answerIndex,
        timeSpent: prev[questionIndex]?.timeSpent || 0
      }
    }));
  };

  const handleNext = () => {
    if (currentQuestion < testData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = currentUser.token || localStorage.getItem('token');
      const totalTimeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

      const response = await fetch(`${API_URL}/skill-tests/${test._id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: Object.values(answers),
          timeTaken: totalTimeTaken,
          servedQuestionIndices: testData.servedQuestionIndices // Include the question indices that were served
        })
      });

      if (response.ok) {
        const results = await response.json();
        onComplete(results);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit test');
      }
    } catch (error) {
      setError('Failed to submit test');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!testData) return 0;
    return ((currentQuestion + 1) / testData.questions.length) * 100;
  };

  const getAnsweredCount = () => {
    return Object.values(answers).filter(answer => answer.selectedAnswer !== null).length;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 md:p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-white mt-4 text-center">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 md:p-8">
          <p className="text-red-400 text-center">Failed to load test</p>
          <button onClick={onClose} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded w-full md:w-auto">
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentQ = testData.questions[currentQuestion];

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-gray-800 w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-700 p-3 md:p-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 md:space-x-4 flex-wrap">
            <h2 className="text-lg md:text-xl font-semibold text-white">{test.title}</h2>
            <div className="flex items-center space-x-2 text-yellow-400">
              <FaClock />
              <span className="font-mono text-sm md:text-base">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <FaTimes size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-700 p-2 md:p-3">
          <div className="flex items-center justify-between text-xs md:text-sm text-gray-400 mb-2">
            <span>Question {currentQuestion + 1} of {testData.questions.length}</span>
            <span>{getAnsweredCount()} answered</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-base md:text-lg font-semibold text-white mb-4 leading-relaxed">
              {currentQ.question}
            </h3>
            
            <div className="space-y-2 md:space-y-3">
              {currentQ.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-start p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    answers[currentQuestion]?.selectedAnswer === index
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion}`}
                    value={index}
                    checked={answers[currentQuestion]?.selectedAnswer === index}
                    onChange={() => handleAnswerSelect(currentQuestion, index)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center ${
                    answers[currentQuestion]?.selectedAnswer === index
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-400'
                  }`}>
                    {answers[currentQuestion]?.selectedAnswer === index && (
                      <FaCheck className="text-white text-xs" />
                    )}
                  </div>
                  <span className="text-white text-sm md:text-base leading-relaxed">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gray-700 p-3 md:p-4 flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="flex items-center space-x-1 md:space-x-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 md:px-4 py-2 rounded transition-colors text-sm md:text-base"
          >
            <FaChevronLeft />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex space-x-1 md:space-x-2 overflow-x-auto max-w-full">
            {testData.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-6 h-6 md:w-8 md:h-8 rounded text-xs md:text-sm flex-shrink-0 ${
                  index === currentQuestion
                    ? 'bg-blue-500 text-white'
                    : answers[index]?.selectedAnswer !== null
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestion === testData.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || getAnsweredCount() < testData.questions.length}
              className="flex items-center space-x-1 md:space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:text-gray-500 text-white px-4 md:px-6 py-2 rounded transition-colors text-sm md:text-base"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <FaCheck />
                  <span>Submit Test</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center space-x-1 md:space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-3 md:px-4 py-2 rounded transition-colors text-sm md:text-base"
            >
              <span className="hidden sm:inline">Next</span>
              <FaChevronRight />
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-3 md:px-4 py-2 m-3 md:m-4 rounded text-sm md:text-base">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillTestModal;
