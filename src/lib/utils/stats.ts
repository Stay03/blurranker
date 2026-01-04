import type { Game, Ranking, Payment, Player } from '../supabase/types';

export type PlayerStats = {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  secondPlaces: number;
  thirdPlaces: number;
  lastPlaces: number;
  winRate: number;
  totalEarnings: number;
  totalLosses: number;
  netProfit: number;
  averagePosition: number;
};

export type SessionLeaderboardEntry = {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  netProfit: number;
  averagePosition: number;
};

export type AllTimeLeaderboardEntry = PlayerStats & {
  sessionsPlayed: number;
};

/**
 * Calculate stats for a single player within a session
 */
export function calculatePlayerSessionStats(
  playerId: string,
  playerName: string,
  rankings: (Ranking & { game: Game })[],
  payments: Payment[],
  totalPlayersInGames: Map<string, number>
): PlayerStats {
  const playerRankings = rankings.filter((r) => r.player_id === playerId);
  const gamesPlayed = playerRankings.length;

  if (gamesPlayed === 0) {
    return {
      playerId,
      playerName,
      gamesPlayed: 0,
      wins: 0,
      secondPlaces: 0,
      thirdPlaces: 0,
      lastPlaces: 0,
      winRate: 0,
      totalEarnings: 0,
      totalLosses: 0,
      netProfit: 0,
      averagePosition: 0,
    };
  }

  const wins = playerRankings.filter((r) => r.position === 1).length;
  const secondPlaces = playerRankings.filter((r) => r.position === 2).length;
  const thirdPlaces = playerRankings.filter((r) => r.position === 3).length;

  // Count last places by checking if position equals total players in that game
  const lastPlaces = playerRankings.filter((r) => {
    const totalPlayers = totalPlayersInGames.get(r.game_id) || 0;
    return r.position === totalPlayers;
  }).length;

  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

  const totalPositions = playerRankings.reduce((sum, r) => sum + r.position, 0);
  const averagePosition = gamesPlayed > 0 ? totalPositions / gamesPlayed : 0;

  // Calculate earnings (money received)
  const totalEarnings = payments
    .filter((p) => p.to_player_id === playerId)
    .reduce((sum, p) => sum + p.amount, 0);

  // Calculate losses (money owed)
  const totalLosses = payments
    .filter((p) => p.from_player_id === playerId)
    .reduce((sum, p) => sum + p.amount, 0);

  const netProfit = totalEarnings - totalLosses;

  return {
    playerId,
    playerName,
    gamesPlayed,
    wins,
    secondPlaces,
    thirdPlaces,
    lastPlaces,
    winRate,
    totalEarnings,
    totalLosses,
    netProfit,
    averagePosition,
  };
}

/**
 * Calculate session leaderboard from games and payments
 */
export function calculateSessionLeaderboard(
  players: { player_id: string; player: Player }[],
  games: (Game & { rankings: Ranking[] })[],
  payments: Payment[]
): SessionLeaderboardEntry[] {
  // Build a map of game_id -> total players in that game
  const totalPlayersInGames = new Map<string, number>();
  for (const game of games) {
    if (game.status === 'completed' && game.rankings) {
      totalPlayersInGames.set(game.id, game.rankings.length);
    }
  }

  // Flatten all rankings with game info
  const allRankings: (Ranking & { game: Game })[] = [];
  for (const game of games) {
    if (game.status === 'completed' && game.rankings) {
      for (const ranking of game.rankings) {
        allRankings.push({ ...ranking, game });
      }
    }
  }

  const leaderboard: SessionLeaderboardEntry[] = players.map(({ player_id, player }) => {
    const stats = calculatePlayerSessionStats(
      player_id,
      player.name,
      allRankings,
      payments,
      totalPlayersInGames
    );

    return {
      playerId: stats.playerId,
      playerName: stats.playerName,
      gamesPlayed: stats.gamesPlayed,
      wins: stats.wins,
      netProfit: stats.netProfit,
      averagePosition: stats.averagePosition,
    };
  });

  // Sort by net profit descending, then by wins, then by average position
  return leaderboard.sort((a, b) => {
    if (b.netProfit !== a.netProfit) return b.netProfit - a.netProfit;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.averagePosition !== b.averagePosition) return a.averagePosition - b.averagePosition;
    return 0;
  });
}

/**
 * Calculate all-time stats for multiple players across all their games
 */
export function calculateAllTimeStats(
  players: Player[],
  allRankings: (Ranking & { game: Game; player: Player })[],
  allPayments: Payment[],
  sessionsPerPlayer: Map<string, number>
): AllTimeLeaderboardEntry[] {
  // Build a map of game_id -> total players in that game
  const totalPlayersInGames = new Map<string, number>();
  const gameIdToRankings = new Map<string, Ranking[]>();

  for (const ranking of allRankings) {
    const existing = gameIdToRankings.get(ranking.game_id) || [];
    existing.push(ranking);
    gameIdToRankings.set(ranking.game_id, existing);
  }

  for (const [gameId, rankings] of gameIdToRankings) {
    totalPlayersInGames.set(gameId, rankings.length);
  }

  const leaderboard: AllTimeLeaderboardEntry[] = players.map((player) => {
    const stats = calculatePlayerSessionStats(
      player.id,
      player.name,
      allRankings,
      allPayments,
      totalPlayersInGames
    );

    return {
      ...stats,
      sessionsPlayed: sessionsPerPlayer.get(player.id) || 0,
    };
  });

  // Sort by net profit descending, then by wins, then by win rate
  return leaderboard
    .filter((entry) => entry.gamesPlayed > 0)
    .sort((a, b) => {
      if (b.netProfit !== a.netProfit) return b.netProfit - a.netProfit;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return 0;
    });
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(amount));

  if (amount < 0) {
    return `-${formatted}`;
  }
  return amount > 0 ? `+${formatted}` : formatted;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format average position for display
 */
export function formatAveragePosition(value: number): string {
  if (value === 0) return '-';
  return value.toFixed(2);
}
