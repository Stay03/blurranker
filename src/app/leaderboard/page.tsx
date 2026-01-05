'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getAllTimeLeaderboard } from '@/lib/stats';
import type { AllTimeLeaderboardEntry } from '@/lib/utils/stats';
import { Container } from '@/components/ui/Container';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/Loading';
import { BackButton } from '@/components/ui/BackButton';
import { OnlineIndicator } from '@/components/ui/OnlineIndicator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<AllTimeLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchLeaderboard() {
      const data = await getAllTimeLeaderboard(supabase);
      setLeaderboard(data);
      setIsLoading(false);
    }
    fetchLeaderboard();
  }, [supabase]);

  if (isLoading) {
    return <LoadingPage text="Loading leaderboard..." />;
  }

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;
    return formatted;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { emoji: '🥇', bg: 'bg-yellow-500/20' };
    if (index === 1) return { emoji: '🥈', bg: 'bg-muted' };
    if (index === 2) return { emoji: '🥉', bg: 'bg-orange-500/20' };
    return null;
  };

  return (
    <Container size="md" className="py-8">
      <div className="space-y-6">
        <BackButton />

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">All-Time Leaderboard</h1>
          <p className="text-muted-foreground mt-1">
            Rankings across all sessions and games
          </p>
        </div>

        {/* Leaderboard */}
        <Card>
          <CardContent className="p-0">
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 px-6">
                <p className="text-muted-foreground">No games have been played yet.</p>
                <Link href="/" className="text-primary hover:underline mt-2 inline-block">
                  Start a session to begin tracking stats
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Sessions</TableHead>
                      <TableHead className="text-center">Games</TableHead>
                      <TableHead className="text-center">Wins</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Win Rate</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Avg Pos</TableHead>
                      <TableHead className="text-right">Net Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry, index) => {
                      const rankBadge = getRankBadge(index);
                      return (
                        <TableRow
                          key={entry.playerId}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell>
                            {rankBadge ? (
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${rankBadge.bg}`}>
                                <span className="text-lg">{rankBadge.emoji}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-8 h-8 text-muted-foreground font-medium">
                                #{index + 1}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <OnlineIndicator lastSeen={entry.lastSeen} size="sm" />
                              <Link
                                href={`/player/${entry.playerId}`}
                                className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
                              >
                                {entry.playerName}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground hidden sm:table-cell">
                            {entry.sessionsPlayed}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {entry.gamesPlayed}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {entry.wins}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground hidden sm:table-cell">
                            {entry.winRate.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground hidden md:table-cell">
                            {entry.averagePosition.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-semibold ${
                                entry.netProfit > 0
                                  ? 'text-green-600'
                                  : entry.netProfit < 0
                                  ? 'text-red-600'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {formatCurrency(entry.netProfit)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        {leaderboard.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-foreground">{leaderboard.length}</p>
                <p className="text-sm text-muted-foreground">Players</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {leaderboard.reduce((sum, e) => sum + e.gamesPlayed, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Games</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {Math.max(...leaderboard.map((e) => e.wins))}
                </p>
                <p className="text-sm text-muted-foreground">Most Wins</p>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    leaderboard
                      .filter((e) => e.netProfit > 0)
                      .reduce((sum, e) => sum + e.netProfit, 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Total Winnings</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Container>
  );
}
