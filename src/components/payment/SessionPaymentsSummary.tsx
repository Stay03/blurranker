'use client';

import { useMemo } from 'react';
import type { Payment } from '@/lib/supabase/types';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/payments';

interface SessionPaymentsSummaryProps {
  payments: Payment[];
  currentPlayerId?: string;
}

/**
 * Shows the current player's payment balance summary
 */
export function SessionPaymentsSummary({
  payments,
  currentPlayerId,
}: SessionPaymentsSummaryProps) {
  const balance = useMemo(() => {
    if (!currentPlayerId) return { owed: 0, owes: 0, net: 0, paidCount: 0, unpaidCount: 0 };

    let owed = 0;
    let owes = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    for (const payment of payments) {
      if (payment.is_paid) {
        paidCount++;
        continue;
      }

      unpaidCount++;

      if (payment.to_player_id === currentPlayerId) {
        owed += payment.amount;
      }
      if (payment.from_player_id === currentPlayerId) {
        owes += payment.amount;
      }
    }

    return { owed, owes, net: owed - owes, paidCount, unpaidCount };
  }, [payments, currentPlayerId]);

  return (
    <Card
      className={
        balance.net > 0
          ? 'border-green-500/20 bg-green-500/5'
          : balance.net < 0
          ? 'border-red-500/20 bg-red-500/5'
          : ''
      }
    >
      <CardContent className="pt-6">
        <CardTitle className="mb-4">Your Balance</CardTitle>

        <div className="flex items-center justify-center mb-4">
          <div className="text-center">
            <p
              className={`text-4xl font-bold ${
                balance.net > 0
                  ? 'text-green-600'
                  : balance.net < 0
                  ? 'text-red-600'
                  : 'text-muted-foreground'
              }`}
            >
              {balance.net > 0 && '+'}
              {formatCurrency(balance.net)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {balance.net > 0
                ? 'Net owed to you'
                : balance.net < 0
                ? 'Net you owe'
                : 'All settled up!'}
            </p>
          </div>
        </div>

        {(balance.owes > 0 || balance.owed > 0) && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(balance.owed)}
              </p>
              <p className="text-sm text-muted-foreground">You receive</p>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(balance.owes)}
              </p>
              <p className="text-sm text-muted-foreground">You pay</p>
            </div>
          </div>
        )}

        {balance.paidCount > 0 && (
          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              {balance.paidCount} payment{balance.paidCount !== 1 ? 's' : ''} already settled
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
