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
  
  // Get IDs of bubbles already in active battles
  const activeBattleBubbleIds = new Set();
  allActiveBattles.forEach(battle => {
    if (battle.status === 'active' || battle.status === 'waiting') {
      activeBattleBubbleIds.add(battle.project1.adId);
      activeBattleBubbleIds.add(battle.project2.adId);
    }
  });
  
  // Filter all eligible ads that are eligible for battles (not already battling)
  const eligibleAds = ads.filter(ad => {
    const hasLogo = ad.logo;
    const hasTitle = ad.title;
    const isEligible = ad.status === 'active' || ad.status === 'approved';
    const notInBattle = !activeBattleBubbleIds.has(ad.id);
    
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
