import { useState, useEffect } from 'react';
import { API_URL } from '../services/api';

const EASTER_EGG_POINTS_THRESHOLD = 3000;
const LOCAL_STORAGE_KEY = 'easterEggFound';

const useEasterEgg = (currentUser, pointsData) => {
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [easterEggFound, setEasterEggFound] = useState(false);

  // Check if the Easter egg has been found before (from local storage)
  useEffect(() => {
    if (currentUser?.userId) {
      const easterEggStatus = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${currentUser.userId}`);
      if (easterEggStatus === 'true') {
        setEasterEggFound(true);
      }
    }
  }, [currentUser]);

  // Check if points threshold is reached
  useEffect(() => {
    if (!easterEggFound && currentUser?.userId && pointsData) {
      const userPoints = 
        (pointsData && typeof pointsData.points === 'number') 
          ? pointsData.points 
          : (currentUser.points || 0);
      
      if (userPoints >= EASTER_EGG_POINTS_THRESHOLD) {
        setShowEasterEgg(true);
        setEasterEggFound(true);
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_${currentUser.userId}`, 'true');
        
        // Call API to record Easter egg discovery
        recordEasterEggDiscovery();
      }
    }
  }, [currentUser, pointsData, easterEggFound]);

  // Record Easter egg discovery in the backend
  const recordEasterEggDiscovery = async () => {
    if (!currentUser?.token) return;
    
    try {
      await fetch(`${API_URL}/api/points/easter-egg-found`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      // No need to handle the response as this is just for recording
    } catch (error) {
      // Silent error handling, as it's not critical if this fails
    }
  };

  const closeEasterEgg = () => {
    setShowEasterEgg(false);
  };

  // Function to manually check if the user has reached the points threshold
  const checkEasterEggEligibility = (points) => {
    if (!easterEggFound && points >= EASTER_EGG_POINTS_THRESHOLD) {
      setShowEasterEgg(true);
      setEasterEggFound(true);
      if (currentUser?.userId) {
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_${currentUser.userId}`, 'true');
        recordEasterEggDiscovery();
      }
      return true;
    }
    return false;
  };

  // Function to reset the Easter egg for testing
  const resetEasterEgg = () => {
    if (currentUser?.userId) {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_${currentUser.userId}`);
      setEasterEggFound(false);
      setShowEasterEgg(false);
    }
  };

  return {
    showEasterEgg,
    easterEggFound,
    closeEasterEgg,
    checkEasterEggEligibility,
    resetEasterEgg
  };
};

export default useEasterEgg; 