'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getPlayerStats, type PlayerProfileStats } from '@/lib/stats';
import { usePlayer } from '@/contexts/PlayerContext';
import { Container } from '@/components/ui/Container';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingPage } from '@/components/ui/Loading';
import { BackButton } from '@/components/ui/BackButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlayerProfilePage({ params }: PageProps) {
  const { id: playerId } = use(params);
  const [stats, setStats] = useState<PlayerProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { player: currentPlayer } = usePlayer();
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      const data = await getPlayerStats(supabase, playerId);
      setStats(data);
      setIsLoading(false);
    }
    fetchStats();
  }, [supabase, playerId]);

  if (isLoading) {
    return <LoadingPage text="Loading player stats..." />;
  }

  if (!stats) {
    return (
      <Container size="sm" className="py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Player Not Found
              </h2>
              <p className="text-muted-foreground mb-4">
                This player doesn&apos;t exist or hasn&apos;t played any games.
              </p>
              <Link href="/" className="text-primary hover:underline">
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const isCurrentPlayer = currentPlayer?.id === playerId;

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;
    return formatted;
  };

  const getPositionSuffix = (position: number) => {
    if (position === 1) return 'st';
    if (position === 2) return 'nd';
    if (position === 3) return 'rd';
    return 'th';
  };

  const formatDate = (dateString: string) => {
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

        {/* Player Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                  stats.netProfit > 0
                    ? 'bg-green-500/10 text-green-600'
                    : stats.netProfit < 0
                    ? 'bg-red-500/10 text-red-600'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {stats.playerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    {stats.playerName}
                  </h1>
                  {isCurrentPlayer && (
                    <Badge variant="secondary">You</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {stats.sessionsPlayed} session{stats.sessionsPlayed !== 1 ? 's' : ''} played
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.gamesPlayed}</p>
              <p className="text-sm text-muted-foreground">Games Played</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.wins}</p>
              <p className="text-sm text-muted-foreground">Wins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-foreground">
                {stats.winRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardContent className="pt-6 text-center">
              <p
                className={`text-2xl font-bold ${
                  stats.netProfit > 0
                    ? 'text-green-600'
                    : stats.netProfit < 0
                    ? 'text-red-600'
                    : 'text-foreground'
                }`}
              >
                {formatCurrency(stats.netProfit)}
              </p>
              <p className="text-sm text-muted-foreground">Net Profit</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <Card>
          <CardContent className="pt-6">
            <CardTitle>Detailed Statistics</CardTitle>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-lg col-span-3 sm:col-span-1">
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(stats.totalEarnings)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg col-span-3 sm:col-span-1">
                <p className="text-sm text-muted-foreground">Total Losses</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(-stats.totalLosses)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg col-span-3 sm:col-span-1">
                <p className="text-sm text-muted-foreground">Average Position</p>
                <p className="text-lg font-semibold text-foreground">
                  {stats.averagePosition > 0 ? stats.averagePosition.toFixed(2) : '-'}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">2nd Places</p>
                <p className="text-lg font-semibold text-foreground">{stats.secondPlaces}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">3rd Places</p>
                <p className="text-lg font-semibold text-foreground">{stats.thirdPlaces}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Last Places</p>
                <p className="text-lg font-semibold text-foreground">{stats.lastPlaces}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Games */}
        {stats.recentGames.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <CardTitle>Recent Games</CardTitle>
              <div className="mt-4 space-y-2">
                {stats.recentGames.map((game, index) => (
                  <div
                    key={game.gameId}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          game.position === 1
                            ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-500'
                            : game.position === game.totalPlayers
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-muted-foreground/10 text-muted-foreground'
                        }`}
                      >
                        {game.position}
                        <sup className="text-xs">{getPositionSuffix(game.position)}</sup>
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{game.sessionName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(game.completedAt)} &middot; {game.totalPlayers} players
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold ${
                        game.netResult > 0
                          ? 'text-green-600'
                          : game.netResult < 0
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatCurrency(game.netResult)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Container>
  );
}
