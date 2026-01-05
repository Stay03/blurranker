'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getOrCreateDeviceId,
  getOrCreatePlayer,
  updatePlayerName,
} from '@/lib/player';
import type { Player } from '@/lib/supabase/types';

type PlayerContextType = {
  player: Player | null;
  isLoading: boolean;
  isNewUser: boolean;
  updateName: (name: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
  completeSetup: () => void;
};

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const loadPlayer = useCallback(async () => {
    setIsLoading(true);

    const deviceId = getOrCreateDeviceId();
    if (!deviceId) {
      setIsLoading(false);
      return;
    }

    // Check if this device already has a player
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    if (existingPlayer) {
      // Returning user
      const playerData = existingPlayer as Player;
      setPlayer(playerData);
      setIsNewUser(false);
      // Update last_seen
      await supabase
        .from('players')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', playerData.id);
    } else {
      // New user - will need to go through setup
      const newPlayer = await getOrCreatePlayer(supabase, deviceId);
      setPlayer(newPlayer);
      setIsNewUser(true);
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadPlayer();
  }, [loadPlayer]);

  const updateName = useCallback(
    async (name: string): Promise<{ success: boolean; error?: string }> => {
      if (!player) return { success: false, error: 'No player found' };

      const result = await updatePlayerName(supabase, player.id, name);
      if (result.success && result.player) {
        setPlayer(result.player);
        return { success: true };
      }
      return { success: false, error: result.error };
    },
    [player, supabase]
  );

  const refresh = useCallback(async () => {
    await loadPlayer();
  }, [loadPlayer]);

  const completeSetup = useCallback(() => {
    setSetupCompleted(true);
    setIsNewUser(false);
  }, []);

  // Show as new user until setup is completed
  const effectiveIsNewUser = isNewUser && !setupCompleted;

  return (
    <PlayerContext.Provider
      value={{
        player,
        isLoading,
        isNewUser: effectiveIsNewUser,
        updateName,
        refresh,
        completeSetup,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
