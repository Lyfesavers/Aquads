import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Timer, 
  Users, 
  Target, 
  Share2,
  ExternalLink,
  Play,
  X
} from 'lucide-react';

// Custom hooks
import useSocket from '../hooks/useSocket';
import { 
  useBubbleDuels, 
  useBubbleDuel, 
  useCreateBubbleDuel, 
  useVoteInBubbleDuel, 
  useCancelBubbleDuel 
} from '../hooks/useBubbleDuels';
import { useEligibleAds } from '../hooks/useAds';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const BubbleDuels = ({ currentUser }) => {
  const [activeBattle, setActiveBattle] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [battleStats, setBattleStats] = useState({ project1Votes: 0, project2Votes: 0 });
  const [loading, setLoading] = useState(true);

  const [showFighterSelect, setShowFighterSelect] = useState(false);
  const [selectingFor, setSelectingFor] = useState(null); // 'fighter1' or 'fighter2'
  const [attackAnimation, setAttackAnimation] = useState(null); // { battleId, attacker: 'project1'|'project2', target: 'project1'|'project2' }
  const [liveFeed, setLiveFeed] = useState([]);
  const [isStartingBattle, setIsStartingBattle] = useState(false); // Prevent double-clicking
  const [gifAnimation, setGifAnimation] = useState(null); // Separate state for GIF animations
  const [notification, setNotification] = useState(null); // For bottom-left notifications
  
  // Debounced live feed update for better performance
  const liveFeedUpdateTimeoutRef = useRef(null);
  const pendingLiveFeedUpdates = useRef([]);

    // Use React Query hooks for data fetching
  const { data: allActiveBattles = [], isLoading: battlesLoading } = useBubbleDuels();
  
  // Ensure we have valid data before calling useEligibleAds
  // Handle case where data might be nested (e.g., { battles: [...] })
  let safeAllActiveBattlesForHook = [];
  if (Array.isArray(allActiveBattles)) {
    // Filter out undefined/null elements and ensure all elements are valid objects
    safeAllActiveBattlesForHook = allActiveBattles.filter(battle => 
      battle != null && typeof battle === 'object'
    );
  } else if (allActiveBattles && Array.isArray(allActiveBattles.battles)) {
    safeAllActiveBattlesForHook = allActiveBattles.battles.filter(battle => 
      battle != null && typeof battle === 'object'
    );
  } else if (allActiveBattles && Array.isArray(allActiveBattles.data)) {
    safeAllActiveBattlesForHook = allActiveBattles.data.filter(battle => 
      battle != null && typeof battle === 'object'
    );
  }
  
  const { ads = [], isLoading: adsLoading } = useEligibleAds(safeAllActiveBattlesForHook);
  
  // Set loading state based on both queries
  useEffect(() => {
    setLoading(battlesLoading || adsLoading);
  }, [battlesLoading, adsLoading]);

  // Ensure we have valid data
  const safeAllActiveBattles = safeAllActiveBattlesForHook;
  const safeAds = Array.isArray(ads) ? ads : [];

  // React Query handles all the data fetching automatically

  // Debounced live feed update function for better performance
  const updateLiveFeedDebounced = useCallback((newEntry) => {
    // Add to pending updates
    pendingLiveFeedUpdates.current.push(newEntry);
    
    // Clear existing timeout
    if (liveFeedUpdateTimeoutRef.current) {
      clearTimeout(liveFeedUpdateTimeoutRef.current);
    }
    
    // Set new timeout for batch update
    liveFeedUpdateTimeoutRef.current = setTimeout(() => {
      if (pendingLiveFeedUpdates.current.length > 0) {
        setLiveFeed(prev => [
          ...pendingLiveFeedUpdates.current,
          ...prev.slice(0, Math.max(0, 9 - pendingLiveFeedUpdates.current.length))
        ]);
        pendingLiveFeedUpdates.current = [];
      }
    }, 10); // 10ms debounce for instant response
  }, []);

  // Use React Query for active battle data
  const { data: activeBattleData } = useBubbleDuel(activeBattle?.battleId);
  
  // Update active battle when data changes
  useEffect(() => {
    if (activeBattleData && activeBattle?.battleId === activeBattleData.battleId) {
      setActiveBattle(activeBattleData);
      setBattleStats({
        project1Votes: activeBattleData.project1?.votes || 0,
        project2Votes: activeBattleData.project2?.votes || 0
      });
      setTimeRemaining(activeBattleData.remainingTime || 0);
    }
  }, [activeBattleData, activeBattle?.battleId]);

  // Additional safety check for active battle data
  const safeActiveBattle = activeBattle && activeBattle.project1 && activeBattle.project2 ? activeBattle : null;

  // Use custom socket hook for real-time updates
  const { socket, isConnected: socketConnected, on, off } = useSocket(API_URL);

  // Fetch bubble ads (same as main page)
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await fetch(`${API_URL}/api/ads`);
        if (response.ok) {
          const adsData = await response.json();
          
          // Get IDs of bubbles already in active battles
          const activeBattleBubbleIds = new Set();
          allActiveBattles.forEach(battle => {
            if (battle.status === 'active' || battle.status === 'waiting') {
              activeBattleBubbleIds.add(battle.project1.adId);
              activeBattleBubbleIds.add(battle.project2.adId);
            }
          });
          
          // Filter all eligible ads that are eligible for battles (not already battling)
          const validAds = adsData.filter(ad => {
            const hasLogo = ad.logo;
            const hasTitle = ad.title;
            const isEligible = ad.status === 'active' || ad.status === 'approved';
            const notInBattle = !activeBattleBubbleIds.has(ad.id);
            
            return isEligible && hasLogo && hasTitle && notInBattle;
          });
          
          setAds(validAds);
        }
      } catch (error) {
        // Error fetching ads
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, [allActiveBattles]); // Re-fetch when battles change

  // Refresh active battle data periodically to stay in sync
  useEffect(() => {
    if (!activeBattle) return;

    const refreshActiveBattle = async () => {
      try {
        const response = await fetch(`${API_URL}/api/bubble-duels/${activeBattle.battleId}`);
        if (response.ok) {
          const battleData = await response.json();
          setActiveBattle(battleData);
          setBattleStats({
            project1Votes: battleData.project1.votes,
            project2Votes: battleData.project2.votes
          });
          setTimeRemaining(battleData.remainingTime || 0);
        }
      } catch (error) {
        // Error refreshing active battle
      }
    };

    // Refresh every 1 second for active battles for maximum responsiveness
    const interval = setInterval(refreshActiveBattle, 1000);
    return () => clearInterval(interval);
  }, [activeBattle?.battleId]);

  // Set up socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleBubbleDuelUpdate = (data) => {
      if (data.type === 'vote' && data.battle) {
        // Update active battle if it matches (immediate for user experience)
        if (activeBattle && activeBattle.battleId === data.battle.battleId) {
          setActiveBattle(data.battle);
          setBattleStats({
            project1Votes: data.battle.project1?.votes || 0,
            project2Votes: data.battle.project2?.votes || 0
          });
        }

        // ALSO update the battle in allActiveBattles for immediate list updates
        setAllActiveBattles(prev => prev.map(battle => 
          battle.battleId === data.battle.battleId ? data.battle : battle
        ));

        // Add to live feed immediately - use projectSide from data for instant detection
        const voteData = data.battle;
        const votedFor = data.projectSide || 'project1'; // Default to project1 if not specified
        const projectName = votedFor === 'project1' ? voteData.project1?.title : voteData.project2?.title;
        const color = votedFor === 'project1' ? 'text-red-400' : 'text-blue-400';
        
        // Update live feed immediately without waiting for battleStats
        updateLiveFeedDebounced({
          id: Date.now(),
          message: `⚡ ${projectName || 'Unknown'} gains a vote!`,
          color: color,
          timestamp: new Date().toLocaleTimeString()
        });
      }
      
      if (data.type === 'start' && data.battle) {
        // Add new battle to the list immediately
        setAllActiveBattles(prev => [data.battle, ...prev]);
        
        updateLiveFeedDebounced({
          id: Date.now(),
          message: `🚀 New battle started: ${data.battle.project1?.title || 'Unknown'} vs ${data.battle.project2?.title || 'Unknown'}`,
          color: 'text-yellow-400',
          timestamp: new Date().toLocaleTimeString()
        });
      }
      
      if (data.type === 'end' && data.battle) {
        // Update battle status in the list immediately
        setAllActiveBattles(prev => prev.map(battle => 
          battle.battleId === data.battle.battleId ? data.battle : battle
        ));
        
        const winner = data.battle.winner;
        updateLiveFeedDebounced({
          id: Date.now(),
          message: `🏆 ${winner?.title || 'Unknown'} wins the battle!`,
          color: 'text-green-400',
          timestamp: new Date().toLocaleTimeString()
        });
      }
      
      if (data.type === 'cancel') {
        // Remove cancelled battle from the list immediately
        setAllActiveBattles(prev => prev.filter(battle => battle.battleId !== data.battle?.battleId));
        
        updateLiveFeedDebounced({
          id: Date.now(),
          message: `🚫 Battle cancelled by ${data.cancelledBy || 'Unknown'}`,
          color: 'text-orange-400',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    };

    const handleBattleVoteUpdate = (data) => {
      
      // Update active battle if it matches
      if (activeBattle && activeBattle.battleId === data.battleId) {
        setActiveBattle(prev => ({
          ...prev,
          project1: { ...prev.project1, votes: data.project1Votes },
          project2: { ...prev.project2, votes: data.project2Votes },
          totalVotes: data.totalVotes,
          remainingTime: data.remainingTime
        }));
        
        setBattleStats({
          project1Votes: data.project1Votes,
          project2Votes: data.project2Votes
        });
        
        setTimeRemaining(data.remainingTime);
        
        // Add immediate vote update to live feed for better UX
        const project1Name = activeBattle?.project1?.title || 'Project 1';
        const project2Name = activeBattle?.project2?.title || 'Project 2';
        
        updateLiveFeedDebounced({
          id: Date.now(),
          message: `⚡ Vote updated: ${project1Name} (${data.project1Votes}) vs ${project2Name} (${data.project2Votes})`,
          color: 'text-purple-400',
          timestamp: new Date().toLocaleTimeString()
        });
      }
      
      // ALSO update the battle in allActiveBattles for immediate list updates
      setAllActiveBattles(prev => prev.map(battle => 
        battle.battleId === data.battleId ? {
          ...battle,
          project1: { ...battle.project1, votes: data.project1Votes },
          project2: { ...battle.project2, votes: data.project2Votes },
          totalVotes: data.totalVotes,
          remainingTime: data.remainingTime
        } : battle
      ));
    };

    // Set up event listeners
    on('bubbleDuelUpdate', handleBubbleDuelUpdate);
    on('battleVoteUpdate', handleBattleVoteUpdate);

    // Cleanup
    return () => {
      off('bubbleDuelUpdate', handleBubbleDuelUpdate);
      off('battleVoteUpdate', handleBattleVoteUpdate);
    };
  }, [socket, activeBattle, on, off]);

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

  // Reset loading state when component unmounts or when selected projects change
  useEffect(() => {
    return () => {
      setIsStartingBattle(false);
    };
  }, [selectedProjects]);

  // Cleanup live feed update timeout on unmount
  useEffect(() => {
    return () => {
      if (liveFeedUpdateTimeoutRef.current) {
        clearTimeout(liveFeedUpdateTimeoutRef.current);
      }
    };
  }, []);

  const openFighterSelect = (position) => {
    setSelectingFor(position);
    setShowFighterSelect(true);
  };

  const selectProject = (project) => {
    if (selectingFor === 'fighter1') {
      // Replace fighter 1 or add if empty
      const newSelected = selectedProjects.length > 0 ? 
        [project, selectedProjects[1]].filter(Boolean) : [project];
      setSelectedProjects(newSelected);
    } else if (selectingFor === 'fighter2') {
      // Replace fighter 2 or add if empty
      const newSelected = selectedProjects.length > 0 ? 
        [selectedProjects[0], project].filter(Boolean) : [undefined, project].filter(Boolean);
      setSelectedProjects(newSelected);
    }
    
    setShowFighterSelect(false);
    setSelectingFor(null);
  };

  const removeProject = (position) => {
    if (position === 0) {
      // Remove fighter 1
      setSelectedProjects(selectedProjects.slice(1));
    } else {
      // Remove fighter 2
      setSelectedProjects(selectedProjects.slice(0, 1));
    }
  };

  const startBattle = async () => {
    if (selectedProjects.length !== 2) return;
    
    // Prevent double-clicking
    if (isStartingBattle) return;
    
    setIsStartingBattle(true);
    
    // Declare safetyTimeout at function scope so it can be accessed in cleanup
    let safetyTimeout;

    try {
      // Safety timeout to prevent loading state from getting stuck
      safetyTimeout = setTimeout(() => {
        setIsStartingBattle(false);
      }, 30000); // 30 seconds timeout
      
      // Create battle first
      if (!currentUser || !currentUser.token) {
        clearTimeout(safetyTimeout);
        alert('Please login to create battles!');
        setIsStartingBattle(false);
        return;
      }

      const createResponse = await fetch(`${API_URL}/api/bubble-duels/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
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
            'Authorization': `Bearer ${currentUser.token}`
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
          // Reset loading state on success
          setIsStartingBattle(false);
        } else {
          clearTimeout(safetyTimeout);
          alert(startData.error || 'Failed to start battle');
          setIsStartingBattle(false);
        }
      } else {
        clearTimeout(safetyTimeout);
        if (createResponse.status === 401) {
          alert('Authentication failed. Please login again.');
        } else {
          alert(battleData.error || 'Failed to create battle');
        }
        setIsStartingBattle(false);
      }
    } catch (error) {
      clearTimeout(safetyTimeout);
      // Error starting battle
      alert('Failed to start battle. Please try again.');
      setIsStartingBattle(false);
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

  const cancelBattle = async () => {
    if (activeBattle) {
      try {
        // Cancel the battle on the server
        const response = await fetch(`${API_URL}/api/bubble-duels/${activeBattle.battleId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (response.ok) {
          // Remove from active battles list
          setAllActiveBattles(prev => prev.filter(battle => battle.battleId !== activeBattle.battleId));
        }
      } catch (error) {
        // Error cancelling battle
      }
    }
    
    setActiveBattle(null);
    setSelectedProjects([]);
    setTimeRemaining(0);
    setBattleStats({ project1Votes: 0, project2Votes: 0 });
    setAttackAnimation(null);
    setIsStartingBattle(false); // Reset loading state
  };

  // Cancel any battle from live battles section
  const cancelAnyBattle = async (battleId) => {
    if (!currentUser || !currentUser.token) {
      alert('Please login to cancel battles!');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/bubble-duels/${battleId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (response.ok) {
        // Remove from active battles list
        setAllActiveBattles(prev => prev.filter(battle => battle.battleId !== battleId));
        
        // If this was the active battle, clear it
        if (activeBattle && activeBattle.battleId === battleId) {
          setActiveBattle(null);
          setSelectedProjects([]);
          setTimeRemaining(0);
          setBattleStats({ project1Votes: 0, project2Votes: 0 });
          setAttackAnimation(null);
          setIsStartingBattle(false); // Reset loading state
        }

        alert('Battle cancelled successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel battle');
      }
    } catch (error) {
      // Error cancelling battle
      alert('Failed to cancel battle. Please try again.');
    }
  };

  const startNewGame = () => {
    setActiveBattle(null);
    setSelectedProjects([]);
    setTimeRemaining(0);
    setBattleStats({ project1Votes: 0, project2Votes: 0 });
    setAttackAnimation(null);
    setIsStartingBattle(false); // Reset loading state
  };

  const selectBattle = (battle) => {
    setActiveBattle(battle);
    setTimeRemaining(battle.remainingTime || 0);
    setBattleStats({ 
      project1Votes: battle.project1.votes || 0,
      project2Votes: battle.project2.votes || 0
    });
  };



  // Vote in any battle (for active battles section)
  const voteInBattle = async (battleId, projectSide) => {
    
    if (!currentUser || !currentUser.token) {
      alert('Please login to vote!');
      return;
    }

    const requestBody = { 
      projectSide: projectSide === 'project1Votes' ? 'project1' : 'project2' 
    };

    try {
      const response = await fetch(`${API_URL}/api/bubble-duels/${battleId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        // Update the battle in allActiveBattles
        setAllActiveBattles(prev => prev.map(battle => 
          battle.battleId === battleId ? data.battle : battle
        ));
        
        // Force immediate health recalculation for instant GIF animation
        const maxHealth = 100;
        const newHealth1 = Math.max(0, maxHealth - (data.battle.project2Votes * 2));
        const newHealth2 = Math.max(0, maxHealth - (data.battle.project1Votes * 2));
        
        // Find the current battle to compare health
        const currentBattle = allActiveBattles.find(b => b.battleId === battleId);
        if (currentBattle) {
          const currentHealth1 = Math.max(0, maxHealth - (currentBattle.project2.votes * 2));
          const currentHealth2 = Math.max(0, maxHealth - (currentBattle.project1.votes * 2));
          
          // Check if health decreased to trigger immediate GIF
          if (newHealth1 < currentHealth1 || newHealth2 < currentHealth2) {
            // Determine which fighter was attacked
            const attacker = newHealth1 < currentHealth1 ? 'project2' : 'project1';
            const target = newHealth1 < currentHealth1 ? 'project1' : 'project2';
            
            // Trigger attack GIF animation IMMEDIATELY
            setAttackAnimation({ battleId: battleId, attacker, target });
            setTimeout(() => setAttackAnimation(null), 1500);
          }
        }
        
        // Add immediate vote feedback to live feed for better UX
        const battle = data.battle;
        const projectName = projectSide === 'project1Votes' ? battle.project1?.title : battle.project2?.title;
        const color = projectSide === 'project1Votes' ? 'text-red-400' : 'text-blue-400';
        
        updateLiveFeedDebounced({
          id: Date.now(),
          message: `⚡ You voted for ${projectName || 'Unknown'} in ${battle.project1?.title || 'Unknown'} vs ${battle.project2?.title || 'Unknown'}!`,
          color: color,
          timestamp: new Date().toLocaleTimeString()
        });
        
        // Points awarded silently - no popup needed
      } else {
        if (response.status === 401) {
          alert('Authentication failed. Please login again.');
        } else {
          setNotification({
            message: data.error || 'Failed to vote',
            type: 'error'
          });
          setTimeout(() => setNotification(null), 3000);
        }
      }
    } catch (error) {
      // Error voting in battle
      alert('Failed to vote. Please try again.');
    }
  };

  const vote = async (projectSide) => {
    if (!currentUser) {
      alert('Please login to vote!');
      return;
    }

    if (!activeBattle) return;

    try {
      if (!currentUser || !currentUser.token) {
        alert('Please login to vote!');
        return;
      }

      const response = await fetch(`${API_URL}/api/bubble-duels/${activeBattle.battleId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ 
          projectSide: projectSide === 'project1Votes' ? 'project1' : 'project2' 
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Update local state immediately for instant feedback
        setActiveBattle(prev => ({
          ...prev,
          project1: { ...prev.project1, votes: data.battle.project1Votes },
          project2: { ...prev.project2, votes: data.battle.project2Votes }
        }));
        
        setBattleStats({
          project1Votes: data.battle.project1Votes,
          project2Votes: data.battle.project2Votes
        });
        
        // Force immediate health recalculation for instant GIF animation
        const maxHealth = 100;
        const newHealth1 = Math.max(0, maxHealth - (data.battle.project2Votes * 2));
        const newHealth2 = Math.max(0, maxHealth - (data.battle.project1Votes * 2));
        
        // Check if health decreased to trigger immediate GIF
        if (newHealth1 < (battleStats.project1Votes ? Math.max(0, maxHealth - (battleStats.project1Votes * 2)) : 100) ||
            newHealth2 < (battleStats.project2Votes ? Math.max(0, maxHealth - (battleStats.project2Votes * 2)) : 100)) {
          
          // Determine which fighter was attacked
          const attacker = newHealth1 < (battleStats.project1Votes ? Math.max(0, maxHealth - (battleStats.project1Votes * 2)) : 100) ? 'project2' : 'project1';
          const target = newHealth1 < (battleStats.project1Votes ? Math.max(0, maxHealth - (battleStats.project1Votes * 2)) : 100) ? 'project1' : 'project2';
          
          // Trigger attack GIF animation IMMEDIATELY
          setAttackAnimation({ battleId: activeBattle.battleId, attacker, target });
          setTimeout(() => setAttackAnimation(null), 1500);
        }

        // Add immediate vote feedback to live feed
        const projectName = projectSide === 'project1Votes' ? activeBattle.project1?.title : activeBattle.project2?.title;
        const color = projectSide === 'project1Votes' ? 'text-red-400' : 'text-blue-400';
        
        updateLiveFeedDebounced({
          id: Date.now(),
          message: `⚡ You voted for ${projectName || 'Unknown'}!`,
          color: color,
          timestamp: new Date().toLocaleTimeString()
        });

        // Show notification if points awarded
        if (data.pointsAwarded > 0) {
          setNotification({
            message: `+${data.pointsAwarded} points! 🎉`,
            type: 'success'
          });
          setTimeout(() => setNotification(null), 3000);
        }
      } else {
        if (response.status === 401) {
          alert('Authentication failed. Please login again.');
        } else {
          setNotification({
            message: data.error || 'Failed to vote',
            type: 'error'
          });
          setTimeout(() => setNotification(null), 3000);
        }
      }
    } catch (error) {
      // Error voting
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white">
      {/* Aquads Logo Header */}
      <div className="pt-8 pb-4">
        <div className="container mx-auto px-4 text-center">
          <a href="/" className="inline-block">
            <img 
              src="/Aquadsnewlogo.png" 
              alt="Aquads" 
              className="h-20 mx-auto hover:scale-105 transition-transform duration-300"
            />
          </a>
        </div>
      </div>
      
      {/* Simplified Header */}
      <div className="py-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 text-transparent bg-clip-text">
              🥊 BUBBLE DUELS 🥊
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Bubble Wars Style Crypto Project Battles! The strongest community will rise ⚡
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
          liveFeed={liveFeed}
          onCancelBattle={cancelBattle}
          onNewGame={startNewGame}
        />
      ) : (
                                   <BattleSetup 
            selectedProjects={selectedProjects}
            onOpenFighterSelect={openFighterSelect}
            onRemoveProject={removeProject}
            onStartBattle={startBattle}
            currentUser={currentUser}
            ads={ads}
            isStartingBattle={isStartingBattle}
          />
      )}

                     {/* Active Battles Section */}
                 {allActiveBattles.length > 0 && (
           <ActiveBattlesSection 
             battles={allActiveBattles} 
             currentUser={currentUser}
             onBattleVote={(battleId, projectSide) => voteInBattle(battleId, projectSide)}
             onCancelBattle={cancelAnyBattle}
             onSelectBattle={selectBattle}
           />
         )}

             {/* Street Fighter Style Character Select */}
       {showFighterSelect && (
         <FighterSelectModal
           ads={ads}
           onSelectProject={selectProject}
           onClose={() => {
             setShowFighterSelect(false);
             setSelectingFor(null);
           }}
           selectingFor={selectingFor}
           alreadySelected={selectedProjects}
           isStartingBattle={isStartingBattle}
         />
               )}

        {/* Bottom-right notification */}
        {notification && (
          <div className={`fixed bottom-4 right-4 text-white px-4 py-2 rounded-lg shadow-lg z-[9999] animate-pulse ${
            notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}>
            {notification.message}
          </div>
        )}
    </div>
  );
};

// Battle Setup Component
const BattleSetup = ({ selectedProjects, onOpenFighterSelect, onRemoveProject, onStartBattle, currentUser, ads, isStartingBattle }) => {
  
  const handleFighter1Click = () => {
    onOpenFighterSelect('fighter1');
  };

  const handleFighter2Click = () => {
    onOpenFighterSelect('fighter2');
  };

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
              onRemove={() => onRemoveProject(0)}
            />
          ) : (
            <button 
              onClick={handleFighter1Click}
              className="h-40 w-full border-4 border-dashed border-red-500/50 rounded-lg flex items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-500/10 transition-all duration-300 bg-transparent group"
            >
              <div className="text-center">
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">🥊</div>
                <span className="text-red-300 group-hover:text-red-200">Click to Select Fighter 1</span>
              </div>
            </button>
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
              onRemove={() => onRemoveProject(1)}
            />
          ) : (
            <button 
              onClick={handleFighter2Click}
              className="h-40 w-full border-4 border-dashed border-blue-500/50 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-500/10 transition-all duration-300 bg-transparent group"
            >
              <div className="text-center">
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">🥊</div>
                <span className="text-blue-300 group-hover:text-blue-200">Click to Select Fighter 2</span>
              </div>
            </button>
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
             onClick={() => {
               if (!currentUser) {
                 alert('Please login to start battles!');
                 return;
               }
               
               onStartBattle();
             }}
             disabled={isStartingBattle}
             className={`bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 px-12 py-4 rounded-lg text-2xl font-bold shadow-2xl transform transition-all duration-300 ${
               isStartingBattle 
                 ? 'opacity-50 cursor-not-allowed' 
                 : 'hover:scale-105 cursor-pointer'
             }`}
           >
             {isStartingBattle ? (
               <>
                 <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                 STARTING BATTLE...
               </>
             ) : (
               '🚀 START EPIC BATTLE! 🚀'
             )}
           </button>
        </motion.div>
      )}

             {/* Instructions */}
       <div className="text-center text-gray-300">
         <p className="text-lg mb-2">🥊 Click on the fighter slots above to select your warriors!</p>
         <p className="text-sm opacity-75">Choose 2 bubble projects to battle in epic 1-hour duels</p>
                   {ads.length === 0 && (
            <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <p className="text-blue-300 font-bold">⏳ All eligible bubbles are currently in battles!</p>
              <p className="text-blue-200 text-sm">Wait for battles to end or check the Live Battles section below</p>
            </div>
          )}
         {!currentUser && (
           <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
             <p className="text-yellow-300 font-bold">⚠️ Please login to create and participate in battles!</p>
           </div>
         )}
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
        className="w-24 h-24 object-contain mx-auto mb-2 rounded-full border-2 border-white/30"
        style={{
          objectFit: 'contain',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
      <h4 className="font-bold text-white truncate">{project.title}</h4>
      <p className="text-sm opacity-75">🗳️ {project.bullishVotes || 0} votes</p>
    </motion.div>
  );
};

// Battle Arena Component
const BattleArena = ({ battle, timeRemaining, battleStats, onVote, onShare, currentUser, liveFeed, onCancelBattle, onNewGame }) => {
  const project1Health = Math.max(0, 100 - (battleStats.project2Votes * 2));
  const project2Health = Math.max(0, 100 - (battleStats.project1Votes * 2));
  
  // Check if user has already voted in this battle
  const hasVoted = currentUser && battle.voters && battle.voters.some(voter => 
    voter.userId === currentUser.userId
  );
  
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
          hasVoted={hasVoted}
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
          hasVoted={hasVoted}
        />
      </div>

      {/* Live Vote Feed */}
      <div className="bg-black/50 rounded-lg p-6 max-h-40 overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Users className="mr-2" />
          Live Vote Feed
        </h3>
        <div className="space-y-2 text-sm">
          {liveFeed.length > 0 ? (
            liveFeed.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`${entry.color} flex justify-between items-center`}
              >
                <span>{entry.message}</span>
                <span className="text-gray-500 text-xs">{entry.timestamp}</span>
              </motion.div>
            ))
          ) : (
            <div className="text-gray-400 text-center">
              🔥 Battle is starting! Votes will appear here...
            </div>
          )}
        </div>
      </div>

      {/* Battle Control Buttons */}
      <div className="flex gap-4 mt-6">
        {/* Cancel Button - Only for battle creator */}
        {currentUser && battle.createdBy === currentUser.userId && (
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to cancel this battle?')) {
                onCancelBattle();
              }
            }}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            <ExternalLink className="mr-2" size={20} />
            Cancel Battle
          </button>
        )}
        
        <button
          onClick={() => {
            if (window.confirm('Start a new battle? This will end the current battle.')) {
              onNewGame();
            }
          }}
          className={`${currentUser && battle.createdBy === currentUser.userId ? 'flex-1' : 'w-full'} bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center`}
        >
          <Play className="mr-2" size={20} />
          New Game
        </button>
      </div>
    </div>
  );
};

// Fighter Display Component
const FighterDisplay = ({ project, votes, health, color, position, onVote, currentUser, hasVoted }) => {
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
            className={`w-32 h-32 object-contain mx-auto mb-4 rounded-full border-4 border-white/30 ${isPowerful ? 'shadow-lg ' + classes.glow : ''}`}
            style={{
              objectFit: 'contain',
              maxWidth: '95%',
              maxHeight: '95%'
            }}
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

      {/* Vote Button or Voted Message */}
      {!hasVoted ? (
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
      ) : (
        <div className="text-center text-green-400 font-bold text-sm py-3">
          ✅ You voted in this battle!
        </div>
      )}
    </motion.div>
  );
};

// Street Fighter Style Character Select Modal
const FighterSelectModal = ({ ads, onSelectProject, onClose, selectingFor, alreadySelected, isStartingBattle }) => {
  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 rounded-xl p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h2 
            className="text-4xl font-bold mb-4"
            animate={{
              textShadow: ['0 0 20px #fff', '0 0 30px #fff', '0 0 20px #fff']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 text-transparent bg-clip-text">
              SELECT YOUR {selectingFor === 'fighter1' ? 'RED' : 'BLUE'} FIGHTER
            </span>
          </motion.h2>
          <p className="text-lg text-gray-300">
            Choose a bubble project to represent the {selectingFor === 'fighter1' ? 'Red Corner' : 'Blue Corner'}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold"
        >
          ×
        </button>

        {/* Fighter Grid - Street Fighter Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                     {ads.length === 0 ? (
             <div className="col-span-full text-center py-12">
               <div className="text-gray-400 text-lg mb-4">
                 🚫 No available projects for battle
               </div>
               <div className="text-gray-500 text-sm">
                 All active projects are currently in battles or waiting to start
               </div>
               <div className="text-gray-400 text-xs mt-2">
                 Check back later or wait for current battles to end
               </div>
             </div>
           ) : ads.map((ad, index) => {
            const isAlreadySelected = alreadySelected.find(p => p && p.id === ad.id);
            const isDisabled = isAlreadySelected;
            
            return (
              <motion.div
                key={ad.id}
                className={`
                  relative group cursor-pointer
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                `}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={!isDisabled ? { scale: 1.05, y: -5 } : {}}
                whileTap={!isDisabled ? { scale: 0.95 } : {}}
                onClick={() => !isDisabled && onSelectProject(ad)}
              >
                {/* Fighter Portrait */}
                <div className={`
                  bg-gradient-to-br ${selectingFor === 'fighter1' ? 'from-red-600 to-red-800' : 'from-blue-600 to-blue-800'} 
                  rounded-lg p-4 border-2 
                  ${selectingFor === 'fighter1' ? 'border-red-400' : 'border-blue-400'}
                  ${!isDisabled ? 'group-hover:shadow-lg group-hover:shadow-' + (selectingFor === 'fighter1' ? 'red' : 'blue') + '-500/50' : ''}
                  transition-all duration-300
                `}>
                  
                  {/* Project Logo */}
                  <div className="aspect-square mb-3 bg-white/10 rounded-lg p-1 flex items-center justify-center">
                    <img 
                      src={ad.logo} 
                      alt={ad.title}
                      className="w-full h-full object-contain rounded"
                      style={{
                        objectFit: 'contain',
                        maxWidth: '95%',
                        maxHeight: '95%'
                      }}
                    />
                  </div>
                  
                  {/* Project Name */}
                  <h3 className="text-white font-bold text-sm text-center truncate mb-2">
                    {ad.title}
                  </h3>
                  
                  {/* Stats */}
                  <div className="text-xs text-center text-gray-300">
                    <div>🗳️ {ad.bullishVotes || 0} votes</div>
                    {ad.isBumped && (
                      <div className="text-yellow-400 font-bold mt-1">⭐ BUMPED</div>
                    )}
                  </div>
                  
                  {/* Selection Indicator */}
                  {!isDisabled && (
                    <motion.div
                      className={`
                        absolute inset-0 rounded-lg border-4 
                        ${selectingFor === 'fighter1' ? 'border-red-400' : 'border-blue-400'} 
                        opacity-0 group-hover:opacity-100
                      `}
                      animate={{
                        boxShadow: [
                          `0 0 20px ${selectingFor === 'fighter1' ? '#ef4444' : '#3b82f6'}`,
                          `0 0 30px ${selectingFor === 'fighter1' ? '#ef4444' : '#3b82f6'}`,
                          `0 0 20px ${selectingFor === 'fighter1' ? '#ef4444' : '#3b82f6'}`
                        ]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  
                  {/* Already Selected Overlay */}
                  {isDisabled && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <div className="text-white font-bold text-xs text-center">
                        ALREADY<br/>SELECTED
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

                 {/* Footer */}
         <div className="text-center mt-8 text-gray-400">
           <p>💡 Click on any fighter to select them for battle!</p>
           <p className="text-sm mt-2">Total Available Fighters: {ads.length}</p>
           {isStartingBattle && (
             <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
               <div className="flex items-center justify-center space-x-2">
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                 <span className="text-blue-300 text-sm">Starting battle...</span>
               </div>
             </div>
           )}
         </div>
      </div>
    </div>
  );
};

// Active Battles Section Component
const ActiveBattlesSection = ({ battles, onBattleVote, currentUser, onCancelBattle, onSelectBattle }) => {
  const activeBattles = battles.filter(battle => battle.status === 'active');

  if (activeBattles.length === 0) return null;

  return (
    <div className="mt-16 mb-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-4xl font-bold bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 bg-clip-text text-transparent mb-4">
          🔥 LIVE BATTLES 🔥
        </h2>
        <p className="text-gray-300 text-lg">
          Join the action! Vote in ongoing battles and earn points. Points = Cash $$$
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                   {activeBattles.map((battle, index) => (
            <ActiveBattleCard 
              key={battle.battleId} 
              battle={battle} 
              onBattleVote={onBattleVote} 
              onCancelBattle={onCancelBattle}
              currentUser={currentUser}
              index={index}
              onSelectBattle={onSelectBattle}
            />
          ))}
      </div>
    </div>
  );
};

// Individual Active Battle Card Component
const ActiveBattleCard = ({ battle, onBattleVote, onCancelBattle, currentUser, index, onSelectBattle }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [health1, setHealth1] = useState(100);
  const [health2, setHealth2] = useState(100);
  const [showKOAnimation, setShowKOAnimation] = useState(false);
  const [localAttackAnimation, setLocalAttackAnimation] = useState(null);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Use the remainingTime field from the battle object
      if (battle.remainingTime && typeof battle.remainingTime === 'number') {
        setTimeLeft(battle.remainingTime);
      } else {
        setTimeLeft(0);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [battle.remainingTime]);

  // Calculate health based on votes and track changes for GIF animations
  useEffect(() => {
    const maxHealth = 100;
    const health1Value = Math.max(0, maxHealth - (battle.project2.votes * 2));
    const health2Value = Math.max(0, maxHealth - (battle.project1.votes * 2));
    
    // Check if health decreased (attack happened) by comparing with current state
    if (health1Value < health1 || health2Value < health2) {
      // Determine which fighter was attacked
      const attacker = health1Value < health1 ? 'project2' : 'project1';
      const target = health1Value < health1 ? 'project1' : 'project2';
      
      // Trigger attack GIF animation IMMEDIATELY
      setLocalAttackAnimation({ battleId: battle.battleId, attacker, target });
      setTimeout(() => setLocalAttackAnimation(null), 1500); // Reduced to 1.5s for faster response
    }
    
    // Check if health reached 0 (KO happened) - always check this
    if (health1Value <= 0 || health2Value <= 0) {
      setShowKOAnimation(true);
      setTimeout(() => setShowKOAnimation(false), 1500); // Reduced to 1.5s for faster response
    }
    
    // Update current health
    setHealth1(health1Value);
    setHealth2(health2Value);
  }, [battle.project1.votes, battle.project2.votes, battle.battleId, health1, health2]);



  const handleVote = async (projectSide) => {
    if (isVoting) return; // Prevent multiple clicks
    
    setIsVoting(true);
    
    try {
      await onBattleVote(battle.battleId, projectSide);
    } catch (error) {
      // Error in handleVote
    } finally {
      // Reset voting state after a short delay to prevent immediate re-clicks
      setTimeout(() => setIsVoting(false), 1000);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalVotes = battle.project1.votes + battle.project2.votes;
  const project1Percentage = totalVotes > 0 ? (battle.project1.votes / totalVotes) * 100 : 50;
  const project2Percentage = totalVotes > 0 ? (battle.project2.votes / totalVotes) * 100 : 50;

  const hasVoted = currentUser && battle.voters && battle.voters.some(voter => 
    voter.userId === currentUser.userId
  );

  return (
    <>
      {/* Attack Animation Modal */}
      {localAttackAnimation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl max-h-[85vh] flex items-center justify-center">
            <img 
              src="/attack.gif" 
              alt="Attack Animation"
              className="w-full h-full object-contain rounded-xl shadow-2xl"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
            <div className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/50 px-4 py-2 rounded-lg">
            </div>
          </div>
        </div>
      )}

      {/* KO Animation Modal */}
      {showKOAnimation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl max-h-[85vh] flex items-center justify-center">
            <img 
              src="/ko.gif" 
              alt="KO Animation"
              className="w-full h-full object-contain rounded-xl shadow-2xl"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
            <div className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/50 px-4 py-2 rounded-lg">
              💀 KNOCKOUT! 💀
            </div>
          </div>
        </div>
      )}

      {/* Battle Card */}
      <div 
        className={`bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 border transition-all duration-300 relative overflow-visible cursor-pointer hover:scale-105 ${
          showKOAnimation ? 'border-red-500 shadow-2xl shadow-red-500/50 z-20' :
          localAttackAnimation ? 'border-yellow-400 shadow-2xl shadow-yellow-400/30 z-10' : 
          'border-gray-700 hover:border-gray-600'
        }`}
        onClick={() => onSelectBattle(battle)}
      >
        
        {/* Health-based Visual Effects */}
        {(health1 <= 20 || health2 <= 20) && (
          <div className="absolute inset-0 border-4 border-red-500/50 rounded-xl pointer-events-none">
          </div>
        )}

        {/* Battle Header */}
        <div className="text-center mb-4 relative">
          {/* Cancel Button - Only for battle creator */}
          {currentUser && battle.createdBy === currentUser.userId && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this battle?')) {
                  onCancelBattle(battle.battleId);
                }
              }}
              className="absolute top-0 right-0 w-8 h-8 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 hover:border-red-500 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 transition-all duration-200 z-10"
              title="Cancel Battle (Only you can cancel battles you created)"
            >
              <X size={16} />
            </button>
          )}
          
          <div className="text-red-400 font-bold text-sm mb-1">⚔️ LIVE BATTLE</div>
          <div className="text-white font-mono text-lg">
            ⏰ {formatTime(timeLeft)}
          </div>
        </div>

        {/* Fighters */}
        <div className="flex items-center justify-between mb-4">
          {/* Fighter 1 */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto mb-2 relative">
              <img 
                src={battle.project1.logo} 
                alt={battle.project1.title}
                className={`w-full h-full object-contain rounded-full border-4 ${
                  showKOAnimation ? 'border-red-500 shadow-2xl shadow-red-500/50' :
                  localAttackAnimation && localAttackAnimation.attacker === 'project1' ? 'border-yellow-400 shadow-2xl shadow-yellow-400/50' : 
                  health1 <= 20 ? 'border-red-500 shadow-lg shadow-red-500/30' : 'border-red-400'
                }`}
              />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                1
              </div>
            </div>
            <h4 className="text-white font-bold text-sm truncate">{battle.project1.title}</h4>
            <div className="text-red-400 font-bold">{battle.project1.votes} votes</div>
            
            {/* Health Bar for Fighter 1 */}
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>HP</span>
                <span className={health1 <= 20 ? 'text-red-400 font-bold' : 'text-gray-400'}>{health1}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    health1 > 50 ? 'bg-green-500' : health1 > 25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${health1}%` }}
                />
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="px-4">
            <div className="text-yellow-400 font-bold text-2xl">
              {showKOAnimation ? '💀' : localAttackAnimation ? '💥' : '⚔️'}
            </div>
            
            {/* Health Warning Indicator */}
            {(health1 <= 20 || health2 <= 20) && (
              <div className="text-red-400 text-xs font-bold mt-2">
                ⚠️ LOW HP! ⚠️
              </div>
            )}
          </div>

          {/* Fighter 2 */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto mb-2 relative">
              <img 
                src={battle.project2.logo} 
                alt={battle.project2.title}
                className={`w-full h-full object-contain rounded-full border-4 ${
                  showKOAnimation ? 'border-red-500 shadow-2xl shadow-red-500/50' :
                  localAttackAnimation && localAttackAnimation.attacker === 'project2' ? 'border-yellow-400 shadow-2xl shadow-yellow-400/50' : 
                  health2 <= 20 ? 'border-red-500 shadow-lg shadow-red-500/30' : 'border-blue-400'
                }`}
              />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                2
              </div>
            </div>
            <h4 className="text-white font-bold text-sm truncate">{battle.project2.title}</h4>
            <div className="text-blue-400 font-bold">{battle.project2.votes} votes</div>
            
            {/* Health Bar for Fighter 2 */}
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>HP</span>
                <span className={health2 <= 20 ? 'text-red-400 font-bold' : 'text-gray-400'}>{health2}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    health2 > 50 ? 'bg-green-500' : health2 > 25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${health2}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex h-3 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
              style={{ width: `${project1Percentage}%` }}
            />
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${project2Percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{project1Percentage.toFixed(1)}%</span>
            <span>{project2Percentage.toFixed(1)}%</span>
          </div>
        </div>

        {/* Vote Buttons */}
        {currentUser && !hasVoted ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleVote('project1Votes')}
              disabled={isVoting}
              className={`flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 text-sm ${
                isVoting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isVoting ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Voting...
                </>
              ) : (
                'Vote 1'
              )}
            </button>
            <button
              onClick={() => handleVote('project2Votes')}
              disabled={isVoting}
              className={`flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 text-sm ${
                isVoting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isVoting ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Voting...
                </>
              ) : (
                'Vote 2'
              )}
            </button>
          </div>
        ) : hasVoted ? (
          <div className="text-center text-green-400 font-bold text-sm">
            ✅ You voted in this battle!
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm">
            Login to vote in this battle
          </div>
        )}

        {/* Target Progress */}
        <div className="mt-3 text-center text-xs text-gray-400">
          Target: {battle.targetVotes} votes • Total: {totalVotes}
        </div>
      </div>
    </>
  );
};

export default BubbleDuels;
