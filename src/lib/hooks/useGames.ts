'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getSessionGames,
  getGameById,
  createGame,
  submitRankings,
  confirmGame,
  unconfirmGame,
  deleteGame,
  type GameWithDetails,
} from '@/lib/game';

/**
 * Hook to fetch and subscribe to games for a session
 */
export function useGames(sessionId: string | undefined) {
  const [games, setGames] = useState<GameWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialFetch = useRef(true);

  const supabase = useMemo(() => createClient(), []);

  // Silent fetch for real-time updates (no loading state)
  const fetchGamesSilent = useCallback(async () => {
    if (!sessionId) return;

    const data = await getSessionGames(supabase, sessionId);
    setGames(data);
    setError(null);
  }, [supabase, sessionId]);

  // Full fetch with loading state (for initial load and manual refresh)
  const fetchGames = useCallback(async () => {
    if (!sessionId) {
      setGames([]);
      setIsLoading(false);
      return;
    }

    // Only show loading on initial fetch
    if (isInitialFetch.current) {
      setIsLoading(true);
    }
    setError(null);

    const data = await getSessionGames(supabase, sessionId);
    setGames(data);
    setIsLoading(false);
    isInitialFetch.current = false;
  }, [supabase, sessionId]);

  useEffect(() => {
    isInitialFetch.current = true;
    fetchGames();

    if (!sessionId) return;

    // Subscribe to real-time changes for games in this session
    const channel = supabase
      .channel(`games-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchGamesSilent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rankings',
        },
        () => {
          fetchGamesSilent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_confirmations',
        },
        () => {
          fetchGamesSilent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        () => {
          fetchGamesSilent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sessionId, fetchGames, fetchGamesSilent]);

  const create = useCallback(
    async (creatorId: string) => {
      if (!sessionId) return null;
      const game = await createGame(supabase, sessionId, creatorId);
      if (game) {
        await fetchGamesSilent();
      }
      return game;
    },
    [supabase, sessionId, fetchGamesSilent]
  );

  const submit = useCallback(
    async (
      gameId: string,
      rankings: { player_id: string; position: number }[],
      creatorId: string
    ) => {
      const success = await submitRankings(supabase, gameId, rankings, creatorId);
      if (success) {
        await fetchGamesSilent();
      }
      return success;
    },
    [supabase, fetchGamesSilent]
  );

  const confirm = useCallback(
    async (gameId: string, playerId: string) => {
      const success = await confirmGame(supabase, gameId, playerId);
      if (success) {
        await fetchGamesSilent();
      }
      return success;
    },
    [supabase, fetchGamesSilent]
  );

  const unconfirm = useCallback(
    async (gameId: string, playerId: string) => {
      const success = await unconfirmGame(supabase, gameId, playerId);
      if (success) {
        await fetchGamesSilent();
      }
      return success;
    },
    [supabase, fetchGamesSilent]
  );

  const remove = useCallback(
    async (gameId: string, creatorId: string) => {
      const success = await deleteGame(supabase, gameId, creatorId);
      if (success) {
        await fetchGamesSilent();
      }
      return success;
    },
    [supabase, fetchGamesSilent]
  );

  return {
    games,
    isLoading,
    error,
    refresh: fetchGames,
    create,
    submit,
    confirm,
    unconfirm,
    remove,
  };
}

/**
 * Hook to fetch and subscribe to a single game
 */
export function useGame(gameId: string | undefined) {
  const [game, setGame] = useState<GameWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialFetch = useRef(true);

  const supabase = useMemo(() => createClient(), []);

  // Silent fetch for real-time updates (no loading state)
  const fetchGameSilent = useCallback(async () => {
    if (!gameId) return;

    const data = await getGameById(supabase, gameId);
    if (data) {
      setGame(data);
      setError(null);
    }
  }, [supabase, gameId]);

  // Full fetch with loading state (for initial load and manual refresh)
  const fetchGame = useCallback(async () => {
    if (!gameId) {
      setGame(null);
      setIsLoading(false);
      return;
    }

    // Only show loading on initial fetch
    if (isInitialFetch.current) {
      setIsLoading(true);
    }
    setError(null);

    const data = await getGameById(supabase, gameId);
    if (!data) {
      setError('Game not found');
    }
    setGame(data);
    setIsLoading(false);
    isInitialFetch.current = false;
  }, [supabase, gameId]);

  useEffect(() => {
    isInitialFetch.current = true;
    fetchGame();

    if (!gameId) return;

    // Subscribe to real-time changes for this game
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        () => {
          fetchGameSilent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rankings',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          fetchGameSilent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_confirmations',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          fetchGameSilent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          fetchGameSilent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, gameId, fetchGame, fetchGameSilent]);

  const submit = useCallback(
    async (rankings: { player_id: string; position: number }[], creatorId: string) => {
      if (!gameId) return false;
      const success = await submitRankings(supabase, gameId, rankings, creatorId);
      if (success) {
        await fetchGameSilent();
      }
      return success;
    },
    [supabase, gameId, fetchGameSilent]
  );

  const confirm = useCallback(
    async (playerId: string) => {
      if (!gameId) return false;
      const success = await confirmGame(supabase, gameId, playerId);
      if (success) {
        await fetchGameSilent();
      }
      return success;
    },
    [supabase, gameId, fetchGameSilent]
  );

  const unconfirm = useCallback(
    async (playerId: string) => {
      if (!gameId) return false;
      const success = await unconfirmGame(supabase, gameId, playerId);
      if (success) {
        await fetchGameSilent();
      }
      return success;
    },
    [supabase, gameId, fetchGameSilent]
  );

  const remove = useCallback(
    async (creatorId: string) => {
      if (!gameId) return false;
      return await deleteGame(supabase, gameId, creatorId);
    },
    [supabase, gameId]
  );

  return {
    game,
    isLoading,
    error,
    refresh: fetchGame,
    submit,
    confirm,
    unconfirm,
    remove,
  };
}
