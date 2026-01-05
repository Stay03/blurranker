import { v4 as uuidv4 } from 'uuid';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Player } from './supabase/types';

export function isPlayerOnline(lastSeen: string, thresholdMinutes = 1): boolean {
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes <= thresholdMinutes;
}

const DEVICE_ID_KEY = 'blurranker_device_id';

const adjectives = [
  'Swift', 'Calm', 'Bold', 'Brave', 'Clever', 'Eager', 'Fierce', 'Gentle',
  'Happy', 'Jolly', 'Kind', 'Lucky', 'Mighty', 'Noble', 'Quick', 'Sharp',
  'Silent', 'Smooth', 'Steady', 'Wise', 'Wild', 'Bright', 'Cool', 'Dark'
];

const nouns = [
  'Tiger', 'Wave', 'Storm', 'Hawk', 'Wolf', 'Bear', 'Fox', 'Eagle',
  'Lion', 'Shark', 'Dragon', 'Phoenix', 'Falcon', 'Panther', 'Cobra', 'Raven',
  'Thunder', 'Shadow', 'Flame', 'Frost', 'Star', 'Moon', 'Sun', 'Stone'
];

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

export function generatePlayerName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
}

export async function getOrCreatePlayer(
  supabase: SupabaseClient,
  deviceId: string
): Promise<Player | null> {
  // Try to find existing player
  const { data: existingPlayer, error: fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('device_id', deviceId)
    .single();

  if (existingPlayer) {
    // Update last_seen
    await supabase
      .from('players')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', existingPlayer.id);

    return existingPlayer as Player;
  }

  // If not found (and not a different error), create new player
  if (fetchError && fetchError.code === 'PGRST116') {
    const newName = generatePlayerName();

    const { data: newPlayer, error: insertError } = await supabase
      .from('players')
      .insert({
        name: newName,
        device_id: deviceId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating player:', insertError);
      return null;
    }

    return newPlayer as Player;
  }

  if (fetchError) {
    console.error('Error fetching player:', fetchError);
  }

  return null;
}

export async function checkUsernameAvailable(
  supabase: SupabaseClient,
  name: string,
  excludePlayerId?: string
): Promise<{ available: boolean }> {
  let query = supabase
    .from('players')
    .select('id')
    .ilike('name', name);

  if (excludePlayerId) {
    query = query.neq('id', excludePlayerId);
  }

  const { data } = await query.limit(1);
  return { available: !data || data.length === 0 };
}

export async function updatePlayerName(
  supabase: SupabaseClient,
  playerId: string,
  name: string
): Promise<{ success: boolean; player?: Player; error?: string }> {
  // Check if username is available (case-insensitive)
  const { available } = await checkUsernameAvailable(supabase, name, playerId);

  if (!available) {
    return { success: false, error: 'Username is already taken' };
  }

  const { data, error } = await supabase
    .from('players')
    .update({ name })
    .eq('id', playerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating player name:', error);
    return { success: false, error: 'Failed to update name' };
  }

  return { success: true, player: data as Player };
}
