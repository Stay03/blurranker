'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getSessionById,
  joinSession,
  leaveSession,
  archiveSession,
  type SessionWithPlayers,
} from '@/lib/session';

/**
 * Hook to fetch and subscribe to a single session
 */
export function useSession(sessionId: string | undefined) {
  const [session, setSession] = useState<SessionWithPlayers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialFetch = useRef(true);

  const supabase = useMemo(() => createClient(), []);

  // Silent fetch for real-time updates (no loading state)
  const fetchSessionSilent = useCallback(async () => {
    if (!sessionId) return;

    const data = await getSessionById(supabase, sessionId);
    if (data) {
      setSession(data);
      setError(null);
    }
  }, [supabase, sessionId]);

  // Full fetch with loading state (for initial load and manual refresh)
  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    // Only show loading on initial fetch
    if (isInitialFetch.current) {
      setIsLoading(true);
    }
    setError(null);

    const data = await getSessionById(supabase, sessionId);
    if (!data) {
      setError('Session not found');
    }
    setSession(data);
    setIsLoading(false);
    isInitialFetch.current = false;
  }, [supabase, sessionId]);

  useEffect(() => {
    isInitialFetch.current = true;
    fetchSession();

    if (!sessionId) return;

    // Subscribe to real-time changes for this session
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => {
          fetchSessionSilent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_players',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchSessionSilent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchSessionSilent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sessionId, fetchSession, fetchSessionSilent]);

  const join = useCallback(
    async (playerId: string) => {
      if (!sessionId) return false;
      const success = await joinSession(supabase, sessionId, playerId);
      if (success) {
        await fetchSessionSilent();
      }
      return success;
    },
    [supabase, sessionId, fetchSessionSilent]
  );

  const leave = useCallback(
    async (playerId: string) => {
      if (!sessionId) return false;
      const success = await leaveSession(supabase, sessionId, playerId);
      if (success) {
        await fetchSessionSilent();
      }
      return success;
    },
    [supabase, sessionId, fetchSessionSilent]
  );

  const archive = useCallback(
    async (playerId: string) => {
      if (!sessionId) return false;
      const success = await archiveSession(supabase, sessionId, playerId);
      if (success) {
        await fetchSessionSilent();
      }
      return success;
    },
    [supabase, sessionId, fetchSessionSilent]
  );

  return {
    session,
    isLoading,
    error,
    refresh: fetchSession,
    join,
    leave,
    archive,
  };
}
