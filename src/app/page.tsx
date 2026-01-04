'use client';

import Link from 'next/link';
import { usePlayer } from '@/contexts/PlayerContext';
import { useSessions } from '@/lib/hooks/useSessions';
import { Container } from '@/components/ui/Container';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/ui/Loading';
import { PlayerSetup } from '@/components/player/PlayerSetup';
import { SessionList } from '@/components/session/SessionList';

export default function Home() {
  const { player, isLoading: playerLoading, isNewUser } = usePlayer();
  const { sessions, isLoading: sessionsLoading } = useSessions();

  if (playerLoading) {
    return <LoadingPage text="Loading..." />;
  }

  if (isNewUser) {
    return (
      <Container size="sm" className="py-12">
        <PlayerSetup />
      </Container>
    );
  }

  return (
    <Container size="md" className="py-8">
      <div className="space-y-6">
        {/* Welcome Card */}
        <Card>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6">
            <div>
              <CardTitle>Welcome back, {player?.name}!</CardTitle>
              <p className="text-muted-foreground mt-1">
                Create a new session or join an existing one.
              </p>
            </div>
            <Link href="/session/create">
              <Button>+ Create Session</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Active Sessions
          </h2>
          <SessionList
            sessions={sessions}
            isLoading={sessionsLoading}
            emptyMessage="No active sessions. Create one to get started!"
          />
        </div>
      </div>
    </Container>
  );
}
