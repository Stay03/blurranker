import type { SupabaseClient } from '@supabase/supabase-js';
import type { Payment, Player, Game } from './supabase/types';

export type PaymentWithDetails = Payment & {
  from_player: Player;
  to_player: Player;
  game: Game | null;
};

/**
 * Get all payments for a session with player and game details
 */
export async function getSessionPayments(
  supabase: SupabaseClient,
  sessionId: string
): Promise<PaymentWithDetails[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      from_player:players!payments_from_player_id_fkey(*),
      to_player:players!payments_to_player_id_fkey(*),
      game:games(*)
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching session payments:', error);
    return [];
  }

  return (data || []) as PaymentWithDetails[];
}

/**
 * Get payment history for a specific player
 */
export async function getPlayerPayments(
  supabase: SupabaseClient,
  playerId: string
): Promise<PaymentWithDetails[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      from_player:players!payments_from_player_id_fkey(*),
      to_player:players!payments_to_player_id_fkey(*),
      game:games(*)
    `)
    .or(`from_player_id.eq.${playerId},to_player_id.eq.${playerId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching player payments:', error);
    return [];
  }

  return (data || []) as PaymentWithDetails[];
}

/**
 * Mark a payment as paid
 */
export async function markPaymentAsPaid(
  supabase: SupabaseClient,
  paymentId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('payments')
    .update({
      is_paid: true,
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (error) {
    console.error('Error marking payment as paid:', error);
    return false;
  }

  return true;
}

/**
 * Mark a payment as unpaid
 */
export async function markPaymentAsUnpaid(
  supabase: SupabaseClient,
  paymentId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('payments')
    .update({
      is_paid: false,
      paid_at: null,
    })
    .eq('id', paymentId);

  if (error) {
    console.error('Error marking payment as unpaid:', error);
    return false;
  }

  return true;
}

/**
 * Mark all payments between two players in a session as paid
 */
export async function markAllPaymentsBetweenPlayersPaid(
  supabase: SupabaseClient,
  sessionId: string,
  fromPlayerId: string,
  toPlayerId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('payments')
    .update({
      is_paid: true,
      paid_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .eq('from_player_id', fromPlayerId)
    .eq('to_player_id', toPlayerId)
    .eq('is_paid', false);

  if (error) {
    console.error('Error marking payments as paid:', error);
    return false;
  }

  return true;
}

/**
 * Get unpaid payments summary between players in a session
 * Returns a map of "fromPlayerId-toPlayerId" -> total amount
 */
export function calculateUnpaidPaymentsSummary(
  payments: Payment[]
): Map<string, { fromPlayerId: string; toPlayerId: string; amount: number; count: number }> {
  const summary = new Map<string, { fromPlayerId: string; toPlayerId: string; amount: number; count: number }>();

  for (const payment of payments) {
    if (payment.is_paid) continue;

    const key = `${payment.from_player_id}-${payment.to_player_id}`;
    const existing = summary.get(key);

    if (existing) {
      existing.amount += payment.amount;
      existing.count += 1;
    } else {
      summary.set(key, {
        fromPlayerId: payment.from_player_id,
        toPlayerId: payment.to_player_id,
        amount: payment.amount,
        count: 1,
      });
    }
  }

  return summary;
}

/**
 * Calculate net balances between all players (who owes whom after settling)
 * Returns simplified payment directions to minimize transactions
 */
export function calculateSimplifiedBalances(
  payments: Payment[]
): { fromPlayerId: string; toPlayerId: string; amount: number }[] {
  // First, calculate net balance for each player
  const balances = new Map<string, number>();

  for (const payment of payments) {
    if (payment.is_paid) continue;

    // Payer owes money (negative balance)
    const payerBalance = balances.get(payment.from_player_id) || 0;
    balances.set(payment.from_player_id, payerBalance - payment.amount);

    // Receiver is owed money (positive balance)
    const receiverBalance = balances.get(payment.to_player_id) || 0;
    balances.set(payment.to_player_id, receiverBalance + payment.amount);
  }

  // Separate into debtors (negative) and creditors (positive)
  const debtors: { playerId: string; amount: number }[] = [];
  const creditors: { playerId: string; amount: number }[] = [];

  for (const [playerId, balance] of balances) {
    if (balance < 0) {
      debtors.push({ playerId, amount: Math.abs(balance) });
    } else if (balance > 0) {
      creditors.push({ playerId, amount: balance });
    }
  }

  // Sort both arrays by amount descending for optimal matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  // Match debtors to creditors
  const simplifiedPayments: { fromPlayerId: string; toPlayerId: string; amount: number }[] = [];

  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      simplifiedPayments.push({
        fromPlayerId: debtor.playerId,
        toPlayerId: creditor.playerId,
        amount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) debtorIdx++;
    if (creditor.amount === 0) creditorIdx++;
  }

  return simplifiedPayments;
}
