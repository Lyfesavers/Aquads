import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaGraduationCap, FaClock, FaTrophy, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { API_URL } from '../services/api';
import SkillTestModal from './SkillTestModal';
import SkillTestResults from './SkillTestResults';

const SkillTests = ({ currentUser }) => {
  const [tests, setTests] = useState([]);
  const [userCompletions, setUserCompletions] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTests();
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  const fetchTests = async () => {
    try {
      const response = await fetch(`${API_URL}/skill-tests`);
      if (response.ok) {
        const data = await response.json();
        setTests(data);
      }
    } catch (error) {
      setError('Failed to load skill tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const token = currentUser.token || localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [completionsResponse, badgesResponse] = await Promise.all([
        fetch(`${API_URL}/skill-tests/user/completions`, { headers }),
        fetch(`${API_URL}/skill-tests/user/badges`, { headers })
      ]);

      if (completionsResponse.ok) {
        const completions = await completionsResponse.json();
        setUserCompletions(completions);
      }

      if (badgesResponse.ok) {
        const badges = await badgesResponse.json();
        setUserBadges(badges);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleStartTest = (test) => {
    setSelectedTest(test);
    setShowTestModal(true);
  };

  const handleTestComplete = (results) => {
    setTestResults(results);
    setShowTestModal(false);
    setShowResults(true);
    fetchUserData(); // Refresh user data to show new badge
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'english': '📚',
      'customer-service': '🎧',
      'communication': '💬',
      'project-management': '📋',
      'technical': '💻'
    };
    return icons[category] || '📝';
  };

  const getCategoryName = (category) => {
    const names = {
      'english': 'English Proficiency',
      'customer-service': 'Customer Service',
      'communication': 'Communication Skills',
      'project-management': 'Project Management',
      'technical': 'Technical Skills'
    };
    return names[category] || category;
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'beginner': 'text-green-400',
      'intermediate': 'text-yellow-400',
      'advanced': 'text-red-400'
    };
    return colors[difficulty] || 'text-gray-400';
  };

  const isTestCompleted = (testId) => {
    return userCompletions.some(completion => completion.testId._id === testId);
  };

  const getTestStatus = (test) => {
    const completion = userCompletions.find(c => c.testId._id === test._id);
    if (!completion) return { status: 'not-started', text: 'Not Started' };
    
    if (completion.passed) {
      return { 
        status: 'passed', 
        text: `Passed (${completion.score}%)`,
        icon: <FaCheckCircle className="text-green-400" />
      };
    } else {
      return { 
        status: 'failed', 
        text: `Failed (${completion.score}%)`,
        icon: <FaTimesCircle className="text-red-400" />
      };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center">
          <FaGraduationCap className="mr-3 text-blue-400" />
          Skills Tests
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Take these challenging tests to earn badges and showcase your skills to potential clients. 
          Each test covers essential skills that will help you stand out in the marketplace.
        </p>
      </div>

      {/* User Badges Showcase */}
      {userBadges.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <FaTrophy className="mr-2 text-yellow-400" />
            Your Earned Badges
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userBadges.map((badge, index) => (
              <div key={index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{badge.badgeIcon}</span>
                  <div>
                    <h4 className="font-semibold text-white">{badge.badgeName}</h4>
                    <p className="text-sm text-gray-400">{badge.badgeDescription}</p>
                    <p className="text-xs text-gray-500">Score: {badge.score}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.map((test) => {
          const testStatus = getTestStatus(test);
          const isCompleted = isTestCompleted(test._id);

          return (
            <div key={test._id} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{getCategoryIcon(test.category)}</span>
                {testStatus.icon && testStatus.icon}
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">{test.title}</h3>
              <p className="text-gray-400 text-sm mb-4">{test.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-400">
                  <span className="w-20">Category:</span>
                  <span className="text-white">{getCategoryName(test.category)}</span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <span className="w-20">Difficulty:</span>
                  <span className={getDifficultyColor(test.difficulty)}>
                    {test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <FaClock className="mr-1" />
                  <span>{test.timeLimit} minutes</span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <span>Passing Score: {test.passingScore}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className={`px-2 py-1 rounded ${
                    testStatus.status === 'passed' 
                      ? 'bg-green-500/20 text-green-400' 
                      : testStatus.status === 'failed'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {testStatus.text}
                  </span>
                </div>

                {!isCompleted && (
                  <button
                    onClick={() => handleStartTest(test)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                  >
                    Start Test
                  </button>
                )}

                {isCompleted && testStatus.status === 'failed' && (
                  <button
                    onClick={() => handleStartTest(test)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded transition-colors"
                  >
                    Retake
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Test Modal */}
      {showTestModal && selectedTest && (
        <SkillTestModal
          test={selectedTest}
          onClose={() => setShowTestModal(false)}
          onComplete={handleTestComplete}
          currentUser={currentUser}
        />
      )}

      {/* Results Modal */}
      {showResults && testResults && (
        <SkillTestResults
          results={testResults}
          test={selectedTest}
          onClose={() => setShowResults(false)}
        />
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default SkillTests;
