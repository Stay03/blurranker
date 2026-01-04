'use client';

import { useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { Player } from '@/lib/supabase/types';
import type { GameWithDetails } from '@/lib/game';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, calculatePlayerBalance } from '@/lib/utils/payments';
import { useAnimatedList } from '@/lib/hooks/useAnimatedList';

interface SessionStandingsProps {
  sessionPlayers: { player_id: string; player: Player; is_creator: boolean }[];
  games: GameWithDetails[];
  currentPlayerId?: string;
}

type PlayerStanding = {
  player_id: string;
  player: Player;
  is_creator: boolean;
  totalBalance: number;
  gamesPlayed: number;
  wins: number;
  averagePosition: number;
};

export function SessionStandings({
  sessionPlayers,
  games,
  currentPlayerId,
}: SessionStandingsProps) {
  // Calculate total balance for each player across all completed games
  const standings = useMemo(() => {
    const completedGames = games.filter((g) => g.status === 'completed');

    const playerStandings: PlayerStanding[] = sessionPlayers.map((sp) => {
      let totalBalance = 0;
      let gamesPlayed = 0;
      let wins = 0;
      let totalPosition = 0;

      for (const game of completedGames) {
        // Check if player was in this game (has a ranking)
        const ranking = game.rankings.find((r) => r.player_id === sp.player_id);
        if (ranking) {
          gamesPlayed++;
          totalBalance += calculatePlayerBalance(sp.player_id, game.payments);
          totalPosition += ranking.position;
          if (ranking.position === 1) {
            wins++;
          }
        }
      }

      return {
        player_id: sp.player_id,
        player: sp.player,
        is_creator: sp.is_creator,
        totalBalance,
        gamesPlayed,
        wins,
        averagePosition: gamesPlayed > 0 ? totalPosition / gamesPlayed : 0,
      };
    });

    // Sort by total balance (highest first)
    return playerStandings.sort((a, b) => b.totalBalance - a.totalBalance);
  }, [sessionPlayers, games]);

  // Track new players for animation
  const getPlayerId = useCallback((standing: PlayerStanding) => standing.player_id, []);
  const isNewPlayer = useAnimatedList(standings, getPlayerId);

  const completedGamesCount = games.filter((g) => g.status === 'completed').length;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Standings</CardTitle>
          {completedGamesCount > 0 && (
            <span className="text-sm text-muted-foreground">
              After {completedGamesCount} game{completedGamesCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {standings.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No players have joined yet.</p>
        ) : (
          <ul className="space-y-2">
            {standings.map((standing, index) => {
              const isCurrentPlayer = standing.player_id === currentPlayerId;
              const hasPlayed = standing.gamesPlayed > 0;
              const shouldAnimate = isNewPlayer(standing);

              return (
                <li
                  key={standing.player_id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                    isCurrentPlayer
                      ? 'bg-primary/5 border border-primary/20'
                      : 'bg-muted'
                  } ${shouldAnimate ? 'animate-fade-in-up' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank number */}
                    <span className="w-6 text-center font-bold text-muted-foreground">
                      {hasPlayed ? `#${index + 1}` : '-'}
                    </span>

                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-colors duration-300 ${
                        standing.totalBalance > 0
                          ? 'bg-green-500/10 text-green-600'
                          : standing.totalBalance < 0
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {standing.player.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name and badges */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/player/${standing.player_id}`}
                        className={`font-medium hover:underline ${isCurrentPlayer ? 'text-primary' : 'text-foreground'}`}
                      >
                        {standing.player.name}
                      </Link>
                      {standing.is_creator && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                          Host
                        </Badge>
                      )}
                      {isCurrentPlayer && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4">
                    {hasPlayed && (
                      <div className="text-sm text-muted-foreground hidden sm:flex items-center gap-3">
                        <span title="Wins">
                          {standing.wins} win{standing.wins !== 1 ? 's' : ''}
                        </span>
                        <span title="Average Position">
                          Avg: {standing.averagePosition.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Balance */}
                    <div className="text-right min-w-[80px]">
                      {hasPlayed ? (
                        <span
                          className={`font-semibold transition-colors duration-300 ${
                            standing.totalBalance > 0
                              ? 'text-green-600'
                              : standing.totalBalance < 0
                              ? 'text-red-600'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {standing.totalBalance > 0 && '+'}
                          {formatCurrency(standing.totalBalance)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No games</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
