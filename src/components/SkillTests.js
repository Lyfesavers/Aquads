import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaGraduationCap, FaClock, FaTrophy, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
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
    if (currentUser && currentUser.token) {
      fetchUserData();
    }
  }, [currentUser]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/skill-tests`);
      if (response.ok) {
        const data = await response.json();
        setTests(data);
      } else {
        setError('Failed to load skill tests. Please try again later.');
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      setError('Unable to connect to the server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const token = currentUser.token;
      if (!token) {
        console.log('No user token available');
        return;
      }

      const headers = { 
        'Authorization': `Bearer ${token}`
      };

      // Always fetch fresh data from database
      const [completionsResponse, badgesResponse] = await Promise.all([
        fetch(`${API_URL}/skill-tests/user/completions`, { 
          headers,
          cache: 'no-store'
        }),
        fetch(`${API_URL}/skill-tests/user/badges`, { 
          headers,
          cache: 'no-store'
        })
      ]);

      if (completionsResponse.ok) {
        const completions = await completionsResponse.json();
        console.log('Fetched completions from database:', completions);
        setUserCompletions(completions);
      } else {
        console.error('Failed to fetch completions:', completionsResponse.status);
      }

      if (badgesResponse.ok) {
        const badges = await badgesResponse.json();
        console.log('Fetched badges from database:', badges);
        setUserBadges(badges);
      } else {
        console.error('Failed to fetch badges:', badgesResponse.status);
      }
    } catch (error) {
      console.error('Error fetching user data from database:', error);
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
    return userCompletions.some(completion => completion.testId && completion.testId._id === testId);
  };

  const getTestStatus = (test) => {
    const completion = userCompletions.find(c => c.testId && c.testId._id === test._id);
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

  // Loading state
  if (loading) {
    return (
      <div className="space-y-8">
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
        
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading skill tests...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-8">
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
        
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <FaExclamationTriangle className="text-red-400 mr-3 text-xl" />
            <h3 className="text-xl font-semibold text-white">Unable to Load Tests</h3>
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchTests}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state - no tests available
  if (tests.length === 0) {
    return (
      <div className="space-y-8">
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
        
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <FaInfoCircle className="text-blue-400 mr-3 text-xl" />
            <h3 className="text-xl font-semibold text-white">Tests Coming Soon</h3>
          </div>
          <p className="text-blue-400 mb-4">
            We're currently setting up our skills tests. Check back soon to take tests in:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📚</span>
                <div>
                  <h4 className="font-semibold text-white">English Proficiency</h4>
                  <p className="text-sm text-gray-400">Grammar, vocabulary, business communication</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🎧</span>
                <div>
                  <h4 className="font-semibold text-white">Customer Service</h4>
                  <p className="text-sm text-gray-400">Handling complaints, communication skills</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">💬</span>
                <div>
                  <h4 className="font-semibold text-white">Communication Skills</h4>
                  <p className="text-sm text-gray-400">Professional writing, active listening</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h4 className="font-semibold text-white">Project Management</h4>
                  <p className="text-sm text-gray-400">Planning, organization, time management</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">💻</span>
                <div>
                  <h4 className="font-semibold text-white">Technical Skills</h4>
                  <p className="text-sm text-gray-400">Web development, design, programming</p>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={fetchTests}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            Check Again
          </button>
        </div>
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
      <div className="bg-gray-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <FaTrophy className="mr-2 text-yellow-400" />
            Your Earned Badges
          </h3>
          <button
            onClick={fetchUserData}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
            title="Refresh badges data"
          >
            Refresh
          </button>
        </div>
        {userBadges.length > 0 ? (
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
        ) : (
          <p className="text-gray-400 text-center py-4">No badges earned yet. Take some skill tests to earn badges!</p>
        )}
      </div>

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
    </div>
  );
};

export default SkillTests;
