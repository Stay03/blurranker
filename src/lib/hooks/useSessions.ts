'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getActiveSessions,
  getPlayerSessions,
  type SessionWithCreator,
} from '@/lib/session';

/**
 * Hook to fetch and subscribe to active sessions
 */
export function useSessions() {
  const [sessions, setSessions] = useState<SessionWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialFetch = useRef(true);

  const supabase = useMemo(() => createClient(), []);

  // Silent fetch for real-time updates (no loading state)
  const fetchSessionsSilent = useCallback(async () => {
    const data = await getActiveSessions(supabase);
    setSessions(data);
    setError(null);
  }, [supabase]);

  // Full fetch with loading state (for initial load and manual refresh)
  const fetchSessions = useCallback(async () => {
    // Only show loading on initial fetch
    if (isInitialFetch.current) {
      setIsLoading(true);
    }
    setError(null);

    const data = await getActiveSessions(supabase);
    setSessions(data);
    setIsLoading(false);
    isInitialFetch.current = false;
  }, [supabase]);

  useEffect(() => {
    isInitialFetch.current = true;
    fetchSessions();

    // Subscribe to real-time changes on sessions table
    const channel = supabase
      .channel('sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        () => {
          // Refetch all sessions on any change
          fetchSessionsSilent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_players',
        },
        () => {
          // Refetch when players join/leave
          fetchSessionsSilent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchSessions, fetchSessionsSilent]);

  return {
    sessions,
    isLoading,
    error,
    refresh: fetchSessions,
  };
}

/**
 * Hook to fetch sessions that the current player is part of
 */
export function usePlayerSessions(playerId: string | undefined) {
  const [sessions, setSessions] = useState<SessionWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialFetch = useRef(true);

  const supabase = useMemo(() => createClient(), []);

  // Silent fetch for real-time updates (no loading state)
  const fetchSessionsSilent = useCallback(async () => {
    if (!playerId) return;

    const data = await getPlayerSessions(supabase, playerId);
    setSessions(data);
    setError(null);
  }, [supabase, playerId]);

  // Full fetch with loading state (for initial load and manual refresh)
  const fetchSessions = useCallback(async () => {
    if (!playerId) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    // Only show loading on initial fetch
    if (isInitialFetch.current) {
      setIsLoading(true);
    }
    setError(null);

    const data = await getPlayerSessions(supabase, playerId);
    setSessions(data);
    setIsLoading(false);
    isInitialFetch.current = false;
  }, [supabase, playerId]);

  useEffect(() => {
    isInitialFetch.current = true;
    fetchSessions();

    if (!playerId) return;

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`player-sessions-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        () => {
          fetchSessionsSilent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_players',
          filter: `player_id=eq.${playerId}`,
        },
        () => {
          fetchSessionsSilent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, playerId, fetchSessions, fetchSessionsSilent]);

  return {
    sessions,
    isLoading,
    error,
    refresh: fetchSessions,
  };
}
