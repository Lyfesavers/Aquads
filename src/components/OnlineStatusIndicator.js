import React from 'react';

const OnlineStatusIndicator = ({ user, showText = false, size = 'small' }) => {
  // Determine if user is online or recently active
  const isOnline = user?.isOnline || false;
  const lastSeen = user?.lastSeen;
  const lastActivity = user?.lastActivity;
  
  // Calculate if user was recently active (within last 5 minutes)
  const isRecentlyActive = () => {
    if (!lastActivity && !lastSeen) return false;
    
    const lastActiveTime = new Date(lastActivity || lastSeen);
    const now = new Date();
    const timeDifference = now - lastActiveTime;
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    return timeDifference < fiveMinutesInMs;
  };

  // Format last seen time
  const formatLastSeen = (timestamp) => {
    if (!timestamp) return '';
    
    const lastSeenTime = new Date(timestamp);
    const now = new Date();
    const timeDifference = now - lastSeenTime;
    
    const minutes = Math.floor(timeDifference / (1000 * 60));
    const hours = Math.floor(timeDifference / (1000 * 60 * 60));
    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return lastSeenTime.toLocaleDateString();
  };

  // Determine status and colors
  const getStatusInfo = () => {
    if (isOnline) {
      return {
        status: 'online',
        color: 'bg-green-500',
        glowColor: 'shadow-green-500/50',
        text: 'Online',
        title: 'Currently online and active'
      };
    } else if (isRecentlyActive()) {
      return {
        status: 'away',
        color: 'bg-yellow-500',
        glowColor: 'shadow-yellow-500/50',
        text: 'Recently active',
        title: `Last seen ${formatLastSeen(lastSeen || lastActivity)}`
      };
    } else {
      return {
        status: 'offline',
        color: 'bg-gray-500',
        glowColor: 'shadow-gray-500/50',
        text: 'Offline',
        title: `Last seen ${formatLastSeen(lastSeen || lastActivity)}`
      };
    }
  };

  const statusInfo = getStatusInfo();
  
  // Size classes
  const sizeClasses = {
    small: 'w-2.5 h-2.5',
    medium: 'w-3 h-3',
    large: 'w-4 h-4'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className="flex items-center gap-1.5" title={statusInfo.title}>
      {/* Status dot with pulse animation for online users */}
      <div className="relative">
        <div 
          className={`
            ${sizeClasses[size]} 
            ${statusInfo.color} 
            rounded-full 
            ${statusInfo.glowColor}
            ${isOnline ? 'animate-pulse shadow-lg' : 'shadow-sm'}
            transition-all duration-300
          `}
        />
        {/* Outer ring for online status */}
        {isOnline && (
          <div 
            className={`
              absolute inset-0 
              ${sizeClasses[size]} 
              border-2 border-green-400 
              rounded-full 
              animate-ping 
              opacity-30
            `}
          />
        )}
      </div>
      
      {/* Status text */}
      {showText && (
        <span className={`${textSizeClasses[size]} text-gray-300 font-medium`}>
          {statusInfo.text}
        </span>
      )}
    </div>
  );
};

export default OnlineStatusIndicator; 