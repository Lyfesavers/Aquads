import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Trophy, 
  Timer, 
  Users, 
  Target, 
  Swords, 
  Crown, 
  Share2,
  ExternalLink,
  Play,
  Pause
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const BubbleDuels = ({ currentUser }) => {
  const [ads, setAds] = useState([]);
  const [activeBattle, setActiveBattle] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [battleStats, setBattleStats] = useState({ project1Votes: 0, project2Votes: 0 });
  const [loading, setLoading] = useState(true);
  const [particles, setParticles] = useState([]);
  const [lightningFlash, setLightningFlash] = useState(false);
  const [lastVoteEffect, setLastVoteEffect] = useState(null);

  // Fetch bubble ads (same as main page)
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await fetch(`${API_URL}/api/ads`);
        if (response.ok) {
          const adsData = await response.json();
          // Filter only approved and bumped ads like main page
          const validAds = adsData.filter(ad => 
            ad.status === 'approved' && 
            ad.isBumped === true &&
            ad.logo
          );
          setAds(validAds);
        }
      } catch (error) {
        console.error('Error fetching ads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, []);

  // Battle timer countdown
  useEffect(() => {
    let interval;
    if (activeBattle && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            endBattle();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeBattle, timeRemaining]);

  const selectProject = (project) => {
    if (selectedProjects.length < 2 && !selectedProjects.find(p => p.id === project.id)) {
      setSelectedProjects([...selectedProjects, project]);
    }
  };

  const removeProject = (projectId) => {
    setSelectedProjects(selectedProjects.filter(p => p.id !== projectId));
  };

  const startBattle = async () => {
    if (selectedProjects.length !== 2) return;

    try {
      // Create battle first
      const createResponse = await fetch(`${API_URL}/api/bubble-duels/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          project1AdId: selectedProjects[0].id,
          project2AdId: selectedProjects[1].id,
          duration: 3600,
          targetVotes: 100
        })
      });

      const battleData = await createResponse.json();

      if (createResponse.ok) {
        // Start the battle
        const startResponse = await fetch(`${API_URL}/api/bubble-duels/${battleData.battleId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const startData = await startResponse.json();

        if (startResponse.ok) {
          setActiveBattle(startData.battle);
          setTimeRemaining(startData.battle.remainingTime);
          setBattleStats({ 
            project1Votes: startData.battle.project1.votes,
            project2Votes: startData.battle.project2.votes
          });
        } else {
          alert(startData.error || 'Failed to start battle');
        }
      } else {
        alert(battleData.error || 'Failed to create battle');
      }
    } catch (error) {
      console.error('Error starting battle:', error);
      alert('Failed to start battle. Please try again.');
    }
  };

  const endBattle = () => {
    const winner = battleStats.project1Votes > battleStats.project2Votes ? 
      activeBattle.project1 : activeBattle.project2;
    
    // Show victory screen
    alert(`🏆 ${winner.title} WINS! 🏆\nFinal Score: ${Math.max(battleStats.project1Votes, battleStats.project2Votes)} votes!`);
    
    setActiveBattle(null);
    setSelectedProjects([]);
    setBattleStats({ project1Votes: 0, project2Votes: 0 });
  };

  // Particle effect creation
  const createParticleEffect = useCallback((x, y, color) => {
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 100,
      y: y + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 1,
      color,
      size: Math.random() * 8 + 4
    }));
    
    setParticles(prev => [...prev, ...newParticles]);
    
    // Remove particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 2000);
  }, []);

  // Lightning flash effect
  const triggerLightning = useCallback(() => {
    setLightningFlash(true);
    setTimeout(() => setLightningFlash(false), 200);
  }, []);

  const vote = async (projectSide) => {
    if (!currentUser) {
      alert('Please login to vote!');
      return;
    }

    if (!activeBattle) return;

    try {
      const response = await fetch(`${API_URL}/api/bubble-duels/${activeBattle.battleId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          projectSide: projectSide === 'project1Votes' ? 'project1' : 'project2' 
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Update local state with server response
        setBattleStats({
          project1Votes: data.battle.project1Votes,
          project2Votes: data.battle.project2Votes
        });

        // Trigger epic effects
        const isProject1 = projectSide === 'project1Votes';
        setLastVoteEffect({ side: isProject1 ? 'left' : 'right', timestamp: Date.now() });
        
        // Lightning flash
        triggerLightning();
        
        // Particle explosion
        createParticleEffect(
          isProject1 ? 200 : window.innerWidth - 200, 
          300, 
          isProject1 ? '#ef4444' : '#3b82f6'
        );

        // Show success message if points awarded
        if (data.pointsAwarded > 0) {
          alert(`Vote counted! You earned ${data.pointsAwarded} points! 🎉`);
        }
      } else {
        alert(data.error || 'Failed to vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    }
  };

  const shareToSocial = (platform) => {
    const battleUrl = window.location.href;
    const text = `🥊 EPIC BUBBLE BATTLE! ${activeBattle.project1.title} VS ${activeBattle.project2.title} - Vote now! ⚡`;
    
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(battleUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(battleUrl)}&text=${encodeURIComponent(text)}`
    };
    
    window.open(urls[platform], '_blank');
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Bubble Duels...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white relative overflow-hidden ${lightningFlash ? 'brightness-200' : ''}`}>
      {/* Lightning Flash Overlay */}
      <AnimatePresence>
        {lightningFlash && (
          <motion.div
            className="fixed inset-0 bg-white/30 pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          />
        )}
      </AnimatePresence>

      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none z-40">
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`
            }}
            animate={{
              x: [0, particle.vx * 20],
              y: [0, particle.vy * 20],
              opacity: [1, 0],
              scale: [1, 0]
            }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        ))}
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Electric sparks */}
        <motion.div
          className="absolute top-1/4 left-1/4 text-yellow-400 text-6xl opacity-20"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.8, 0.2]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          ⚡
        </motion.div>
        <motion.div
          className="absolute top-3/4 right-1/4 text-blue-400 text-4xl opacity-30"
          animate={{
            rotate: [360, 0],
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          🔥
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-3/4 text-purple-400 text-5xl opacity-25"
          animate={{
            y: [-20, 20, -20],
            rotate: [0, 180, 360],
            opacity: [0.25, 0.6, 0.25]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
          💫
        </motion.div>
      </div>

      {/* Header */}
      <div className="relative overflow-hidden py-12 z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-blue-600/20"></div>
        <div className="relative container mx-auto px-4 text-center">
          <motion.h1 
            className="text-6xl font-bold mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <span className="bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 text-transparent bg-clip-text">
              🥊 BUBBLE DUELS 🥊
            </span>
          </motion.h1>
          <p className="text-xl text-gray-300 mb-8">
            Street Fighter Style Crypto Project Battles! ⚡
          </p>
          <div className="flex justify-center space-x-8 text-lg">
            <div className="flex items-center space-x-2">
              <Timer className="text-yellow-400" />
              <span>1 Hour Battles</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="text-red-400" />
              <span>First to 100 Votes Wins</span>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="text-gold-400" />
              <span>Winner Gets Trending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Battle Arena or Setup */}
      {activeBattle ? (
        <BattleArena 
          battle={activeBattle}
          timeRemaining={timeRemaining}
          battleStats={battleStats}
          onVote={vote}
          onShare={shareToSocial}
          currentUser={currentUser}
        />
      ) : (
        <BattleSetup 
          ads={ads}
          selectedProjects={selectedProjects}
          onSelectProject={selectProject}
          onRemoveProject={removeProject}
          onStartBattle={startBattle}
        />
      )}
    </div>
  );
};

// Battle Setup Component
const BattleSetup = ({ ads, selectedProjects, onSelectProject, onRemoveProject, onStartBattle }) => {
  return (
    <div className="container mx-auto px-4 pb-12">
      {/* Selection Area */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {/* Project 1 Slot */}
        <div className="bg-gradient-to-br from-red-900/50 to-red-700/30 border-2 border-red-500/50 rounded-xl p-6 text-center">
          <h3 className="text-2xl font-bold mb-4 text-red-300">FIGHTER 1</h3>
          {selectedProjects[0] ? (
            <SelectedProjectDisplay 
              project={selectedProjects[0]} 
              color="red"
              onRemove={() => onRemoveProject(selectedProjects[0].id)}
            />
          ) : (
            <div className="h-40 border-4 border-dashed border-red-500/50 rounded-lg flex items-center justify-center">
              <span className="text-red-300">Select a project to battle</span>
            </div>
          )}
        </div>

        {/* VS Section */}
        <div className="flex items-center justify-center">
          <motion.div 
            className="text-6xl font-bold"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">
              VS
            </span>
          </motion.div>
        </div>

        {/* Project 2 Slot */}
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-700/30 border-2 border-blue-500/50 rounded-xl p-6 text-center">
          <h3 className="text-2xl font-bold mb-4 text-blue-300">FIGHTER 2</h3>
          {selectedProjects[1] ? (
            <SelectedProjectDisplay 
              project={selectedProjects[1]} 
              color="blue"
              onRemove={() => onRemoveProject(selectedProjects[1].id)}
            />
          ) : (
            <div className="h-40 border-4 border-dashed border-blue-500/50 rounded-lg flex items-center justify-center">
              <span className="text-blue-300">Select a project to battle</span>
            </div>
          )}
        </div>
      </div>

      {/* Start Battle Button */}
      {selectedProjects.length === 2 && (
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={onStartBattle}
            className="bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 px-12 py-4 rounded-lg text-2xl font-bold shadow-2xl transform hover:scale-105 transition-all duration-300"
          >
            🚀 START EPIC BATTLE! 🚀
          </button>
        </motion.div>
      )}

      {/* Available Projects Grid */}
      <div>
        <h2 className="text-3xl font-bold mb-8 text-center">Choose Your Fighters</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {ads.map(ad => (
            <ProjectBubble 
              key={ad.id}
              project={ad}
              isSelected={selectedProjects.find(p => p.id === ad.id)}
              onSelect={() => onSelectProject(ad)}
              disabled={selectedProjects.length >= 2}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Project Bubble Component (Same as main page)
const ProjectBubble = ({ project, isSelected, onSelect, disabled }) => {
  const bubbleSize = 120;
  
  return (
    <motion.div
      className={`bubble-container cursor-pointer ${isSelected ? 'opacity-50' : ''} ${disabled && !isSelected ? 'opacity-30' : ''}`}
      style={{
        width: `${bubbleSize}px`,
        height: `${bubbleSize}px`,
        position: 'relative'
      }}
      whileHover={{ scale: disabled && !isSelected ? 1 : 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={disabled && !isSelected ? undefined : onSelect}
    >
      <div 
        className="bubble-content relative w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-pink-600 border-2 border-purple-400 shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent 60%), linear-gradient(135deg, #8B5CF6, #EC4899)'
        }}
      >
        {/* Curved text at top */}
        <div className="bubble-text-curved absolute top-1 left-1/2 transform -translate-x-1/2 z-20">
          <span className="text-white text-xs font-bold truncate block max-w-full">
            {project.title}
          </span>
        </div>
        
        {/* Logo Container */}
        <div className="bubble-logo-container absolute inset-0 flex items-center justify-center p-4">
          <img
            src={project.logo}
            alt={project.title}
            className="w-full h-full object-contain rounded-full"
            style={{
              objectFit: 'contain',
              maxWidth: '85%',
              maxHeight: '85%'
            }}
          />
        </div>

        {/* Vote indicator */}
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-white bg-black/50 px-2 py-1 rounded">
          🗳️ {project.bullishVotes || 0}
        </div>
      </div>
    </motion.div>
  );
};

// Selected Project Display
const SelectedProjectDisplay = ({ project, color, onRemove }) => {
  const colorClasses = {
    red: 'from-red-600 to-red-800 border-red-400',
    blue: 'from-blue-600 to-blue-800 border-blue-400'
  };

  return (
    <motion.div 
      className={`bg-gradient-to-br ${colorClasses[color]} border-2 rounded-lg p-4 relative`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
    >
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs"
      >
        ×
      </button>
      <img 
        src={project.logo} 
        alt={project.title}
        className="w-20 h-20 object-contain mx-auto mb-2 rounded-full border-2 border-white/30"
      />
      <h4 className="font-bold text-white truncate">{project.title}</h4>
      <p className="text-sm opacity-75">🗳️ {project.bullishVotes || 0} votes</p>
    </motion.div>
  );
};

// Battle Arena Component
const BattleArena = ({ battle, timeRemaining, battleStats, onVote, onShare, currentUser }) => {
  const project1Health = Math.max(0, 100 - (battleStats.project2Votes * 2));
  const project2Health = Math.max(0, 100 - (battleStats.project1Votes * 2));
  
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto px-4">
      {/* Battle Timer */}
      <div className="text-center mb-8">
        <div className="bg-black/50 inline-block px-8 py-4 rounded-lg">
          <div className="text-4xl font-mono font-bold text-yellow-400 mb-2">
            ⏱️ {formatTime(timeRemaining)}
          </div>
          <div className="text-lg text-gray-300">Time Remaining</div>
        </div>
      </div>

      {/* Fighter Display */}
      <div className="grid md:grid-cols-3 gap-8 mb-8">
        {/* Fighter 1 */}
        <FighterDisplay 
          project={battle.project1}
          votes={battleStats.project1Votes}
          health={project1Health}
          color="red"
          position="left"
          onVote={() => onVote('project1Votes')}
          currentUser={currentUser}
        />

        {/* Center Battle Info */}
        <div className="flex flex-col items-center justify-center space-y-6 relative">
          {/* Epic Battle Symbol */}
          <div className="relative">
            <motion.div 
              className="text-6xl relative z-10"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              ⚔️
            </motion.div>
            
            {/* Energy rings around sword */}
            <motion.div
              className="absolute inset-0 border-4 border-yellow-400/50 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0.2, 0.5],
                rotate: [0, 360]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 border-2 border-blue-400/30 rounded-full"
              animate={{
                scale: [1.2, 0.8, 1.2],
                opacity: [0.3, 0.6, 0.3],
                rotate: [360, 0]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </div>
          
          {/* Battle Status */}
          <div className="text-center relative">
            <motion.div 
              className="text-2xl font-bold mb-2"
              animate={{
                textShadow: [`0 0 10px #fff`, `0 0 20px #fff`, `0 0 10px #fff`]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🔥 LIVE BATTLE 🔥
            </motion.div>
            <div className="text-lg text-gray-300 mb-4">
              Target: 100 votes to win!
            </div>

            {/* Battle intensity indicator */}
            <motion.div
              className="text-sm text-orange-400 font-bold"
              animate={{
                opacity: [0.6, 1, 0.6],
                scale: [0.9, 1.1, 0.9]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ⚡ INTENSITY RISING ⚡
            </motion.div>
          </div>

          {/* Social Sharing */}
          <div className="flex space-x-4">
            <button
              onClick={() => onShare('twitter')}
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Share2 size={16} />
              <span>Tweet</span>
            </button>
            <button
              onClick={() => onShare('telegram')}
              className="bg-blue-400 hover:bg-blue-500 px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <ExternalLink size={16} />
              <span>Telegram</span>
            </button>
          </div>
        </div>

        {/* Fighter 2 */}
        <FighterDisplay 
          project={battle.project2}
          votes={battleStats.project2Votes}
          health={project2Health}
          color="blue"
          position="right"
          onVote={() => onVote('project2Votes')}
          currentUser={currentUser}
        />
      </div>

      {/* Live Vote Feed */}
      <div className="bg-black/50 rounded-lg p-6 max-h-40 overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Users className="mr-2" />
          Live Vote Feed
        </h3>
        <div className="space-y-2 text-sm">
          <div className="text-green-400">🔥 Battle is HEATING UP! Keep voting!</div>
          <div className="text-blue-400">💫 {battle.project2.title} supporter just voted!</div>
          <div className="text-red-400">⚡ {battle.project1.title} gains ground!</div>
          <div className="text-yellow-400">🚀 Vote velocity increasing!</div>
        </div>
      </div>
    </div>
  );
};

// Fighter Display Component
const FighterDisplay = ({ project, votes, health, color, position, onVote, currentUser }) => {
  const colorClasses = {
    red: {
      bg: 'from-red-900/50 to-red-700/30',
      border: 'border-red-500/50',
      button: 'from-red-600 to-red-800 hover:from-red-700 hover:to-red-900',
      text: 'text-red-300',
      flame: '🔥',
      energy: '⚡',
      glow: 'shadow-red-500/50'
    },
    blue: {
      bg: 'from-blue-900/50 to-blue-700/30',
      border: 'border-blue-500/50',
      button: 'from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900',
      text: 'text-blue-300',
      flame: '💙',
      energy: '🌟',
      glow: 'shadow-blue-500/50'
    }
  };

  const classes = colorClasses[color];
  const isWinning = (color === 'red' && votes > 0) || (color === 'blue' && votes > 0);
  const isPowerful = votes > 50;

  return (
    <motion.div 
      className={`bg-gradient-to-br ${classes.bg} ${classes.border} border-2 rounded-xl p-6 text-center relative overflow-hidden`}
      animate={{
        boxShadow: health > 50 ? 
          `0 0 30px ${color === 'red' ? '#ef4444' : '#3b82f6'}` : 
          `0 0 10px ${color === 'red' ? '#ef4444' : '#3b82f6'}`,
        scale: isPowerful ? [1, 1.02, 1] : 1
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Power Aura Effect */}
      {isPowerful && (
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r ${color === 'red' ? 'from-red-500/20 to-yellow-500/20' : 'from-blue-500/20 to-cyan-500/20'} rounded-xl`}
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Floating Energy Symbols */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className={`absolute top-4 right-4 text-2xl ${isWinning ? 'opacity-100' : 'opacity-30'}`}
          animate={{
            y: [-5, -15, -5],
            rotate: [0, 10, -10, 0],
            opacity: isWinning ? [0.7, 1, 0.7] : [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {classes.energy}
        </motion.div>
        <motion.div
          className={`absolute bottom-4 left-4 text-xl ${isPowerful ? 'opacity-100' : 'opacity-20'}`}
          animate={{
            scale: isPowerful ? [1, 1.3, 1] : [1, 1.1, 1],
            rotate: [0, 360],
            opacity: isPowerful ? [0.8, 1, 0.8] : [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          {classes.flame}
        </motion.div>
      </div>

      {/* Fighter Info */}
      <div className="mb-4 relative z-10">
        <motion.div
          animate={{
            rotate: votes > 0 ? [0, 2, -2, 0] : 0
          }}
          transition={{ duration: 0.5, repeat: votes > 0 ? 3 : 0 }}
        >
          <img 
            src={project.logo} 
            alt={project.title}
            className={`w-24 h-24 object-contain mx-auto mb-4 rounded-full border-4 border-white/30 ${isPowerful ? 'shadow-lg ' + classes.glow : ''}`}
          />
        </motion.div>
        <h3 className={`text-2xl font-bold ${classes.text} mb-2`}>{project.title}</h3>
      </div>

      {/* Health Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Health</span>
          <span>{health}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-4">
          <motion.div 
            className={`h-4 rounded-full ${health > 50 ? 'bg-green-500' : health > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${health}%` }}
            animate={{ width: `${health}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Vote Count */}
      <div className="mb-4 relative z-10">
        <motion.div 
          className="text-4xl font-bold text-yellow-400 relative"
          animate={{
            scale: votes > 0 ? [1, 1.2, 1] : 1,
            textShadow: isPowerful ? 
              [`0 0 10px #fbbf24`, `0 0 20px #fbbf24`, `0 0 10px #fbbf24`] : 
              `0 0 5px #fbbf24`
          }}
          transition={{ duration: 0.3 }}
        >
          {votes}
          {/* Vote explosion effect */}
          {votes > 0 && (
            <motion.div
              className="absolute -top-2 -right-2 text-lg"
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: [0, 1.5, 0], rotate: [0, 180, 360] }}
              transition={{ duration: 0.6 }}
            >
              💥
            </motion.div>
          )}
        </motion.div>
        <div className="text-lg">Votes</div>
        
        {/* Vote streak indicator */}
        {votes > 10 && (
          <motion.div
            className="text-sm text-orange-400 font-bold"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🔥 ON FIRE! 🔥
          </motion.div>
        )}
      </div>

      {/* Vote Button */}
      <motion.button
        onClick={onVote}
        disabled={!currentUser}
        className={`w-full bg-gradient-to-r ${classes.button} px-6 py-3 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden`}
        whileHover={{ scale: currentUser ? 1.05 : 1 }}
        whileTap={{ scale: currentUser ? 0.95 : 1 }}
        animate={{
          boxShadow: isPowerful ? 
            [`0 0 20px ${color === 'red' ? '#ef4444' : '#3b82f6'}`, `0 0 30px ${color === 'red' ? '#ef4444' : '#3b82f6'}`, `0 0 20px ${color === 'red' ? '#ef4444' : '#3b82f6'}`] :
            `0 0 10px ${color === 'red' ? '#ef4444' : '#3b82f6'}`
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {/* Button energy effect */}
        {isPowerful && (
          <motion.div
            className="absolute inset-0 bg-white/10"
            animate={{
              x: [-100, 200],
              opacity: [0, 0.5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <span className="relative z-10">
          {currentUser ? '🗳️ VOTE!' : 'Login to Vote'}
        </span>
      </motion.button>
    </motion.div>
  );
};

export default BubbleDuels;
