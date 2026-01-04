import type { SupabaseClient } from '@supabase/supabase-js';
import type { Game, Ranking, GameConfirmation, Player, Payment } from './supabase/types';
import { calculatePayments } from './utils/payments';

export type GameWithDetails = Game & {
  rankings: (Ranking & { player: Player })[];
  confirmations: (GameConfirmation & { player: Player })[];
  payments: Payment[];
};

/**
 * Create a new game in a session
 */
export async function createGame(
  supabase: SupabaseClient,
  sessionId: string,
  creatorId: string
): Promise<Game | null> {
  // Verify the player is the creator
  const { data: session } = await supabase
    .from('sessions')
    .select('creator_id')
    .eq('id', sessionId)
    .single();

  if (!session || session.creator_id !== creatorId) {
    console.error('Only the session creator can create games');
    return null;
  }

  // Get the next game number
  const { data: games } = await supabase
    .from('games')
    .select('game_number')
    .eq('session_id', sessionId)
    .order('game_number', { ascending: false })
    .limit(1);

  const nextGameNumber = games && games.length > 0 ? games[0].game_number + 1 : 1;

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      session_id: sessionId,
      game_number: nextGameNumber,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating game:', error);
    return null;
  }

  return game as Game;
}

/**
 * Get all games for a session with rankings, confirmations, and payments
 */
export async function getSessionGames(
  supabase: SupabaseClient,
  sessionId: string
): Promise<GameWithDetails[]> {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      rankings(
        *,
        player:players(*)
      ),
      game_confirmations(
        *,
        player:players(*)
      ),
      payments(*)
    `)
    .eq('session_id', sessionId)
    .order('game_number', { ascending: false });

  if (error) {
    console.error('Error fetching games:', error);
    return [];
  }

  return (data || []).map((game: any) => ({
    ...game,
    rankings: game.rankings || [],
    confirmations: game.game_confirmations || [],
    payments: game.payments || [],
  }));
}

/**
 * Get a single game by ID with all details
 */
export async function getGameById(
  supabase: SupabaseClient,
  gameId: string
): Promise<GameWithDetails | null> {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      rankings(
        *,
        player:players(*)
      ),
      game_confirmations(
        *,
        player:players(*)
      ),
      payments(*)
    `)
    .eq('id', gameId)
    .single();

  if (error) {
    console.error('Error fetching game:', error);
    return null;
  }

  return {
    ...data,
    rankings: data.rankings || [],
    confirmations: data.game_confirmations || [],
    payments: data.payments || [],
  } as GameWithDetails;
}

/**
 * Submit rankings for a game (only session creator can do this)
 */
export async function submitRankings(
  supabase: SupabaseClient,
  gameId: string,
  rankings: { player_id: string; position: number }[],
  creatorId: string
): Promise<boolean> {
  // Get the game to verify session and creator
  const { data: game } = await supabase
    .from('games')
    .select(`
      *,
      session:sessions(creator_id, bet_amount)
    `)
    .eq('id', gameId)
    .single();

  if (!game) {
    console.error('Game not found');
    return false;
  }

  const session = (game as any).session;
  if (session.creator_id !== creatorId) {
    console.error('Only the session creator can submit rankings');
    return false;
  }

  // Delete existing rankings for this game (in case of re-submission)
  await supabase.from('rankings').delete().eq('game_id', gameId);
  await supabase.from('payments').delete().eq('game_id', gameId);

  // Insert new rankings
  const rankingRecords = rankings.map((r) => ({
    game_id: gameId,
    player_id: r.player_id,
    position: r.position,
  }));

  const { error: rankingError } = await supabase
    .from('rankings')
    .insert(rankingRecords);

  if (rankingError) {
    console.error('Error submitting rankings:', rankingError);
    return false;
  }

  // Calculate and create payments
  const payments = calculatePayments(rankings, session.bet_amount);
  const paymentRecords = payments.map((p) => ({
    session_id: game.session_id,
    game_id: gameId,
    from_player_id: p.from_player_id,
    to_player_id: p.to_player_id,
    amount: p.amount,
  }));

  if (paymentRecords.length > 0) {
    const { error: paymentError } = await supabase
      .from('payments')
      .insert(paymentRecords);

    if (paymentError) {
      console.error('Error creating payments:', paymentError);
      // Don't fail the whole operation, rankings are saved
    }
  }

  // Mark game as completed
  const { error: updateError } = await supabase
    .from('games')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  if (updateError) {
    console.error('Error updating game status:', updateError);
  }

  return true;
}

/**
 * Confirm game results (player confirms they agree with rankings)
 */
export async function confirmGame(
  supabase: SupabaseClient,
  gameId: string,
  playerId: string
): Promise<boolean> {
  // Check if already confirmed
  const { data: existing } = await supabase
    .from('game_confirmations')
    .select('*')
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .single();

  if (existing) {
    return true; // Already confirmed
  }

  const { error } = await supabase
    .from('game_confirmations')
    .insert({
      game_id: gameId,
      player_id: playerId,
    });

  if (error) {
    console.error('Error confirming game:', error);
    return false;
  }

  return true;
}

/**
 * Unconfirm game results
 */
export async function unconfirmGame(
  supabase: SupabaseClient,
  gameId: string,
  playerId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('game_confirmations')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', playerId);

  if (error) {
    console.error('Error unconfirming game:', error);
    return false;
  }

  return true;
}

/**
 * Delete a game (only session creator, only pending games)
 */
export async function deleteGame(
  supabase: SupabaseClient,
  gameId: string,
  creatorId: string
): Promise<boolean> {
  // Get the game to verify
  const { data: game } = await supabase
    .from('games')
    .select(`
      *,
      session:sessions(creator_id)
    `)
    .eq('id', gameId)
    .single();

  if (!game) {
    console.error('Game not found');
    return false;
  }

  const session = (game as any).session;
  if (session.creator_id !== creatorId) {
    console.error('Only the session creator can delete games');
    return false;
  }

  // Delete related data first
  await supabase.from('game_confirmations').delete().eq('game_id', gameId);
  await supabase.from('rankings').delete().eq('game_id', gameId);
  await supabase.from('payments').delete().eq('game_id', gameId);

  const { error } = await supabase.from('games').delete().eq('id', gameId);

  if (error) {
    console.error('Error deleting game:', error);
    return false;
  }

  return true;
}
