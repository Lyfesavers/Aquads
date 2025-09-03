import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// API function
const fetchAds = async () => {
  const response = await fetch(`${API_URL}/api/ads`);
  if (!response.ok) {
    throw new Error('Failed to fetch ads');
  }
  return response.json();
};

// Custom hook
export const useAds = () => {
  return useQuery({
    queryKey: ['ads'],
    queryFn: fetchAds,
    refetchInterval: 300000, // 5 minutes
    staleTime: 180000, // 3 minutes
    gcTime: 600000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

// Helper function to filter eligible ads for battles
export const useEligibleAds = (allActiveBattles = []) => {
  const { data: ads = [], isLoading, error } = useAds();
  
  // Debug logging to help identify the issue
  console.log('useEligibleAds called with:', { allActiveBattles, ads });
  
  // Get IDs of bubbles already in active battles
  const activeBattleBubbleIds = new Set();
  
  // Ensure allActiveBattles is an array and safely iterate
  if (Array.isArray(allActiveBattles)) {
    allActiveBattles.forEach((battle, index) => {
      // Debug logging for each battle
      console.log(`Battle ${index}:`, battle);
      
      // Comprehensive safety check for battle object
      if (battle && 
          typeof battle === 'object' && 
          battle.status && 
          (battle.status === 'active' || battle.status === 'waiting') &&
          battle.project1 && 
          battle.project2) {
        
        // Safely add project IDs if they exist
        if (battle.project1.adId && typeof battle.project1.adId === 'string') {
          activeBattleBubbleIds.add(battle.project1.adId);
        }
        if (battle.project2.adId && typeof battle.project2.adId === 'string') {
          activeBattleBubbleIds.add(battle.project2.adId);
        }
      }
    });
  }
  
  // Filter all eligible ads that are eligible for battles (not already battling)
  const eligibleAds = ads.filter(ad => {
    // Comprehensive safety check for ad object
    if (!ad || typeof ad !== 'object') return false;
    
    const hasLogo = ad.logo && typeof ad.logo === 'string';
    const hasTitle = ad.title && typeof ad.title === 'string';
    const hasStatus = ad.status && typeof ad.status === 'string';
    const isEligible = hasStatus && (ad.status === 'active' || ad.status === 'approved');
    const hasId = ad.id && typeof ad.id === 'string';
    const notInBattle = hasId && !activeBattleBubbleIds.has(ad.id);
    
    return isEligible && hasLogo && hasTitle && notInBattle;
  });
  
  return {
    ads: eligibleAds,
    isLoading,
    error,
    totalAds: ads.length,
    eligibleCount: eligibleAds.length
  };
};
