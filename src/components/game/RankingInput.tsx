'use client';

import { useState, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Player } from '@/lib/supabase/types';
import type { GameWithDetails } from '@/lib/game';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, calculatePayments } from '@/lib/utils/payments';

interface RankingInputProps {
  game: GameWithDetails;
  sessionPlayers: { player_id: string; player: Player }[];
  betAmount: number;
  onSubmit: (rankings: { player_id: string; position: number }[]) => Promise<boolean>;
  onCancel: () => void;
}

type PlayerRanking = {
  player_id: string;
  player: Player;
  position: number | null;
};

export function RankingInput({
  game,
  sessionPlayers,
  betAmount,
  onSubmit,
  onCancel,
}: RankingInputProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize rankings from existing data or empty
  const [rankings, setRankings] = useState<PlayerRanking[]>(() => {
    return sessionPlayers.map((sp) => {
      const existingRanking = game.rankings.find((r) => r.player_id === sp.player_id);
      return {
        player_id: sp.player_id,
        player: sp.player,
        position: existingRanking?.position ?? null,
      };
    });
  });

  const assignPosition = useCallback((playerId: string, position: number) => {
    setRankings((prev) => {
      // Remove this position from any other player
      const updated = prev.map((r) => ({
        ...r,
        position: r.position === position ? null : r.position,
      }));
      // Assign the position to the selected player
      return updated.map((r) =>
        r.player_id === playerId ? { ...r, position } : r
      );
    });
  }, []);

  const clearPosition = useCallback((playerId: string) => {
    setRankings((prev) =>
      prev.map((r) => (r.player_id === playerId ? { ...r, position: null } : r))
    );
  }, []);

  const isComplete = useMemo(
    () => rankings.every((r) => r.position !== null),
    [rankings]
  );

  const sortedByPosition = useMemo(
    () =>
      [...rankings]
        .filter((r) => r.position !== null)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [rankings]
  );

  const unassignedPlayers = useMemo(
    () => rankings.filter((r) => r.position === null),
    [rankings]
  );

  const usedPositions = useMemo(
    () => new Set(rankings.filter((r) => r.position !== null).map((r) => r.position)),
    [rankings]
  );

  const previewPayments = useMemo(() => {
    if (!isComplete) return [];
    return calculatePayments(
      rankings.map((r) => ({ player_id: r.player_id, position: r.position! })),
      betAmount
    );
  }, [rankings, betAmount, isComplete]);

  const handleSubmit = async () => {
    if (!isComplete) return;

    setIsSubmitting(true);
    const success = await onSubmit(
      rankings.map((r) => ({ player_id: r.player_id, position: r.position! }))
    );
    setIsSubmitting(false);

    if (!success) {
      toast.error('Failed to submit rankings. Please try again.');
    } else {
      toast.success('Rankings submitted successfully!');
    }
  };

  const positionLabels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Game #{game.game_number} - Enter Rankings</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Assign positions to each player. 1st place is the winner.
        </p>

        {/* Position Assignment */}
        <div className="space-y-4 mb-6">
          {rankings.map((playerRanking) => (
            <div
              key={playerRanking.player_id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                  {playerRanking.player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{playerRanking.player.name}</span>
              </div>

              <div className="flex items-center gap-2">
                {playerRanking.position !== null ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                      {positionLabels[playerRanking.position - 1] || `${playerRanking.position}th`}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => clearPosition(playerRanking.player_id)}
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {sessionPlayers.map((_, index) => {
                      const position = index + 1;
                      const isUsed = usedPositions.has(position);
                      return (
                        <button
                          key={position}
                          onClick={() => assignPosition(playerRanking.player_id, position)}
                          disabled={isUsed}
                          className={`
                            w-8 h-8 rounded-full text-sm font-medium transition-colors
                            ${
                              isUsed
                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                : 'bg-card border border-border text-foreground hover:border-primary hover:text-primary'
                            }
                          `}
                        >
                          {position}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        {isComplete && (
          <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-medium text-primary mb-3">Payment Preview</h4>
            <div className="space-y-3">
              {sortedByPosition.map((r, index) => {
                // Find all payments this player receives
                const receives = previewPayments.filter((p) => p.to_player_id === r.player_id);
                // Find all payments this player pays
                const pays = previewPayments.filter((p) => p.from_player_id === r.player_id);

                const totalReceives = receives.reduce((sum, p) => sum + p.amount, 0);
                const totalPays = pays.reduce((sum, p) => sum + p.amount, 0);
                const netBalance = totalReceives - totalPays;

                // Get player names for detailed breakdown
                const receivesFrom = receives.map((p) => {
                  const payer = sortedByPosition.find((sp) => sp.player_id === p.from_player_id);
                  return payer?.player.name || 'Unknown';
                });
                const paysTo = pays.map((p) => {
                  const receiver = sortedByPosition.find((sp) => sp.player_id === p.to_player_id);
                  return receiver?.player.name || 'Unknown';
                });

                return (
                  <div key={r.player_id} className="text-sm border-b border-primary/20 pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between font-medium">
                      <span>{positionLabels[index]}: {r.player.name}</span>
                      <span className={netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-red-600' : 'text-muted-foreground'}>
                        {netBalance > 0 && '+'}{formatCurrency(netBalance)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 pl-2">
                      {receivesFrom.length > 0 && (
                        <div className="text-green-600">
                          Receives {formatCurrency(betAmount)} each from: {receivesFrom.join(', ')}
                        </div>
                      )}
                      {paysTo.length > 0 && (
                        <div className="text-red-600">
                          Pays {formatCurrency(betAmount)} each to: {paysTo.join(', ')}
                        </div>
                      )}
                      {receivesFrom.length === 0 && paysTo.length === 0 && (
                        <div>No payments</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unassigned Warning */}
        {unassignedPlayers.length > 0 && (
          <p className="text-sm text-amber-600 mb-4">
            {unassignedPlayers.length} player(s) still need positions assigned
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isComplete || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Rankings'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
