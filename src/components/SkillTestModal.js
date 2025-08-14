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
          timeTaken: totalTimeTaken
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-white mt-4">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8">
          <p className="text-red-400">Failed to load test</p>
          <button onClick={onClose} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentQ = testData.questions[currentQuestion];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-white">{test.title}</h2>
            <div className="flex items-center space-x-2 text-yellow-400">
              <FaClock />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <FaTimes size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-700 p-2">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
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
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {currentQ.question}
            </h3>
            
            <div className="space-y-3">
              {currentQ.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
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
                  <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    answers[currentQuestion]?.selectedAnswer === index
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-400'
                  }`}>
                    {answers[currentQuestion]?.selectedAnswer === index && (
                      <FaCheck className="text-white text-xs" />
                    )}
                  </div>
                  <span className="text-white">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gray-700 p-4 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded transition-colors"
          >
            <FaChevronLeft />
            <span>Previous</span>
          </button>

          <div className="flex space-x-2">
            {testData.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-8 h-8 rounded text-sm ${
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
              className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:text-gray-500 text-white px-6 py-2 rounded transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
              <span>Next</span>
              <FaChevronRight />
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 m-4 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillTestModal;
