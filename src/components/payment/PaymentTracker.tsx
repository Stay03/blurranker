'use client';

import { useMemo } from 'react';
import type { Payment, Player } from '@/lib/supabase/types';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/payments';

interface PaymentTrackerProps {
  payments: Payment[];
  players: Map<string, Player>;
  currentPlayerId?: string;
  onMarkPaid: (fromPlayerId: string, toPlayerId: string) => void;
  isLoading?: boolean;
}

/**
 * Shows what the current player owes and what others owe them
 */
export function PaymentTracker({
  payments,
  players,
  currentPlayerId,
  onMarkPaid,
  isLoading = false,
}: PaymentTrackerProps) {
  const getPlayerName = (playerId: string) => {
    return players.get(playerId)?.name || 'Unknown';
  };

  // Calculate what you owe to each player (aggregated)
  const youOwe = useMemo(() => {
    if (!currentPlayerId) return [];

    const owedMap = new Map<string, { playerId: string; amount: number; count: number }>();

    for (const payment of payments) {
      if (payment.is_paid) continue;
      if (payment.from_player_id !== currentPlayerId) continue;

      const existing = owedMap.get(payment.to_player_id);
      if (existing) {
        existing.amount += payment.amount;
        existing.count += 1;
      } else {
        owedMap.set(payment.to_player_id, {
          playerId: payment.to_player_id,
          amount: payment.amount,
          count: 1,
        });
      }
    }

    return Array.from(owedMap.values()).sort((a, b) => b.amount - a.amount);
  }, [payments, currentPlayerId]);

  // Calculate what others owe you (aggregated)
  const othersOweYou = useMemo(() => {
    if (!currentPlayerId) return [];

    const owedMap = new Map<string, { playerId: string; amount: number; count: number }>();

    for (const payment of payments) {
      if (payment.is_paid) continue;
      if (payment.to_player_id !== currentPlayerId) continue;

      const existing = owedMap.get(payment.from_player_id);
      if (existing) {
        existing.amount += payment.amount;
        existing.count += 1;
      } else {
        owedMap.set(payment.from_player_id, {
          playerId: payment.from_player_id,
          amount: payment.amount,
          count: 1,
        });
      }
    }

    return Array.from(owedMap.values()).sort((a, b) => b.amount - a.amount);
  }, [payments, currentPlayerId]);

  const totalYouOwe = youOwe.reduce((sum, p) => sum + p.amount, 0);
  const totalOwedToYou = othersOweYou.reduce((sum, p) => sum + p.amount, 0);

  if (youOwe.length === 0 && othersOweYou.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-4xl mb-3">🎉</div>
          <CardTitle className="text-lg mb-2">All Settled Up!</CardTitle>
          <p className="text-muted-foreground">You have no outstanding payments.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* What you owe */}
      {youOwe.length > 0 && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>You Owe</CardTitle>
              <span className="text-lg font-bold text-red-600">
                {formatCurrency(totalYouOwe)}
              </span>
            </div>

            <div className="space-y-3">
              {youOwe.map(({ playerId, amount, count }) => (
                <div
                  key={playerId}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-red-500/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center font-medium text-sm">
                      {getPlayerName(playerId).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {getPlayerName(playerId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {count} game{count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-red-600">
                      {formatCurrency(amount)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => onMarkPaid(currentPlayerId!, playerId)}
                      disabled={isLoading}
                    >
                      Pay
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What others owe you */}
      {othersOweYou.length > 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Owed to You</CardTitle>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(totalOwedToYou)}
              </span>
            </div>

            <div className="space-y-3">
              {othersOweYou.map(({ playerId, amount, count }) => (
                <div
                  key={playerId}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-green-500/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center font-medium text-sm">
                      {getPlayerName(playerId).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {getPlayerName(playerId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {count} game{count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-green-600">
                      {formatCurrency(amount)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onMarkPaid(playerId, currentPlayerId!)}
                      disabled={isLoading}
                    >
                      Received
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
