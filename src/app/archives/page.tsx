'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Archive } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getArchivedSessions } from '@/lib/stats';
import type { Session, Player } from '@/lib/supabase/types';
import { Container } from '@/components/ui/Container';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingPage } from '@/components/ui/Loading';
import { BackButton } from '@/components/ui/BackButton';

type ArchivedSession = Session & {
  creator: Player;
  playerCount: number;
  gameCount: number;
  totalMoneyMoved: number;
};

export default function ArchivesPage() {
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSessions() {
      const data = await getArchivedSessions(supabase);
      setSessions(data);
      setIsLoading(false);
    }
    fetchSessions();
  }, [supabase]);

  if (isLoading) {
    return <LoadingPage text="Loading archives..." />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Container size="md" className="py-8">
      <div className="space-y-6">
        <BackButton />

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Archived Sessions</h1>
          <p className="text-muted-foreground mt-1">
            View past sessions and their results
          </p>
        </div>

        {/* Archives List */}
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Archive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No archived sessions yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sessions are archived by the host when they&apos;re complete.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, index) => (
              <Link key={session.id} href={`/session/${session.id}`}>
                <Card
                  className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{session.name}</CardTitle>
                          <Badge variant="secondary">Archived</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Hosted by {session.creator?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Archived on {formatDate(session.archived_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-semibold text-foreground">{session.playerCount}</p>
                          <p className="text-xs text-muted-foreground">Players</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-foreground">{session.gameCount}</p>
                          <p className="text-xs text-muted-foreground">Games</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-primary">
                            {formatCurrency(session.bet_amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">Per Game</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-green-600">
                            {formatCurrency(session.totalMoneyMoved)}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Moved</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Summary */}
        {sessions.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Archives</p>
                  <p className="text-xl font-bold text-foreground">{sessions.length} sessions</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Games Played</p>
                  <p className="text-xl font-bold text-foreground">
                    {sessions.reduce((sum, s) => sum + s.gameCount, 0)} games
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Container>
  );
}
