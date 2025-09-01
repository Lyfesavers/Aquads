import React, { useState, useEffect, useRef } from 'react';
import { fetchMyPoints, socket } from '../services/api';



// Horse Racing Game - Aquads Game Hub
// A betting game where users can bet affiliate points on horse races

const HorseRacing = ({ currentUser }) => {
  // Game state
  const [horses, setHorses] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [currentBet, setCurrentBet] = useState(null);
  const [raceInProgress, setRaceInProgress] = useState(false);
  const [raceFinished, setRaceFinished] = useState(false);
  const [raceResults, setRaceResults] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  


  const raceTrackRef = useRef(null);
  const hasSubmittedRef = useRef(false);
  
  // Audio system state
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [currentCommentary, setCurrentCommentary] = useState('');
  const audioContextRef = useRef(null);
  const crowdSoundRef = useRef(null);
  const hoovesSoundRef = useRef(null);
  const commentaryTimeoutRef = useRef(null);

  // Comeback mechanics state
  const [comebackTriggered, setComebackTriggered] = useState(false);
  const [comebackHorse, setComebackHorse] = useState(null);

  // Race completion state management
  const [raceCompleting, setRaceCompleting] = useState(false); // Prevents spam during race end sequence

  // Advanced Casino Psychology System - Complete Addiction Machine
  const calculateCasinoPsychology = (points) => {
    // Dynamic ceiling detection with randomization to prevent exploitation
    const getCeilingThreshold = (basePoints, variance = 0.06) => {
      return basePoints + (Math.random() - 0.5) * basePoints * variance;
    };
    
    // Phase identification with sophisticated psychological targeting
    let phase = 'unknown';
    let winRate = 0.5; // Base 50% win rate
    let psychologyBonus = 0;
    
    // CRITICAL: 1K SAFETY NET - Never let them stay below 1000 points
    if (points < 1000) {
      phase = 'safety_net';
      winRate = 0.78; // 78% win rate - FORCE THEM BACK ABOVE 1K!
      psychologyBonus = 0.12; // Extra 12% boost
      // Safety net active - boosting win chances
    } else if (points <= 500) {
      // HONEYMOON PHASE - Hook new players (this won't trigger due to 1k safety net, but keep for logic)
      phase = 'honeymoon';
      winRate = 0.70; // 70% win rate - Very generous
      psychologyBonus = 0.08; // Extra 8% boost for confidence
    } else if (points <= 1500) {
      // BUILDING CONFIDENCE - Just above safety net
      phase = 'building';
      winRate = 0.62; // 62% win rate - Still very positive
      psychologyBonus = 0.05; // 5% confidence boost
    } else if (points <= 2500) {
      // EARLY HOOK - Keep them engaged
      phase = 'early_hook';
      winRate = 0.58; // 58% win rate - Positive bias
      
      // Dynamic ceiling check around 2200-2400
      if (points > getCeilingThreshold(2300, 0.08)) {
        winRate = 0.45; // Pullback mode
        phase = 'ceiling_pullback';
      }
    } else if (points <= 4000) {
      // MAIN ADDICTION ZONE - Balanced to keep them cycling
      phase = 'addiction_zone';
      winRate = 0.52; // 52% win rate - Slight positive bias
      
      // Dynamic ceiling check around 3600-3800
      if (points > getCeilingThreshold(3700, 0.08)) {
        winRate = 0.43; // Pullback mode
        phase = 'ceiling_pullback';
      }
    } else if (points <= 6000) {
      // MID-TIER CHALLENGE - Introduce more resistance
      phase = 'mid_challenge';
      winRate = 0.48; // 48% win rate - Slight house edge
      
      // Dynamic ceiling check around 5500-5800
      if (points > getCeilingThreshold(5650, 0.07)) {
        winRate = 0.40; // Stronger pullback
        phase = 'ceiling_pullback';
      }
    } else if (points <= 7500) {
      // HIGH STAKES ZONE - Noticeable difficulty
      phase = 'high_stakes';
      winRate = 0.45; // 45% win rate - Clear house edge
      
      // Dynamic ceiling check around 7000-7300
      if (points > getCeilingThreshold(7150, 0.06)) {
        winRate = 0.37; // Strong pullback
        phase = 'ceiling_pullback';
      }
    } else if (points <= 8500) {
      // ELITE TERRITORY - Significant challenge
      phase = 'elite_zone';
      winRate = 0.42; // 42% win rate - Significant house edge
      
      // Tighter ceiling control around 8000-8300
      if (points > getCeilingThreshold(8150, 0.05)) {
        winRate = 0.34; // Very strong pullback
        phase = 'ceiling_pullback';
      }
    } else if (points <= 9200) {
      // GATEKEEPER LEVEL - Heavy resistance
      phase = 'gatekeeper';
      winRate = 0.38; // 38% win rate - Heavy house edge
      
      // Very tight ceiling control around 8800-9000
      if (points > getCeilingThreshold(8900, 0.04)) {
        winRate = 0.30; // Brutal pullback
        phase = 'ceiling_pullback';
      }
    } else {
      // FINAL GUARDIAN - Maximum resistance before 10k
      phase = 'final_guardian';
      winRate = 0.35; // 35% win rate - Maximum house edge
      
      // Emergency pullback if approaching 10k
      if (points > 9600) {
        winRate = 0.25; // EMERGENCY pullback
        phase = 'emergency_pullback';
        // Emergency pullback active
      }
    }
    
    // Convert win rate to speed multiplier (affects how fast player's horse runs)
    // Win rate of 50% = 1.0 multiplier, 25% = 0.5 multiplier, 75% = 1.5 multiplier
    const baseMultiplier = 0.4 + (winRate * 1.2); // More dramatic range
    const finalMultiplier = Math.min(1.6, Math.max(0.3, baseMultiplier + psychologyBonus));
    
    return {
      phase,
      winRate,
      speedMultiplier: finalMultiplier,
      pullbackActive: phase.includes('pullback') || phase.includes('emergency'),
      psychologyBonus,
      safetyNetActive: phase === 'safety_net'
    };
  };

  // Initialize component
  useEffect(() => {
    loadUserPoints();
    initializeHorses();
    loadGameHistory();
  }, [currentUser]);

  // Load user points
  const loadUserPoints = async () => {
    if (!currentUser) {
      setUserPoints(0);
      return;
    }
    
    try {
      const data = await fetchMyPoints();
      setUserPoints(data.points || 0);
    } catch (error) {
      console.error('Failed to load points:', error);
      setUserPoints(0);
    }
  };

  // Initialize horses for a new race from backend
  const initializeHorses = async () => {
    if (!currentUser) {
      setHorses([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/horse-racing/race-data`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load race data: ${response.status}`);
      }

      const data = await response.json();
      const raceHorses = data.horses.map(horse => ({
        ...horse,
        position: 0,
        lane: horse.id,
        finished: false,
        finishTime: null
      }));
      setHorses(raceHorses);
    } catch (error) {
      console.error('Failed to initialize horses:', error);
      setError('Failed to load race data. Please try again.');
      setHorses([]);
    } finally {
      setLoading(false);
    }
  };

  // No need to submit to leaderboard - horse racing API already handles all point management
  const updateAfterRace = async () => {
    try {
      // Just reload points and history from server
      loadUserPoints();
      loadGameHistory();
    } catch (error) {
      console.error('Failed to update after race:', error);
    }
  };

  // Load game history from horse racing API (with fallback for deployment)
  const loadGameHistory = async () => {
    if (!currentUser) {
      setGameHistory([]);
      return;
    }
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/horse-racing/history?limit=10`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // If horse racing history endpoint not available yet, just skip history loading
        setGameHistory([]);
        return;
      }
      
      const data = await response.json();
      setGameHistory(data.history || []);
    } catch (error) {
      setGameHistory([]);
    }
  };

  // Audio System Functions (Duck Hunt style)
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Play sound using Duck Hunt pattern
  const playRaceSound = (soundName) => {
    if (!audioEnabled) return;
    
    try {
      const ctx = getAudioContext();
      
      switch(soundName) {
        case 'startingBell':
          playStartingBellSound(ctx);
          break;
        case 'hoofBeat':
          playHoofBeatSound(ctx);
          break;
        case 'crowdCheer':
          playCrowdCheerSound(ctx);
          break;
        case 'finishSound':
          playFinishLineSound(ctx);
          break;
        case 'commentary':
          playCommentaryBeep(ctx);
          break;
        default:
          console.error('Unknown race sound:', soundName);
      }
    } catch (error) {
      console.error('Failed to play race sound:', soundName, error);
    }
  };

  // Starting bell sound (Duck Hunt style)
  const playStartingBellSound = (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  // Hoof beat sound (Duck Hunt style)
  const playHoofBeatSound = (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  // Crowd cheer sound (Duck Hunt style)
  const playCrowdCheerSound = (ctx) => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.value = Math.random() * 200 + 100;
        
        gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }, i * 100);
    }
  };

  // Finish line sound (Duck Hunt style)
  const playFinishLineSound = (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(volume * 0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  };

  // Commentary beep (Duck Hunt style)
  const playCommentaryBeep = (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.value = 150 + Math.random() * 100;
    
    gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  // Simplified audio functions using Duck Hunt pattern
  const playStartingBell = () => {
    playRaceSound('startingBell');
  };

  const playHoovesSound = () => {
    // Play hooves sound repeatedly during race
    if (hoovesSoundRef.current) {
      clearInterval(hoovesSoundRef.current);
    }
    
    hoovesSoundRef.current = setInterval(() => {
      playRaceSound('hoofBeat');
    }, 400);
  };

  const stopHoovesSound = () => {
    if (hoovesSoundRef.current) {
      clearInterval(hoovesSoundRef.current);
      hoovesSoundRef.current = null;
    }
  };

  const playCrowdCheer = () => {
    playRaceSound('crowdCheer');
  };

  const playFinishSound = () => {
    playRaceSound('finishSound');
    setTimeout(() => playRaceSound('crowdCheer'), 200);
  };

  // Dynamic race commentary
  const raceCommentary = [
    "And they're off!",
    "It's a close race!",
    "Horse number {horse} is taking the lead!",
    "What an exciting race we have here!",
    "The horses are neck and neck!",
    "Coming around the final turn!",
    "It's anyone's race!",
    "The crowd is on their feet!",
    "What a finish!",
    "And the winner is horse number {winner}!"
  ];

  // Comeback-specific commentary
  const comebackCommentary = [
    "Wait! Something's happening at the back!",
    "An incredible surge from behind!",
    "This is unbelievable! Look at that comeback!",
    "The underdog is making a charge!",
    "What a dramatic turn of events!",
    "This is why we love horse racing!",
    "Against all odds, they're catching up!",
    "The crowd can't believe what they're seeing!"
  ];

  // Advanced comeback system with sophisticated psychology
  const checkForComeback = (horses, maxPosition) => {
    // Only trigger comeback in final 30% of race and if not already triggered
    if (maxPosition < 70 || comebackTriggered) return null;
    
    const userHorse = horses.find(h => h.id === currentBet?.horseId);
    const isUserOnWorstOdds = userHorse && userHorse.odds >= Math.max(...horses.map(h => h.odds));
    const isUserOnGoodOdds = userHorse && userHorse.odds <= Math.min(...horses.map(h => h.odds));
    
    // Use our sophisticated psychology system for comeback chances
    const psychologyData = calculateCasinoPsychology(userPoints);
    let pointsBasedBoost = 0;
    
    // Psychology-based comeback boosts
    switch (psychologyData.phase) {
      case 'safety_net':
        pointsBasedBoost = 0.70; // Massive boost when below 1k
        // Safety net comeback active
        break;
      case 'building':
        pointsBasedBoost = 0.45; // Large boost for confidence building
        break;
      case 'early_hook':
        pointsBasedBoost = 0.35; // Good boost in early hook phase
        break;
      case 'addiction_zone':
        pointsBasedBoost = 0.25; // Moderate boost in addiction zone
        break;
      case 'mid_challenge':
        pointsBasedBoost = 0.15; // Small boost in mid challenge
        break;
      case 'high_stakes':
        pointsBasedBoost = 0.08; // Tiny boost in high stakes
        break;
      case 'elite_zone':
        pointsBasedBoost = 0.04; // Very small boost for elites
        break;
      case 'gatekeeper':
      case 'final_guardian':
        pointsBasedBoost = 0.02; // Minimal boost at top levels
        break;
      case 'ceiling_pullback':
      case 'emergency_pullback':
        pointsBasedBoost = 0.0; // No boost during pullbacks
        break;
      default:
        pointsBasedBoost = 0.1; // Default small boost
    }
    
    // Base comeback chances with psychological manipulation
    let comebackChance;
    if (isUserOnWorstOdds) {
      comebackChance = 0.30 + pointsBasedBoost; // Base 30% + psychology boost
    } else if (isUserOnGoodOdds) {
      comebackChance = 0.12 + pointsBasedBoost; // Base 12% + psychology boost
    } else {
      comebackChance = 0.20 + pointsBasedBoost; // Base 20% + psychology boost
    }
    
    // Cap at 85% so it's not too obvious
    comebackChance = Math.min(comebackChance, 0.85);
    
    if (Math.random() > comebackChance) return null;
    
    // Find horses in last 3 positions who could make a comeback
    const sortedByPosition = [...horses].sort((a, b) => b.position - a.position);
    const lastThreeHorses = sortedByPosition.slice(-3);
    
    // If user bet on worst odds horse and it's in last 3, prioritize it
    let potentialComebackHorse;
    if (isUserOnWorstOdds && lastThreeHorses.includes(userHorse)) {
      potentialComebackHorse = userHorse; // Give user's horse the comeback
      console.log(`🎯 USER'S UNDERDOG COMEBACK! Horse #${potentialComebackHorse.id + 1} (${potentialComebackHorse.name}) with ${potentialComebackHorse.odds}:1 odds!`);
    } else {
      // Prioritize horses with worst odds (highest odds = worst chances)
      const sortedByOdds = lastThreeHorses.sort((a, b) => b.odds - a.odds);
      potentialComebackHorse = sortedByOdds[0]; // Pick worst odds horse first
      console.log(`🏇 RANDOM COMEBACK! Horse #${potentialComebackHorse.id + 1} (${potentialComebackHorse.name}) with ${potentialComebackHorse.odds}:1 odds!`);
    }
    
    // Reduced gap requirement - just need to be behind (at least 5 positions)
    const leadingPosition = sortedByPosition[0].position;
    if (leadingPosition - potentialComebackHorse.position < 5) return null;
    
    return potentialComebackHorse;
  };

  const playCommentary = (message, delay = 0) => {
    setTimeout(() => {
      // Update commentary text on static board
      setCurrentCommentary(message);
      
      // Play audio beeps if enabled
      if (audioEnabled) {
        const words = message.split(' ');
        words.forEach((word, index) => {
          setTimeout(() => {
            playRaceSound('commentary');
          }, index * 200);
        });
      }
      
      // Clear commentary after message duration (longer for important messages)
      let messageDuration = Math.max(4000, message.length * 120); // At least 4 seconds, longer for longer messages
      
      // Special timing for key messages
      if (message.includes('winner is') || message.includes('Congratulations') || message.includes('Better luck')) {
        messageDuration = 6000; // Show winner/result messages longer
      }
      
      setTimeout(() => {
        setCurrentCommentary(''); // Clear message, board stays visible
      }, messageDuration);
    }, delay);
  };

  // Initialize audio on component mount
  useEffect(() => {
    return () => {
      stopHoovesSound();
      if (commentaryTimeoutRef.current) {
        clearTimeout(commentaryTimeoutRef.current);
      }
    };
  }, [audioEnabled]);

  // Select a horse for betting
  const selectHorse = (horseId) => {
    if (raceInProgress || !currentUser) return;
    
    setCurrentBet({
      horseId,
      amount: 0,
      placed: false
    });
  };

  // Set bet amount
  const setBetAmount = (amount) => {
    if (!currentBet || raceInProgress) return;
    
    const maxBet = Math.min(amount, userPoints);
    setCurrentBet(prev => ({
      ...prev,
      amount: maxBet
    }));
  };

  // Place bet with safety net - never let players go broke!
  const placeBet = async () => {
    if (!currentBet || !currentUser || currentBet.amount < 10) {
      alert('Invalid bet amount! Minimum bet is 10 points.');
      return;
    }

    // SMART SAFETY NET: Psychology-based with 1k floor protection
    const psychologyData = calculateCasinoPsychology(userPoints);
    let minKeep = 15; // Base minimum to keep
    
    // Dynamic reserves based on psychology phases and 1k safety net
    if (psychologyData.phase === 'final_guardian' || psychologyData.phase === 'emergency_pullback') {
      minKeep = 400; // Heavy restriction near 10k
    } else if (psychologyData.phase === 'gatekeeper') {
      minKeep = 250; // Significant restriction in gatekeeper zone
    } else if (psychologyData.phase === 'elite_zone') {
      minKeep = 150; // Moderate restriction in elite zone
    } else if (psychologyData.phase === 'high_stakes') {
      minKeep = 100; // Some restriction in high stakes
    } else if (psychologyData.phase === 'safety_net') {
      minKeep = 10; // Minimal restriction when below 1k - let them try to recover
    } else if (psychologyData.phase === 'building' || psychologyData.phase === 'early_hook') {
      minKeep = 20; // Lower restriction for building confidence
    }
    
    if (userPoints - currentBet.amount < minKeep) {
      const phaseMessage = `Smart betting limit! You must keep at least ${minKeep} points to continue playing.`;
      
      alert(phaseMessage);
      const safeBet = Math.max(10, userPoints - minKeep); // Keep minimum bet at 10
      setBetAmount(safeBet);
      return;
    }

    setLoading(true);
    
    try {
      // Call horse racing backend API
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/horse-racing/place-bet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          horseId: currentBet.horseId,
          betAmount: currentBet.amount,
          horses: horses
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to place bet: ${response.status}`);
      }

      const results = await response.json();

      // Update user points from backend response
      setUserPoints(results.newBalance);
      
      // Mark bet as placed
      setCurrentBet(prev => ({ ...prev, placed: true }));

      // Set race results from backend
      const raceResults = {
        winner: results.winner,
        playerHorse: results.playerHorse,
        won: results.won,
        betAmount: results.betAmount,
        payout: results.payout,
        sortedHorses: results.raceResults
      };

      // Show race animation
      setTimeout(() => {
        animateRaceWithResults(raceResults);
      }, 500);

    } catch (error) {
      console.error('Failed to place bet:', error);
      alert(error.message || 'Failed to place bet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start race
  const startRace = (forcedCurrentBet = null) => {
    const bet = forcedCurrentBet || currentBet;
    
    if (!bet || !bet.placed || raceInProgress) {
      return;
    }
    
    setRaceInProgress(true);
    setRaceFinished(false);
    resetHorsePositions();
    
    // Play pre-race commentary
    playCommentary("Ladies and gentlemen, the horses are at the starting line!");
    
    // Race countdown with audio
    setTimeout(() => {
      playCommentary("Get ready...", 0);
    }, 1000);
    
    setTimeout(() => {
      playStartingBell();
      playCommentary("And they're off!", 500);
      playHoovesSound();
      runRace();
    }, 3000);
  };
  
  // Animate race to match server results
  const animateRaceToResults = () => {
    if (!raceResults?.sortedHorses) return;
    
    setRaceInProgress(true);
    resetHorsePositions();
    
    // Animate horses to finish line based on server results
    const raceInterval = setInterval(() => {
      setHorses(prevHorses => {
        const updatedHorses = prevHorses.map(horse => {
          if (horse.finished) return horse;
          
          // Find this horse in sorted results to determine its finish position
          const resultHorse = raceResults.sortedHorses.find(h => h.id === horse.id);
          const finishPosition = raceResults.sortedHorses.findIndex(h => h.id === horse.id);
          
          // Speed based on finish position (winner finishes first, etc.)
          const speed = 2 - (finishPosition * 0.2); // Winner gets 2, last gets ~0.6
          const newPosition = horse.position + speed;
          
          if (newPosition >= 100) {
            return {
              ...horse,
              position: 100,
              finished: true,
              finishTime: Date.now() - (finishPosition * 100) // Stagger finish times
            };
          }
          
          return {
            ...horse,
            position: newPosition
          };
        });
        
        // Check if animation is complete
        const finishedCount = updatedHorses.filter(h => h.finished).length;
        if (finishedCount === updatedHorses.length) {
          clearInterval(raceInterval);
          setRaceInProgress(false);
          setRaceFinished(true);
        }
        
        return updatedHorses;
      });
    }, 100);
  };

  // Animate race with backend results (simpler version)
  const animateRaceWithResults = (results) => {
    setRaceInProgress(true);
    setRaceFinished(false);
    setRaceResults(results);
    resetHorsePositions();
    
    // Play race start audio with proper timing
    playCommentary("Ladies and gentlemen, the horses are at the starting line!");
    
    setTimeout(() => {
      playCommentary("Get ready...");
    }, 3000);
    
    setTimeout(() => {
      playStartingBell();
      playHoovesSound();
    }, 5000);
    
    setTimeout(() => {
      playCommentary("And they're off!");
    }, 5500);
    
    // Delay race animation to start after commentary
    setTimeout(() => {
      startRaceAnimation(results);
    }, 6000);
  };

  // Separate function for race animation
  const startRaceAnimation = (results) => {
    if (!results || !results.sortedHorses) {
      console.error('Race results not available for animation');
      return;
    }
    
    let commentaryCounter = 0;
    const midRaceCommentary = [
      "It's a close race!",
      "The horses are neck and neck!",
      "What an exciting race we have here!",
      "Coming around the final turn!"
    ];
    
    const raceInterval = setInterval(() => {
      setHorses(prevHorses => {
        const updatedHorses = prevHorses.map(horse => {
          if (horse.finished) return horse;
          
          // Find this horse in backend results
          const resultHorse = results.sortedHorses.find(h => h.id === horse.id);
          const finishPosition = results.sortedHorses.findIndex(h => h.id === horse.id);
          
          // Much closer speeds for exciting races - smaller gaps between horses
          let speed = 1.8 - (finishPosition * 0.1); // Winner gets 1.8, last gets ~1.1 (much closer!)
          
          // Add rubber band effect - trailing horses get slight speed boost to keep race close
          const currentMaxPosition = Math.max(...prevHorses.map(h => h.position));
          const positionGap = currentMaxPosition - horse.position;
          if (positionGap > 15) {
            speed += 0.3; // Boost for horses that are far behind
          } else if (positionGap > 8) {
            speed += 0.15; // Small boost for horses that are somewhat behind
          }

          // Check for dramatic comeback opportunity in backend races too
          if (!comebackTriggered && currentMaxPosition > 70) {
            const comebackCandidate = checkForComeback(prevHorses, currentMaxPosition);
            if (comebackCandidate && comebackCandidate.id === horse.id) {
              setComebackTriggered(true);
              setComebackHorse(horse);
              // Balanced speed boost for backend races
              speed += 1.8; // Reduced from 2.5 for balance
              // Play comeback commentary
              const commentaryIndex = Math.floor(Math.random() * comebackCommentary.length);
              setTimeout(() => playCommentary(comebackCommentary[commentaryIndex]), 300);
            }
          }

          // Continue moderate speed boost for comeback horse in backend races
          if (comebackTriggered && comebackHorse && comebackHorse.id === horse.id) {
            speed += 1.4; // Reduced from 2.0 for balance
          }
          
          const newPosition = horse.position + speed;
          
          if (newPosition >= 100) {
            return {
              ...horse,
              position: 100,
              finished: true,
              finishTime: Date.now() - (finishPosition * 150) // Stagger finish times
            };
          }
          
          return {
            ...horse,
            position: newPosition
          };
        });
        
        // Add mid-race commentary with adjusted timing for slower races
        const maxPosition = Math.max(...updatedHorses.map(h => h.position));
        if (maxPosition > 18 && commentaryCounter === 0) {
          setTimeout(() => playCommentary(midRaceCommentary[0]), 200);
          commentaryCounter++;
        } else if (maxPosition > 40 && commentaryCounter === 1) {
          setTimeout(() => playCommentary(midRaceCommentary[1]), 200);
          commentaryCounter++;
        } else if (maxPosition > 65 && commentaryCounter === 2) {
          setTimeout(() => playCommentary(midRaceCommentary[2]), 200);
          commentaryCounter++;
        } else if (maxPosition > 88 && commentaryCounter === 3) {
          setTimeout(() => playCommentary("Coming down the home stretch!"), 200);
          commentaryCounter++;
        }
        
        // Check if animation is complete
        const finishedCount = updatedHorses.filter(h => h.finished).length;
        if (finishedCount === updatedHorses.length) {
          clearInterval(raceInterval);
          stopHoovesSound();
          playFinishSound();
          setRaceInProgress(false);
          setRaceCompleting(true); // Start completion sequence - block new race button
          
          // Play winner commentary with slower, better timing
          const winner = results.winner;
          setTimeout(() => {
            playCommentary(`And the winner is horse number ${winner.id + 1}!`);
          }, 2500); // Increased from 1500ms to 2500ms
          
          setTimeout(() => {
            if (results.won) {
              playCommentary("Congratulations! You won!");
              setTimeout(() => playCrowdCheer(), 1500); // Increased from 1000ms
            } else {
              playCommentary("Better luck next time!");
            }
          }, 5500); // Increased from 4000ms to 5500ms
          
          // Show result modal after commentary finishes
          setTimeout(() => {
            setShowResultModal(true);
            setRaceFinished(true); // Now safe to enable new race button
            setRaceCompleting(false); // End completion sequence
          }, 9000); // Increased from 7000ms to 9000ms
          
          // Update after race
          updateAfterRace();
        }
        
        return updatedHorses;
      });
    }, 100);
  };

  // Reset horse positions
  const resetHorsePositions = () => {
    setHorses(prev => prev.map(horse => ({
      ...horse,
      position: 0,
      finished: false,
      finishTime: null
    })));
  };

  // Run the race with house edge algorithm
  const runRace = () => {
    let commentaryCounter = 0;
    const midRaceCommentary = [
      "It's a close race!",
      "The horses are neck and neck!",
      "What an exciting race we have here!",
      "Coming around the final turn!"
    ];
    
    const raceInterval = setInterval(() => {
      setHorses(prevHorses => {
        const updatedHorses = prevHorses.map(horse => {
          if (horse.finished) return horse;
          
          // Advanced casino psychology system with 1k safety net
          let speedMultiplier = 1;
          if (currentBet && currentBet.horseId === horse.id) {
            const psychologyResult = calculateCasinoPsychology(userPoints);
            speedMultiplier = psychologyResult.speedMultiplier;
            
            // Psychology system running in background
          }
          
          // More balanced random speed variation for closer races
          let randomSpeed = (Math.random() * 0.4 + 0.8) * horse.speed * speedMultiplier;
          
          // Add catch-up mechanics for trailing horses in random races too
          const currentMaxPosition = Math.max(...prevHorses.map(h => h.position));
          const positionGap = currentMaxPosition - horse.position;
          if (positionGap > 20) {
            randomSpeed *= 1.2; // 20% speed boost for horses far behind
          } else if (positionGap > 10) {
            randomSpeed *= 1.1; // 10% speed boost for horses somewhat behind
          }

          // Check for dramatic comeback opportunity
          if (!comebackTriggered && currentMaxPosition > 70) {
            const comebackCandidate = checkForComeback(prevHorses, currentMaxPosition);
            if (comebackCandidate && comebackCandidate.id === horse.id) {
              setComebackTriggered(true);
              setComebackHorse(horse);
              // Balanced comeback speed boost
              randomSpeed *= 2.2; // Reduced from 3.5 for balance
              // Play comeback commentary
              const commentaryIndex = Math.floor(Math.random() * comebackCommentary.length);
              setTimeout(() => playCommentary(comebackCommentary[commentaryIndex]), 500);
            }
          }

          // Continue moderate speed boost for comeback horse
          if (comebackTriggered && comebackHorse && comebackHorse.id === horse.id) {
            randomSpeed *= 1.8; // Reduced from 3.0 for balance
          }
          const newPosition = horse.position + randomSpeed;
          
          // Check if horse finished
          if (newPosition >= 100 && !horse.finished) {
            return {
              ...horse,
              position: 100,
              finished: true,
              finishTime: Date.now()
            };
          }
          
          return {
            ...horse,
            position: Math.min(newPosition, 100)
          };
        });
        
        // Add mid-race commentary adjusted for slower race pace
        const maxPosition = Math.max(...updatedHorses.map(h => h.position));
        if (maxPosition > 22 && commentaryCounter === 0) {
          playCommentary(midRaceCommentary[0]);
          commentaryCounter++;
        } else if (maxPosition > 45 && commentaryCounter === 1) {
          playCommentary(midRaceCommentary[1]);
          commentaryCounter++;
        } else if (maxPosition > 70 && commentaryCounter === 2) {
          playCommentary(midRaceCommentary[2]);
          commentaryCounter++;
        }
        
        // Check if race is finished
        const finishedHorses = updatedHorses.filter(h => h.finished);
        if (finishedHorses.length === updatedHorses.length) {
          clearInterval(raceInterval);
          stopHoovesSound();
          playFinishSound(); // Remove await since we can't make setInterval callback async
          setRaceCompleting(true); // Start completion sequence - block new race button
          setTimeout(() => finishRace(updatedHorses), 1000);
        }
        
        return updatedHorses;
      });
    }, 50);
  };

  // Finish race and calculate results
  const finishRace = (finalHorses) => {
    setRaceInProgress(false);
    // Don't set raceFinished here - wait until commentary is done
    
    // Sort horses by finish time
    const sortedHorses = finalHorses
      .filter(horse => horse.finished)
      .sort((a, b) => a.finishTime - b.finishTime);
    
    const winner = sortedHorses[0];
    const playerHorse = finalHorses[currentBet.horseId];
    const won = winner.id === currentBet.horseId;
    
    // Play winner commentary with better timing for slower races
    setTimeout(() => {
      // Check if the winner was the comeback horse for special commentary
      const isComeback = comebackHorse && winner.id === comebackHorse.id;
      
      if (isComeback) {
        playCommentary(`INCREDIBLE! Against all odds, horse number ${winner.id + 1} wins in a stunning comeback!`);
      } else {
        playCommentary(`And the winner is horse number ${winner.id + 1}!`);
      }
      
      if (won) {
        setTimeout(() => {
                      if (isComeback) {
              // Special messages for safety net wins to build confidence
              if (userPoints <= 150) {
                playCommentary("INCREDIBLE COMEBACK! Your luck is turning around!");
              } else {
                playCommentary("What an unbelievable victory! You backed the ultimate underdog!");
              }
            } else {
              // Psychology-based winning messages
              const psychologyData = calculateCasinoPsychology(userPoints);
              let winMessage = "Congratulations! You won!";
              
              switch (psychologyData.phase) {
                case 'safety_net':
                  winMessage = "INCREDIBLE COMEBACK! You're back in the game! Never give up!";
                  break;
                case 'building':
                  winMessage = "YES! You're really getting the hang of this! Keep building!";
                  break;
                case 'early_hook':
                  winMessage = "Fantastic! You're on fire! This is your lucky streak!";
                  break;
                case 'addiction_zone':
                  winMessage = "Excellent win! You're in the zone now!";
                  break;
                case 'mid_challenge':
                  winMessage = "Outstanding! You're proving you can handle the big leagues!";
                  break;
                case 'high_stakes':
                  winMessage = "Impressive! High stakes, high rewards!";
                  break;
                case 'elite_zone':
                  winMessage = "Remarkable! Elite level performance!";
                  break;
                case 'gatekeeper':
                  winMessage = "LEGENDARY! You're among the top players now!";
                  break;
                case 'final_guardian':
                  winMessage = "UNBELIEVABLE! You're at the pinnacle of success!";
                  break;
                default:
                  winMessage = "Congratulations! You won!";
              }
              
              playCommentary(winMessage);
            }
          playCrowdCheer();
        }, 3000);
      } else {
        setTimeout(() => {
          if (isComeback) {
            playCommentary("What a race! Nobody saw that comeback coming!");
          } else {
            playCommentary("Better luck next time!");
          }
        }, 3000);
      }
    }, 1000);
    
    let payout = 0;
    if (won) {
      payout = Math.round(currentBet.amount * winner.odds);
      // NO client-side point manipulation
    }
    
    const results = {
      winner,
      playerHorse,
      won,
      betAmount: currentBet.amount,
      payout,
      sortedHorses
    };
    
    setRaceResults(results);
    
    // Update points and history after race - backend already handled all transactions
    if (!hasSubmittedRef.current && currentUser) {
      hasSubmittedRef.current = true;
      updateAfterRace();
    }
    
    // Enable new race button after commentary sequence completes
    setTimeout(() => {
      setRaceFinished(true);
      setRaceCompleting(false);
    }, 4500); // Allow time for all commentary to finish
  };

  // Start new race
  const newRace = () => {
    setCurrentBet(null);
    setRaceInProgress(false);
    setRaceFinished(false);
    setRaceResults(null);
    setError(null);
    setShowResultModal(false);
    setCurrentCommentary('');
    // Reset race completion state
    setRaceCompleting(false);
    // Reset comeback mechanics
    setComebackTriggered(false);
    setComebackHorse(null);
    hasSubmittedRef.current = false;
    initializeHorses();
  };

  // Darken color helper
  const darkenColor = (color) => {
    const colorMap = {
      '#8B4513': '#654321',
      '#000000': '#333333',
      '#483D8B': '#2F2F4F',
      '#FFD700': '#DAA520',
      '#DC143C': '#B22222',
      '#C0C0C0': '#808080',
      '#50C878': '#228B22',
      '#4169E1': '#191970'
    };
    return colorMap[color] || color;
  };

  // Result Modal Component
  const ResultModal = () => {
    if (!showResultModal || !raceResults) return null;

    const { won, payout, betAmount, winner, playerHorse } = raceResults;
    const netGain = won ? payout - betAmount : -betAmount;

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300"
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      >
        <div 
          className={`bg-gradient-to-br ${won ? 'from-green-800 to-green-900' : 'from-red-800 to-red-900'} p-8 rounded-2xl border-2 ${won ? 'border-green-400' : 'border-red-400'} max-w-md w-full mx-4 transform transition-all duration-400`}
          style={{ 
            animation: 'slideUp 0.4s ease-out',
            animationFillMode: 'both'
          }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            {/* Winning Horse Image */}
            <div className="mb-4 flex justify-center">
              <div className="relative">
                <img 
                  src={`/h${winner.id + 1}.svg`}
                  alt={`Winner: ${winner.name}`}
                  className="w-20 h-16 object-contain animate-bounce"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))', // Golden glow effect
                    transform: 'scaleX(1)' // Normal orientation
                  }}
                />
                {/* Winner badge */}
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-black rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold animate-pulse">
                  #{winner.id + 1}
                </div>
              </div>
            </div>
            
            <div className={`text-4xl mb-3 animate-bounce`}>
              {won ? '🏆' : '😔'}
            </div>
            <h2 className={`text-3xl font-bold ${won ? 'text-green-100' : 'text-red-100'} mb-2`}>
              {won ? 'WINNER!' : 'BETTER LUCK NEXT TIME!'}
            </h2>
            <div className={`text-lg ${won ? 'text-green-200' : 'text-red-200'}`}>
              {won ? `${winner.name} won the race!` : `${winner.name} won, but you bet on ${playerHorse.name}`}
            </div>
          </div>

          {/* Race Results */}
          <div className="bg-black bg-opacity-30 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-300">Your Horse:</div>
                <div className="font-semibold text-white">{playerHorse.name}</div>
              </div>
              <div>
                <div className="text-gray-300">Winner:</div>
                <div className="font-semibold text-white">{winner.name}</div>
              </div>
              <div>
                <div className="text-gray-300">Your Bet:</div>
                <div className="font-semibold text-white">{betAmount} points</div>
              </div>
              <div>
                <div className="text-gray-300">Odds:</div>
                <div className="font-semibold text-white">{playerHorse.odds.toFixed(1)}:1</div>
              </div>
            </div>
          </div>

          {/* Payout Information */}
          <div className="text-center mb-6">
            <div className={`text-2xl font-bold ${netGain >= 0 ? 'text-green-300' : 'text-red-300'} mb-2`}>
              {netGain >= 0 ? '+' : ''}{netGain} points
            </div>
            {won && (
              <div className="text-sm text-green-200">
                Payout: {payout} points
              </div>
            )}
            <div className="text-sm text-gray-300 mt-2">
              New Balance: {userPoints} points
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowResultModal(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              Continue
            </button>
            <button
              onClick={newRace}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              New Race
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center p-8 bg-gray-800 rounded-xl border border-gray-700">
          <h2 className="text-2xl font-bold mb-4">🐎 Horse Racing</h2>
          <p className="text-gray-300 mb-6">Please log in to place bets and play horse racing!</p>
          <div className="text-sm text-gray-400">
            You need an account to use affiliate points for betting.
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center p-8 bg-gray-800 rounded-xl border border-red-500">
          <h2 className="text-2xl font-bold mb-4 text-red-400">🐎 Horse Racing</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              initializeHorses();
            }}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 px-4 py-2 rounded font-semibold transition-colors"
          >
            {loading ? 'Loading...' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  if (loading && horses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center p-8 bg-gray-800 rounded-xl border border-gray-700">
          <h2 className="text-2xl font-bold mb-4">🐎 Horse Racing</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading race data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Animation styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { 
              opacity: 0;
              transform: translateY(50px) scale(0.9);
            }
            to { 
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          
          /* Volume slider styling */
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #10b981;
            cursor: pointer;
            border: 2px solid #065f46;
          }
          
          .slider::-moz-range-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #10b981;
            cursor: pointer;
            border: 2px solid #065f46;
          }
          
          /* Crowd Animation Styles */
          .crowd-cheer {
            animation: cheer 1.5s ease-in-out infinite;
          }
          
          .crowd-wave {
            animation: wave 2s ease-in-out infinite;
          }
          
          @keyframes cheer {
            0%, 100% { transform: translateY(0) scale(1); }
            25% { transform: translateY(-3px) scale(1.1); }
            50% { transform: translateY(-1px) scale(1.05); }
            75% { transform: translateY(-2px) scale(1.08); }
          }
          
          @keyframes wave {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-2px) rotate(-5deg); }
            50% { transform: translateY(-4px) rotate(0deg); }
            75% { transform: translateY(-2px) rotate(5deg); }
          }
        `
      }} />
      
      {/* Result Modal */}
      <ResultModal />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-transparent bg-clip-text">
                🐎 Horse Racing
              </span>
            </h1>
            <p className="text-gray-300 mt-1 text-sm sm:text-base">
              Bet your affiliate points on exciting horse races!
            </p>
          </div>
          
          {/* Points Display */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400">Affiliate Points</div>
            <div className="text-2xl font-bold text-emerald-400">{userPoints}</div>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="text-gray-300 font-medium">🔊 Race Audio:</span>
              <button
                onClick={() => {
                  const newState = !audioEnabled;
                  setAudioEnabled(newState);
                  if (newState) {
                    // Initialize audio context on first enable
                    getAudioContext();
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  audioEnabled 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                }`}
              >
                {audioEnabled ? '🔊 ON' : '🔇 OFF'}
              </button>
              

            </div>
            
            {audioEnabled && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">Volume:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-gray-400 text-sm w-8">{Math.round(volume * 100)}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Race Track */}
          <div className="flex-1">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-6">
              {/* Race Commentary Board */}
              <div className="mb-4 bg-gradient-to-r from-gray-900 to-black rounded-lg p-4 border-2 border-amber-500 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="text-amber-400 text-xl">🎙️</div>
                    <div className="text-amber-400 font-bold text-sm tracking-wider uppercase">Race Commentary</div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="text-red-500 text-xs font-bold">LIVE</div>
                  </div>
                </div>
                <div className="bg-black bg-opacity-50 rounded p-3 min-h-[50px] flex items-center">
                  <div className="text-white text-base font-medium leading-relaxed">
                    {currentCommentary || "Welcome to the races! Place your bets and get ready for an exciting race!"}
                  </div>
                </div>
              </div>
              
              <div 
                ref={raceTrackRef}
                className="relative bg-gradient-to-b from-sky-200 to-green-400 rounded-lg overflow-hidden"
                style={{ height: '400px' }}
              >
                {/* Animated Crowd - Left Side */}
                <div className="absolute left-0 top-0 w-16 h-2/5 flex flex-col justify-end items-center space-y-1 pb-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={`left-crowd-${i}`}
                      className={`w-3 h-4 rounded-full ${
                        raceInProgress 
                          ? 'animate-bounce bg-red-400' 
                          : 'bg-gray-400'
                      }`}
                      style={{
                        animationDelay: `${i * 0.2}s`,
                        animationDuration: raceInProgress ? '0.8s' : '2s'
                      }}
                    />
                  ))}
                  {/* Stadium seats effect */}
                  <div className="w-14 h-6 bg-gray-600 rounded-t-lg opacity-80"></div>
                </div>

                {/* Animated Crowd - Right Side */}
                <div className="absolute right-0 top-0 w-16 h-2/5 flex flex-col justify-end items-center space-y-1 pb-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={`right-crowd-${i}`}
                      className={`w-3 h-4 rounded-full ${
                        raceInProgress 
                          ? 'animate-bounce bg-blue-400' 
                          : 'bg-gray-400'
                      }`}
                      style={{
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: raceInProgress ? '0.9s' : '2s'
                      }}
                    />
                  ))}
                  {/* Stadium seats effect */}
                  <div className="w-14 h-6 bg-gray-600 rounded-t-lg opacity-80"></div>
                </div>

                {/* Top Crowd - Finish Line Area */}
                <div className="absolute top-2 right-20 flex space-x-1">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={`top-crowd-${i}`}
                      className={`w-2 h-3 rounded-full ${
                        raceFinished 
                          ? 'crowd-cheer bg-yellow-400' 
                          : raceInProgress 
                          ? 'animate-bounce bg-green-400'
                          : 'bg-gray-500'
                      }`}
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: raceFinished ? '0.5s' : '1s'
                      }}
                    />
                  ))}
                </div>

                {/* Starting Line Crowd */}
                <div className="absolute top-5 left-20 flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={`start-crowd-${i}`}
                      className={`w-2 h-3 rounded-full ${
                        raceInProgress 
                          ? 'crowd-wave bg-purple-400' 
                          : 'bg-gray-500'
                      }`}
                      style={{
                        animationDelay: `${i * 0.3}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Middle Section Scattered Crowd */}
                <div className="absolute top-1 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={`middle-crowd-${i}`}
                      className={`w-2 h-2 rounded-full ${
                        raceInProgress 
                          ? 'animate-pulse bg-orange-400' 
                          : 'bg-gray-400'
                      }`}
                      style={{
                        animationDelay: `${i * 0.25}s`,
                        animationDuration: '1.2s'
                      }}
                    />
                  ))}
                </div>

                {/* Track background */}
                <div className="absolute bottom-0 left-0 right-0 h-3/5 bg-gradient-to-b from-amber-600 to-amber-800">
                  {/* Track lanes */}
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute border-t border-white border-opacity-30"
                      style={{
                        top: `${(i / 8) * 100}%`,
                        left: 0,
                        right: 0,
                        height: '1px'
                      }}
                    />
                  ))}
                </div>
                
                {/* Starting line */}
                <div className="absolute left-4 bottom-0 w-1 h-3/5 bg-white opacity-80" />
                
                {/* Finish line */}
                <div className="absolute right-4 bottom-0 w-1 h-3/5 bg-black opacity-80" />
                
                {/* Horses */}
                {horses.map((horse, index) => (
                  <div
                    key={horse.id}
                    className="absolute transition-all duration-100 ease-linear"
                    style={{
                      left: `${4 + (horse.position * 0.88)}%`,
                      bottom: `${3 + (index * 7.2)}%`,
                      width: '50px',
                      height: '40px'
                    }}
                  >
                    {/* Horse number */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-white text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md">
                      {horse.id + 1}
                    </div>
                    
                    {/* Horse SVG */}
                    <div className="relative w-full h-full">
                      <img 
                        src={`/h${horse.id + 1}.svg`}
                        alt={`Horse ${horse.id + 1}`}
                        className="w-full h-full object-contain"
                        style={{
                          filter: raceInProgress ? 'none' : 'brightness(0.9)',
                          transform: 'scaleX(1)' // Normal orientation
                        }}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Race status overlay */}
                {raceInProgress && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-4xl font-bold animate-pulse">
                      RACING!
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Betting Panel */}
          <div className="w-full lg:w-80 bg-gray-900/60 rounded-xl p-4 border border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-amber-400">🎯 Place Your Bet</h3>
            
            {/* Horse Selection */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Select Horse:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {horses.map(horse => {
                  const potentialWin = currentBet?.amount ? Math.round(currentBet.amount * horse.odds) : 0;
                  return (
                    <div
                      key={horse.id}
                      onClick={() => selectHorse(horse.id)}
                      className={`p-2 rounded cursor-pointer transition-all ${
                        currentBet?.horseId === horse.id
                          ? 'bg-amber-500/20 border border-amber-500'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: horse.color }}
                          />
                          <div>
                            <div className="text-sm font-medium">#{horse.id + 1} {horse.name}</div>
                            <div className="text-xs text-gray-400">Odds: {horse.odds.toFixed(1)}:1</div>
                          </div>
                        </div>
                        <div className="text-xs text-amber-400 text-right">
                          <div>Payout: {horse.odds.toFixed(1)}:1</div>
                          {currentBet?.amount && currentBet.horseId === horse.id && (
                            <div className="text-green-400 font-semibold">
                              Win: {potentialWin} pts
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bet Amount */}
            {currentBet && (
              <div className="mb-4">
                <label className="text-sm font-semibold mb-2 block">Bet Amount:</label>
                <input
                  type="number"
                  value={currentBet.amount || ''}
                  onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                  placeholder="Enter bet amount"
                  min="10"
                  max={userPoints}
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white text-center"
                  disabled={raceInProgress || currentBet.placed}
                />
                
                {/* Potential winnings display */}
                {currentBet.amount && currentBet.amount >= 10 && (
                  <div className="mt-2 p-2 bg-green-900/20 border border-green-500/50 rounded text-center">
                    <div className="text-xs text-gray-400">Potential Winnings:</div>
                    <div className="text-sm font-semibold text-green-400">
                      {Math.round(currentBet.amount * (horses.find(h => h.id === currentBet.horseId)?.odds || 1))} affiliate points
                    </div>
                    <div className="text-xs text-gray-500">
                      ({(horses.find(h => h.id === currentBet.horseId)?.odds || 1).toFixed(1)}x your bet)
                    </div>
                  </div>
                )}
                
                {/* Quick bet buttons */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[10, 25, 50, 100, 250, 500].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      disabled={raceInProgress || currentBet.placed || amount > userPoints}
                      className="px-2 py-1 text-xs bg-amber-500/20 border border-amber-500 rounded hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {currentBet && !currentBet.placed && !raceResults && (
                <button
                  onClick={placeBet}
                  disabled={!currentBet.amount || currentBet.amount < 10 || loading}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition-colors"
                >
                  {loading ? 'Placing Bet...' : `Place Bet & Run Race (${currentBet.amount || 0} points)`}
                </button>
              )}
              
              {raceResults?.serverControlled && !raceInProgress && !raceFinished && (
                <button
                  onClick={animateRaceToResults}
                  className="w-full py-2 bg-green-500 hover:bg-green-600 rounded font-semibold transition-colors"
                >
                  🏁 Watch Race Animation
                </button>
              )}
              
              {(raceFinished || raceResults) && !raceCompleting && (
                <button
                  onClick={newRace}
                  disabled={raceCompleting || raceInProgress}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition-colors"
                >
                  {raceCompleting ? 'Race Finishing...' : '🔄 New Race'}
                </button>
              )}
            </div>



            {/* Game Instructions */}
            <div className="mt-4 p-3 bg-gray-800/50 rounded text-xs text-gray-400">
              <div className="font-semibold mb-1">How to Play:</div>
              <ul className="space-y-1">
                <li>• Select a horse to bet on</li>
                <li>• Choose your bet amount (min: 10 affiliate points)</li>
                <li>• Place your bet and start the race</li>
                <li>• Win affiliate points based on the horse's odds!</li>
                <li>• Higher odds = higher payout multiplier</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HorseRacing;
