import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// API functions
const fetchBubbleDuels = async () => {
  const response = await fetch(`${API_URL}/api/bubble-duels`);
  if (!response.ok) {
    throw new Error('Failed to fetch bubble duels');
  }
  return response.json();
};

const fetchBubbleDuel = async (battleId) => {
  const response = await fetch(`${API_URL}/api/bubble-duels/${battleId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch bubble duel');
  }
  return response.json();
};

const createBubbleDuel = async (battleData) => {
  const response = await fetch(`${API_URL}/api/bubble-duels/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${battleData.token}`
    },
    body: JSON.stringify({
      project1AdId: battleData.project1AdId,
      project2AdId: battleData.project2AdId,
      duration: battleData.duration || 3600,
      targetVotes: battleData.targetVotes || 100
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create bubble duel');
  }
  
  return response.json();
};

const voteInBubbleDuel = async ({ battleId, projectSide, token }) => {
  const response = await fetch(`${API_URL}/api/bubble-duels/${battleId}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      projectSide: projectSide === 'project1Votes' ? 'project1' : 'project2' 
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to vote');
  }
  
  return response.json();
};

const cancelBubbleDuel = async ({ battleId, token }) => {
  const response = await fetch(`${API_URL}/api/bubble-duels/${battleId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel battle');
  }
  
  return response.json();
};

// Custom hooks
export const useBubbleDuels = () => {
  return useQuery({
    queryKey: ['bubble-duels'],
    queryFn: fetchBubbleDuels,
    refetchInterval: 120000, // 2 minutes
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useBubbleDuel = (battleId) => {
  return useQuery({
    queryKey: ['bubble-duel', battleId],
    queryFn: () => fetchBubbleDuel(battleId),
    enabled: !!battleId,
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateBubbleDuel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createBubbleDuel,
    onSuccess: (data) => {
      // Invalidate and refetch bubble duels
      queryClient.invalidateQueries({ queryKey: ['bubble-duels'] });
      
      // Add the new battle to the cache
      queryClient.setQueryData(['bubble-duels'], (oldData) => {
        if (oldData) {
          return [data.battle, ...oldData];
        }
        return [data.battle];
      });
    },
    onError: (error) => {
      console.error('Failed to create bubble duel:', error);
    }
  });
};

export const useVoteInBubbleDuel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: voteInBubbleDuel,
    onSuccess: (data, variables) => {
      // Update the specific battle in the cache
      queryClient.setQueryData(['bubble-duel', variables.battleId], data.battle);
      
      // Update the battle in the list
      queryClient.setQueryData(['bubble-duels'], (oldData) => {
        if (oldData) {
          return oldData.map(battle => 
            battle.battleId === variables.battleId ? data.battle : battle
          );
        }
        return oldData;
      });
    },
    onError: (error) => {
      console.error('Failed to vote in bubble duel:', error);
    }
  });
};

export const useCancelBubbleDuel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cancelBubbleDuel,
    onSuccess: (data, variables) => {
      // Remove the battle from the list
      queryClient.setQueryData(['bubble-duels'], (oldData) => {
        if (oldData) {
          return oldData.filter(battle => battle.battleId !== variables.battleId);
        }
        return oldData;
      });
      
      // Remove the individual battle cache
      queryClient.removeQueries({ queryKey: ['bubble-duel', variables.battleId] });
    },
    onError: (error) => {
      console.error('Failed to cancel bubble duel:', error);
    }
  });
};
