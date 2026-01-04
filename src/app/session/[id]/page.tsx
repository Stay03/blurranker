'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DollarSign } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useSession } from '@/lib/hooks/useSession';
import { useGames } from '@/lib/hooks/useGames';
import { Container } from '@/components/ui/Container';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingPage } from '@/components/ui/Loading';
import { BackButton } from '@/components/ui/BackButton';
import { GameList } from '@/components/game';
import { SessionStandings } from '@/components/session/SessionStandings';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SessionDetailPage({ params }: PageProps) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const { player, isLoading: playerLoading } = usePlayer();
  const { session, isLoading: sessionLoading, error, join, leave, archive } =
    useSession(sessionId);
  const { games } = useGames(sessionId);

  const isLoading = playerLoading || sessionLoading;

  const isCreator = useMemo(
    () => session?.creator_id === player?.id,
    [session, player]
  );

  const isInSession = useMemo(
    () =>
      session?.players?.some((sp) => sp.player_id === player?.id) ?? false,
    [session, player]
  );

  if (isLoading) {
    return <LoadingPage text="Loading session..." />;
  }

  if (error || !session) {
    return (
      <Container size="sm" className="py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Session Not Found
              </h2>
              <p className="text-muted-foreground mb-4">
                This session may have been archived or doesn&apos;t exist.
              </p>
              <Link href="/">
                <Button>Back to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleJoin = async () => {
    if (!player) return;
    await join(player.id);
  };

  const handleLeave = async () => {
    if (!player) return;
    const success = await leave(player.id);
    if (success) {
      router.push('/');
    }
  };

  const handleArchive = async () => {
    if (!player) return;
    if (
      !confirm(
        'Are you sure you want to archive this session? This cannot be undone.'
      )
    ) {
      return;
    }
    const success = await archive(player.id);
    if (success) {
      router.push('/');
    }
  };

  return (
    <Container size="md" className="py-8">
      <div className="space-y-6">
        <BackButton />

        {/* Session Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{session.name}</CardTitle>
                <p className="text-muted-foreground mt-1">
                  Created by {session.creator?.name ?? 'Unknown'}
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {formatCurrency(session.bet_amount)} per game
                  </Badge>
                  {session.status === 'archived' && (
                    <Badge variant="secondary">Archived</Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {isInSession && (
                  <Link href={`/session/${sessionId}/payments`}>
                    <Button variant="secondary">
                      <DollarSign className="w-4 h-4 mr-1.5" />
                      Payments
                    </Button>
                  </Link>
                )}
                {session.status === 'active' && (
                  <>
                    {!isInSession ? (
                      <Button onClick={handleJoin}>Join Session</Button>
                    ) : (
                      <>
                        {!isCreator && (
                          <Button variant="secondary" onClick={handleLeave}>
                            Leave
                          </Button>
                        )}
                        {isCreator && (
                          <Button variant="destructive" onClick={handleArchive}>
                            Archive
                          </Button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Standings */}
        {session.players && (
          <SessionStandings
            sessionPlayers={session.players}
            games={games}
            currentPlayerId={player?.id}
          />
        )}

        {/* Games Section */}
        {isInSession && session.status === 'active' && session.players && (
          <GameList
            sessionId={sessionId}
            sessionPlayers={session.players}
            currentPlayerId={player?.id}
            isCreator={isCreator}
            betAmount={session.bet_amount}
          />
        )}
      </div>
    </Container>
  );
}
