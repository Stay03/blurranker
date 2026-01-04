/**
 * Payment calculation logic for BlurRanker
 *
 * Payment System:
 * - Each player pays the bet amount to EVERY player who finished above them
 *
 * Example with 5 players and $200 bet:
 * - 1st place: receives $200 from 2nd, 3rd, 4th, 5th = +$800 total
 * - 2nd place: pays $200 to 1st, receives from 3rd, 4th, 5th = +$400 net
 * - 3rd place: pays $200 to 1st & 2nd, receives from 4th, 5th = $0 net
 * - 4th place: pays $200 to 1st, 2nd, 3rd, receives from 5th = -$400 net
 * - 5th place: pays $200 to 1st, 2nd, 3rd, 4th = -$800 total
 */

export type PaymentCalculation = {
  from_player_id: string;
  to_player_id: string;
  amount: number;
};

/**
 * Calculate payments based on rankings and bet amount
 * Each player pays the bet amount to every player who finished above them
 * @param rankings Array of { player_id, position } sorted by position
 * @param betAmount The bet amount per game
 * @returns Array of payment records
 */
export function calculatePayments(
  rankings: { player_id: string; position: number }[],
  betAmount: number
): PaymentCalculation[] {
  if (rankings.length < 2 || betAmount <= 0) {
    return [];
  }

  // Sort by position ascending (1 = first place)
  const sorted = [...rankings].sort((a, b) => a.position - b.position);

  const payments: PaymentCalculation[] = [];

  // Each player pays every player above them
  for (let i = 1; i < sorted.length; i++) {
    const payer = sorted[i]; // Lower ranked player (pays)

    // Pay everyone above
    for (let j = 0; j < i; j++) {
      const receiver = sorted[j]; // Higher ranked player (receives)

      payments.push({
        from_player_id: payer.player_id,
        to_player_id: receiver.player_id,
        amount: betAmount,
      });
    }
  }

  return payments;
}

/**
 * Get player balance from payments
 * Positive = net winner (owed money)
 * Negative = net loser (owes money)
 */
export function calculatePlayerBalance(
  playerId: string,
  payments: { from_player_id: string; to_player_id: string; amount: number; is_paid?: boolean }[],
  onlyUnpaid: boolean = false
): number {
  let balance = 0;

  for (const payment of payments) {
    if (onlyUnpaid && payment.is_paid) {
      continue;
    }

    if (payment.to_player_id === playerId) {
      balance += payment.amount; // Player is owed this amount
    }
    if (payment.from_player_id === playerId) {
      balance -= payment.amount; // Player owes this amount
    }
  }

  return balance;
}

/**
 * Get summary of what each player owes/is owed
 */
export function calculateSessionBalances(
  payments: { from_player_id: string; to_player_id: string; amount: number; is_paid: boolean }[]
): Map<string, number> {
  const balances = new Map<string, number>();

  for (const payment of payments) {
    if (payment.is_paid) continue;

    // Receiver is owed money
    const receiverBalance = balances.get(payment.to_player_id) || 0;
    balances.set(payment.to_player_id, receiverBalance + payment.amount);

    // Payer owes money
    const payerBalance = balances.get(payment.from_player_id) || 0;
    balances.set(payment.from_player_id, payerBalance - payment.amount);
  }

  return balances;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format balance with color indicator
 * Returns object with formatted value and color class
 */
export function formatBalance(amount: number): { value: string; colorClass: string } {
  const formatted = formatCurrency(Math.abs(amount));

  if (amount > 0) {
    return { value: `+${formatted}`, colorClass: 'text-green-600' };
  } else if (amount < 0) {
    return { value: `-${formatted}`, colorClass: 'text-red-600' };
  }
  return { value: formatted, colorClass: 'text-gray-600' };
}
