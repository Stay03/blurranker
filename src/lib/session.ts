import type { SupabaseClient } from '@supabase/supabase-js';
import type { Session, SessionPlayer, Player } from './supabase/types';

export type SessionWithCreator = Session & {
  creator: Player;
  player_count: number;
};

export type SessionWithPlayers = Session & {
  creator: Player;
  players: (SessionPlayer & { player: Player })[];
};

/**
 * Create a new session
 */
export async function createSession(
  supabase: SupabaseClient,
  data: {
    name: string;
    bet_amount: number;
    creator_id: string;
  }
): Promise<Session | null> {
  // Create the session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      name: data.name,
      bet_amount: data.bet_amount,
      creator_id: data.creator_id,
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error('Error creating session:', sessionError);
    return null;
  }

  // Add creator as a session player
  const { error: playerError } = await supabase.from('session_players').insert({
    session_id: session.id,
    player_id: data.creator_id,
    is_creator: true,
  });

  if (playerError) {
    console.error('Error adding creator to session:', playerError);
    // Clean up the session if we couldn't add the creator
    await supabase.from('sessions').delete().eq('id', session.id);
    return null;
  }

  return session as Session;
}

/**
 * Get all active sessions with creator info and player count
 */
export async function getActiveSessions(
  supabase: SupabaseClient
): Promise<SessionWithCreator[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(
      `
      *,
      creator:players!creator_id(*),
      session_players(count)
    `
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }

  return (data || []).map((session: any) => ({
    ...session,
    creator: session.creator,
    player_count: session.session_players[0]?.count || 0,
  }));
}

/**
 * Get a single session by ID with all players
 */
export async function getSessionById(
  supabase: SupabaseClient,
  sessionId: string
): Promise<SessionWithPlayers | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select(
      `
      *,
      creator:players!creator_id(*),
      session_players(
        *,
        player:players!player_id(*)
      )
    `
    )
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }

  // Map the response to ensure players array exists
  const session = data as any;
  return {
    ...session,
    players: session.session_players || [],
  } as SessionWithPlayers;
}

/**
 * Join a session
 */
export async function joinSession(
  supabase: SupabaseClient,
  sessionId: string,
  playerId: string
): Promise<boolean> {
  // Check if already joined
  const { data: existing, error: checkError } = await supabase
    .from('session_players')
    .select('*')
    .eq('session_id', sessionId)
    .eq('player_id', playerId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" which is expected for new joins
    console.error('Error checking existing membership:', checkError);
  }

  if (existing) {
    return true;
  }

  const { error } = await supabase.from('session_players').insert({
    session_id: sessionId,
    player_id: playerId,
    is_creator: false,
  });

  if (error) {
    console.error('Error joining session:', error);
    return false;
  }

  return true;
}

/**
 * Leave a session
 */
export async function leaveSession(
  supabase: SupabaseClient,
  sessionId: string,
  playerId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('session_players')
    .delete()
    .eq('session_id', sessionId)
    .eq('player_id', playerId);

  if (error) {
    console.error('Error leaving session:', error);
    return false;
  }

  return true;
}

/**
 * Archive a session (only creator can do this)
 */
export async function archiveSession(
  supabase: SupabaseClient,
  sessionId: string,
  playerId: string
): Promise<boolean> {
  // Verify the player is the creator
  const { data: session } = await supabase
    .from('sessions')
    .select('creator_id')
    .eq('id', sessionId)
    .single();

  if (!session || session.creator_id !== playerId) {
    console.error('Only the creator can archive a session');
    return false;
  }

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error archiving session:', error);
    return false;
  }

  return true;
}

/**
 * Check if a player is in a session
 */
export async function isPlayerInSession(
  supabase: SupabaseClient,
  sessionId: string,
  playerId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('session_players')
    .select('*')
    .eq('session_id', sessionId)
    .eq('player_id', playerId)
    .single();

  return !!data;
}

/**
 * Get sessions that a player is part of
 */
export async function getPlayerSessions(
  supabase: SupabaseClient,
  playerId: string
): Promise<SessionWithCreator[]> {
  const { data, error } = await supabase
    .from('session_players')
    .select(
      `
      session:sessions(
        *,
        creator:players!creator_id(*),
        session_players(count)
      )
    `
    )
    .eq('player_id', playerId);

  if (error) {
    console.error('Error fetching player sessions:', error);
    return [];
  }

  return (data || [])
    .filter((item: any) => item.session?.status === 'active')
    .map((item: any) => ({
      ...item.session,
      creator: item.session.creator,
      player_count: item.session.session_players[0]?.count || 0,
    }));
}
