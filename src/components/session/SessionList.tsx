'use client';

import { useCallback } from 'react';
import { SessionCard } from './SessionCard';
import { Loading } from '@/components/ui/Loading';
import { useAnimatedList } from '@/lib/hooks/useAnimatedList';
import type { SessionWithCreator } from '@/lib/session';

interface SessionListProps {
  sessions: SessionWithCreator[];
  isLoading: boolean;
  emptyMessage?: string;
}

export function SessionList({
  sessions,
  isLoading,
  emptyMessage = 'No sessions found',
}: SessionListProps) {
  // Track new sessions for animation
  const getSessionId = useCallback((session: SessionWithCreator) => session.id, []);
  const isNewSession = useAnimatedList(sessions, getSessionId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loading size="lg" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          className={isNewSession(session) ? 'animate-fade-in-up' : ''}
        >
          <SessionCard session={session} />
        </div>
      ))}
    </div>
  );
}
