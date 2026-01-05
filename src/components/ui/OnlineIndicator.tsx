'use client';

import { useState, useEffect } from 'react';
import { isPlayerOnline } from '@/lib/player';

interface OnlineIndicatorProps {
  lastSeen: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
};

export function OnlineIndicator({ lastSeen, size = 'sm' }: OnlineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(() => isPlayerOnline(lastSeen));

  // Re-check online status every 15 seconds
  useEffect(() => {
    const checkStatus = () => {
      setIsOnline(isPlayerOnline(lastSeen));
    };

    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [lastSeen]);

  // Update immediately when lastSeen changes
  useEffect(() => {
    setIsOnline(isPlayerOnline(lastSeen));
  }, [lastSeen]);

  return (
    <span
      className={`${sizeClasses[size]} rounded-full border-2 border-card block ${
        isOnline
          ? 'bg-green-500 animate-pulse'
          : 'bg-gray-400'
      }`}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}
