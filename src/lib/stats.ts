import type { SupabaseClient } from '@supabase/supabase-js';
import type { Player, Game, Ranking, Payment, Session } from './supabase/types';
import {
  calculateAllTimeStats,
  calculatePlayerSessionStats,
  type AllTimeLeaderboardEntry,
  type PlayerStats,
} from './utils/stats';

export type PlayerProfileStats = PlayerStats & {
  sessionsPlayed: number;
  recentGames: {
    gameId: string;
    sessionName: string;
    position: number;
    totalPlayers: number;
    netResult: number;
    completedAt: string;
  }[];
};

/**
 * Get all-time leaderboard data
 */
export async function getAllTimeLeaderboard(
  supabase: SupabaseClient
): Promise<AllTimeLeaderboardEntry[]> {
  // Get all players who have played games
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*');

  if (playersError || !players) {
    console.error('Error fetching players:', playersError);
    return [];
  }

  // Get all rankings with game data
  const { data: rankings, error: rankingsError } = await supabase
    .from('rankings')
    .select(`
      *,
      game:games(*),
      player:players(*)
    `);

  if (rankingsError || !rankings) {
    console.error('Error fetching rankings:', rankingsError);
    return [];
  }

  // Filter to only completed games
  const completedRankings = (rankings as any[]).filter(
    (r) => r.game?.status === 'completed'
  );

  // Get all payments
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*');

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
  }

  // Get sessions per player
  const { data: sessionPlayers, error: sessionPlayersError } = await supabase
    .from('session_players')
    .select('player_id, session_id');

  if (sessionPlayersError) {
    console.error('Error fetching session players:', sessionPlayersError);
  }

  const sessionsPerPlayer = new Map<string, number>();
  if (sessionPlayers) {
    for (const sp of sessionPlayers) {
      const count = sessionsPerPlayer.get(sp.player_id) || 0;
      sessionsPerPlayer.set(sp.player_id, count + 1);
    }
  }

  return calculateAllTimeStats(
    players as Player[],
    completedRankings,
    (payments || []) as Payment[],
    sessionsPerPlayer
  );
}

/**
 * Get detailed stats for a single player
 */
export async function getPlayerStats(
  supabase: SupabaseClient,
  playerId: string
): Promise<PlayerProfileStats | null> {
  // Get player info
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (playerError || !player) {
    console.error('Error fetching player:', playerError);
    return null;
  }

  // Get all rankings for this player with game and session data
  const { data: rankings, error: rankingsError } = await supabase
    .from('rankings')
    .select(`
      *,
      game:games(
        *,
        session:sessions(name)
      )
    `)
    .eq('player_id', playerId);

  if (rankingsError) {
    console.error('Error fetching rankings:', rankingsError);
    return null;
  }

  // Filter to only completed games
  const completedRankings = ((rankings || []) as any[]).filter(
    (r) => r.game?.status === 'completed'
  );

  // Get all payments involving this player
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .or(`from_player_id.eq.${playerId},to_player_id.eq.${playerId}`);

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
  }

  // Get count of rankings per game to determine total players
  const gameIds = completedRankings.map((r: any) => r.game_id);
  const { data: allGameRankings, error: allGameRankingsError } = await supabase
    .from('rankings')
    .select('game_id')
    .in('game_id', gameIds.length > 0 ? gameIds : ['none']);

  if (allGameRankingsError) {
    console.error('Error fetching all game rankings:', allGameRankingsError);
  }

  // Build map of game_id -> total players
  const totalPlayersInGames = new Map<string, number>();
  if (allGameRankings) {
    for (const r of allGameRankings) {
      const count = totalPlayersInGames.get(r.game_id) || 0;
      totalPlayersInGames.set(r.game_id, count + 1);
    }
  }

  // Get sessions count for this player
  const { data: sessionPlayers, error: sessionPlayersError } = await supabase
    .from('session_players')
    .select('session_id')
    .eq('player_id', playerId);

  if (sessionPlayersError) {
    console.error('Error fetching session players:', sessionPlayersError);
  }

  const stats = calculatePlayerSessionStats(
    playerId,
    (player as Player).name,
    completedRankings.map((r: any) => ({ ...r, game: r.game })),
    (payments || []) as Payment[],
    totalPlayersInGames
  );

  // Build recent games list
  const recentGames = completedRankings
    .sort((a: any, b: any) =>
      new Date(b.game.completed_at).getTime() - new Date(a.game.completed_at).getTime()
    )
    .slice(0, 10)
    .map((r: any) => {
      const totalPlayers = totalPlayersInGames.get(r.game_id) || 1;
      const gamePayments = ((payments || []) as Payment[]).filter(
        (p) => p.game_id === r.game_id
      );
      const earned = gamePayments
        .filter((p) => p.to_player_id === playerId)
        .reduce((sum, p) => sum + p.amount, 0);
      const lost = gamePayments
        .filter((p) => p.from_player_id === playerId)
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        gameId: r.game_id,
        sessionName: r.game.session?.name || 'Unknown Session',
        position: r.position,
        totalPlayers,
        netResult: earned - lost,
        completedAt: r.game.completed_at,
      };
    });

  return {
    ...stats,
    sessionsPlayed: sessionPlayers?.length || 0,
    recentGames,
  };
}

/**
 * Get archived sessions with summary info
 */
export async function getArchivedSessions(
  supabase: SupabaseClient
): Promise<(Session & {
  creator: Player;
  playerCount: number;
  gameCount: number;
  totalMoneyMoved: number;
})[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      creator:players!creator_id(*),
      session_players(count),
      games(count),
      payments(amount)
    `)
    .eq('status', 'archived')
    .order('archived_at', { ascending: false });

  if (error) {
    console.error('Error fetching archived sessions:', error);
    return [];
  }

  return ((data || []) as any[]).map((session) => {
    const totalMoney = (session.payments || []).reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0
    );

    return {
      ...session,
      creator: session.creator,
      playerCount: session.session_players[0]?.count || 0,
      gameCount: session.games[0]?.count || 0,
      totalMoneyMoved: totalMoney,
    };
  });
}
