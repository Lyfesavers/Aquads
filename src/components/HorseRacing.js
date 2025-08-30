import React, { useState, useEffect, useRef } from 'react';
import { fetchMyPoints, socket } from '../services/api';

// API functions for horse racing
const horseRacingAPI = {
  getRaceData: async () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication required');
    
    const response = await fetch('/api/horse-racing/race-data', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Race data API error:', response.status, errorText);
      throw new Error(`Failed to get race data: ${response.status}`);
    }
    
    return response.json();
  },
  
  placeBet: async (horseId, betAmount, horses) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication required');
    
    const response = await fetch('/api/horse-racing/place-bet', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ horseId, betAmount, horses })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Place bet API error:', response.status, errorText);
      
      // Try to parse as JSON first, fallback to text
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Failed to place bet: ${response.status}`);
      } catch {
        throw new Error(`Failed to place bet: ${response.status}`);
      }
    }
    
    return response.json();
  },
  
  getHistory: async (page = 1, limit = 10) => {
    const response = await fetch(`/api/horse-racing/history?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to get history');
    return response.json();
  },
  
  getLeaderboard: async (timeframe = 'all', limit = 10) => {
    const response = await fetch(`/api/horse-racing/leaderboard?timeframe=${timeframe}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to get leaderboard');
    return response.json();
  }
};

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
  


  const raceTrackRef = useRef(null);
  const hasSubmittedRef = useRef(false);

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

  // Initialize horses for a new race
  const initializeHorses = async () => {
    if (!currentUser) {
      setHorses([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const raceData = await horseRacingAPI.getRaceData();
      const raceHorses = raceData.horses.map(horse => ({
        ...horse,
        position: 0,
        lane: horse.id,
        finished: false,
        finishTime: null
      }));
      setHorses(raceHorses);
    } catch (error) {
      console.error('Failed to initialize horses:', error);
      setError('Failed to load race data. Please check your connection and try again.');
      setHorses([]);
    } finally {
      setLoading(false);
    }
  };

  // Load game history (placeholder for future implementation)
  const loadGameHistory = async () => {
    // This would fetch user's betting history from backend
    setGameHistory([]);
  };

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

  // Place bet using backend API (strict server-side only)
  const placeBet = async () => {
    if (!currentBet || !currentUser || currentBet.amount < 10 || currentBet.amount > userPoints) {
      alert('Invalid bet amount! Minimum bet is 10 points.');
      return;
    }

    setLoading(true);
    try {
      const response = await horseRacingAPI.placeBet(currentBet.horseId, currentBet.amount, horses);
      
      // Update game state with server response
      setUserPoints(response.newBalance);
      setCurrentBet(prev => ({ ...prev, placed: true }));
      
      // Store race results for immediate display
      setRaceResults({
        winner: response.winner,
        playerHorse: response.playerHorse,
        won: response.won,
        betAmount: response.betAmount,
        payout: response.payout,
        sortedHorses: response.raceResults,
        serverControlled: true
      });
      
      // Update horses with final positions
      const finalHorses = response.raceResults.map(horse => ({
        ...horse,
        position: 100,
        finished: true
      }));
      setHorses(finalHorses);
      setRaceFinished(true);
      
    } catch (error) {
      console.error('Failed to place bet:', error);
      alert(error.message || 'Failed to place bet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start race (now just for animation since result is determined by server)
  const startRace = () => {
    if (!currentBet || !currentBet.placed || raceInProgress || raceResults?.serverControlled) {
      // If server already determined results, just show animation
      if (raceResults?.serverControlled) {
        animateRaceToResults();
      }
      return;
    }
    
    setRaceInProgress(true);
    setRaceFinished(false);
    resetHorsePositions();
    
    // Race countdown
    setTimeout(() => runRace(), 3000);
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
    const raceInterval = setInterval(() => {
      setHorses(prevHorses => {
        const updatedHorses = prevHorses.map(horse => {
          if (horse.finished) return horse;
          
          // House edge algorithm - if user bet on this horse, slightly reduce its chances
          let speedMultiplier = 1;
          if (currentBet && currentBet.horseId === horse.id) {
            // House edge: reduce player's horse speed by 12%
            speedMultiplier = 0.88;
          }
          
          // Random speed variation with house edge applied
          const randomSpeed = (Math.random() * 0.5 + 0.75) * horse.baseSpeed * speedMultiplier;
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
        
        // Check if race is finished
        const finishedHorses = updatedHorses.filter(h => h.finished);
        if (finishedHorses.length === updatedHorses.length) {
          clearInterval(raceInterval);
          setTimeout(() => finishRace(updatedHorses), 1000);
        }
        
        return updatedHorses;
      });
    }, 50);
  };

  // Finish race and calculate results
  const finishRace = async (finalHorses) => {
    setRaceInProgress(false);
    setRaceFinished(true);
    
    // Sort horses by finish time
    const sortedHorses = finalHorses
      .filter(horse => horse.finished)
      .sort((a, b) => a.finishTime - b.finishTime);
    
    const winner = sortedHorses[0];
    const playerHorse = finalHorses[currentBet.horseId];
    const won = winner.id === currentBet.horseId;
    
    let payout = 0;
    if (won) {
      payout = Math.round(currentBet.amount * winner.odds);
      setUserPoints(prev => prev + payout);
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
    
    // Submit results to backend (placeholder)
    if (!hasSubmittedRef.current && currentUser) {
      hasSubmittedRef.current = true;
      try {
        // This would submit to backend:
        // await submitRaceResult(results);
      } catch (error) {
        console.error('Failed to submit race result:', error);
      }
    }
  };

  // Start new race
  const newRace = () => {
    setCurrentBet(null);
    setRaceInProgress(false);
    setRaceFinished(false);
    setRaceResults(null);
    setError(null);
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

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Race Track */}
          <div className="flex-1">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-6">
              <div 
                ref={raceTrackRef}
                className="relative bg-gradient-to-b from-sky-200 to-green-400 rounded-lg overflow-hidden"
                style={{ height: '400px' }}
              >
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
                      width: '40px',
                      height: '30px'
                    }}
                  >
                    {/* Horse number */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-white text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {horse.id + 1}
                    </div>
                    
                    {/* Horse body */}
                    <div className="relative w-full h-full">
                      {/* Horse head */}
                      <div 
                        className="absolute right-0 top-1 w-4 h-3 rounded-full"
                        style={{ backgroundColor: horse.color }}
                      />
                      {/* Horse body */}
                      <div 
                        className="absolute left-1 top-2 w-6 h-4 rounded-lg"
                        style={{ backgroundColor: horse.color }}
                      />
                      {/* Horse legs */}
                      <div 
                        className="absolute left-2 bottom-0 w-1 h-3"
                        style={{ backgroundColor: horse.color }}
                      />
                      <div 
                        className="absolute left-4 bottom-0 w-1 h-3"
                        style={{ backgroundColor: horse.color }}
                      />
                      <div 
                        className="absolute left-6 bottom-0 w-1 h-3"
                        style={{ backgroundColor: horse.color }}
                      />
                      <div 
                        className="absolute left-8 bottom-0 w-1 h-3"
                        style={{ backgroundColor: horse.color }}
                      />
                      {/* Horse mane */}
                      <div 
                        className="absolute right-2 top-0 w-2 h-2 rounded"
                        style={{ backgroundColor: darkenColor(horse.color) }}
                      />
                      {/* Horse tail */}
                      <div 
                        className="absolute left-0 top-3 w-2 h-3 rounded"
                        style={{ backgroundColor: darkenColor(horse.color) }}
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
                  disabled={!currentBet.amount || currentBet.amount < 10 || currentBet.amount > userPoints || loading}
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
              
              {(raceFinished || raceResults) && (
                <button
                  onClick={newRace}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 rounded font-semibold transition-colors"
                >
                  🔄 New Race
                </button>
              )}
            </div>

            {/* Race Results */}
            {raceResults && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <h4 className="font-bold mb-2">🏆 Race Results</h4>
                <div className="mb-2">
                  <div className="text-sm">Winner: #{raceResults.winner.id + 1} {raceResults.winner.name}</div>
                  <div className="text-sm">Your Horse: #{raceResults.playerHorse.id + 1} {raceResults.playerHorse.name}</div>
                </div>
                
                {raceResults.won ? (
                  <div className="text-green-400 font-semibold">
                    🎉 You Won! Payout: {raceResults.payout} affiliate points
                  </div>
                ) : (
                  <div className="text-red-400">
                    😞 Better luck next time! Lost: {raceResults.betAmount} affiliate points
                  </div>
                )}
              </div>
            )}

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
