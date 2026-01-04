'use client';

import { useState, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { GameWithDetails } from '@/lib/game';
import type { Player, Payment, Ranking } from '@/lib/supabase/types';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, calculatePlayerBalance } from '@/lib/utils/payments';

// Component to show detailed payment breakdown for the current player
function PaymentBreakdown({
  currentPlayerId,
  payments,
  rankings,
  betAmount,
}: {
  currentPlayerId: string;
  payments: Payment[];
  rankings: (Ranking & { player: Player })[];
  betAmount: number;
}) {
  // Payments the current player receives (others owe them)
  const receivesFrom = payments.filter((p) => p.to_player_id === currentPlayerId);
  // Payments the current player owes (they pay others)
  const owesTo = payments.filter((p) => p.from_player_id === currentPlayerId);

  const totalReceives = receivesFrom.reduce((sum, p) => sum + p.amount, 0);
  const totalOwes = owesTo.reduce((sum, p) => sum + p.amount, 0);
  const netBalance = totalReceives - totalOwes;

  // Get player names
  const getPlayerName = (playerId: string) => {
    const ranking = rankings.find((r) => r.player_id === playerId);
    return ranking?.player.name || 'Unknown';
  };

  if (netBalance === 0 && receivesFrom.length === 0 && owesTo.length === 0) {
    return null;
  }

  return (
    <div
      className={`p-3 rounded-lg mb-4 ${
        netBalance > 0
          ? 'bg-green-500/10 border border-green-500/20'
          : netBalance < 0
          ? 'bg-red-500/10 border border-red-500/20'
          : 'bg-muted border border-border'
      }`}
    >
      <p className="text-sm font-medium mb-2">
        {netBalance > 0 ? (
          <span className="text-green-700 dark:text-green-400">
            Net: You are owed <strong>{formatCurrency(netBalance)}</strong>
          </span>
        ) : netBalance < 0 ? (
          <span className="text-red-700 dark:text-red-400">
            Net: You owe <strong>{formatCurrency(Math.abs(netBalance))}</strong>
          </span>
        ) : (
          <span className="text-muted-foreground">Net: Even</span>
        )}
      </p>

      {/* Who owes you */}
      {receivesFrom.length > 0 && (
        <div className="text-xs text-green-700 dark:text-green-400 mb-1">
          <span className="font-medium">You receive {formatCurrency(betAmount)} from:</span>{' '}
          {receivesFrom.map((p) => getPlayerName(p.from_player_id)).join(', ')}
        </div>
      )}

      {/* Who you owe */}
      {owesTo.length > 0 && (
        <div className="text-xs text-red-700 dark:text-red-400">
          <span className="font-medium">You pay {formatCurrency(betAmount)} to:</span>{' '}
          {owesTo.map((p) => getPlayerName(p.to_player_id)).join(', ')}
        </div>
      )}
    </div>
  );
}

interface GameCardProps {
  game: GameWithDetails;
  currentPlayerId?: string;
  sessionPlayers: { player_id: string; player: Player }[];
  isCreator: boolean;
  onConfirm?: (gameId: string) => void;
  onUnconfirm?: (gameId: string) => void;
  onDelete?: (gameId: string) => void;
  onSubmitRankings?: (gameId: string) => void;
  betAmount: number;
}

const positionLabels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
const positionColors = [
  'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  'bg-muted text-muted-foreground border-border',
  'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
];

export function GameCard({
  game,
  currentPlayerId,
  sessionPlayers,
  isCreator,
  onConfirm,
  onUnconfirm,
  onDelete,
  onSubmitRankings,
  betAmount,
}: GameCardProps) {
  const isCompleted = game.status === 'completed';
  const isPending = game.status === 'pending';

  const hasConfirmed = useMemo(
    () => game.confirmations.some((c) => c.player_id === currentPlayerId),
    [game.confirmations, currentPlayerId]
  );

  // Collapse by default if completed AND current user has confirmed
  const shouldCollapseByDefault = isCompleted && hasConfirmed;
  const [isCollapsed, setIsCollapsed] = useState(shouldCollapseByDefault);

  const confirmationCount = game.confirmations.length;
  const totalPlayers = sessionPlayers.length;

  const sortedRankings = useMemo(
    () => [...game.rankings].sort((a, b) => a.position - b.position),
    [game.rankings]
  );

  const playerBalance = useMemo(() => {
    if (!currentPlayerId) return 0;
    return calculatePlayerBalance(currentPlayerId, game.payments);
  }, [currentPlayerId, game.payments]);

  // Get current player's position for collapsed view
  const currentPlayerRanking = sortedRankings.find((r) => r.player_id === currentPlayerId);
  const currentPlayerPosition = currentPlayerRanking
    ? positionLabels[currentPlayerRanking.position - 1] || `${currentPlayerRanking.position}th`
    : null;

  return (
    <Card className="relative">
      <CardContent className="pt-6">
        {/* Game Header - Clickable to expand/collapse for completed games */}
        <div
          className={`flex items-center justify-between ${isCollapsed ? '' : 'mb-4'} ${
            isCompleted ? 'cursor-pointer' : ''
          }`}
          onClick={() => isCompleted && setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-3">
            {/* Expand/Collapse indicator for completed games */}
            {isCompleted && (
              <ChevronRight
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
              />
            )}
            <CardTitle className="text-lg">Game #{game.game_number}</CardTitle>
            {isCompleted ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                Pending
              </Badge>
            )}
            {/* Show summary when collapsed */}
            {isCollapsed && currentPlayerPosition && (
              <span className="text-sm text-muted-foreground">
                You: {currentPlayerPosition} ({playerBalance >= 0 ? '+' : ''}{formatCurrency(playerBalance)})
              </span>
            )}
          </div>

          {/* Confirmation Status */}
          {isCompleted && (
            <div className="flex items-center gap-2">
              {hasConfirmed && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Confirmed
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {confirmationCount}/{totalPlayers}
              </span>
            </div>
          )}
        </div>

        {/* Pending State - Show submit button for creator */}
        {isPending && (
          <div className="text-center py-6">
            {isCreator ? (
              <>
                <p className="text-muted-foreground mb-4">Submit rankings for this game</p>
                <div className="flex justify-center gap-2">
                  <Button onClick={() => onSubmitRankings?.(game.id)}>
                    Enter Rankings
                  </Button>
                  <Button variant="destructive" onClick={() => onDelete?.(game.id)}>
                    Delete
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Waiting for session creator to submit rankings...</p>
            )}
          </div>
        )}

        {/* Completed State - Show rankings and payments (hidden when collapsed) */}
        {isCompleted && !isCollapsed && (
          <>
            {/* Rankings */}
            <div className="space-y-2 mb-4">
              {sortedRankings.map((ranking, index) => {
                const balance = calculatePlayerBalance(ranking.player_id, game.payments);
                const isCurrentPlayer = ranking.player_id === currentPlayerId;
                const positionColor = positionColors[index] || 'bg-muted text-muted-foreground border-border';

                return (
                  <div
                    key={ranking.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isCurrentPlayer ? 'ring-2 ring-primary' : ''
                    } ${positionColor}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg w-8">
                        {positionLabels[index] || `${index + 1}th`}
                      </span>
                      <span className={`font-medium ${isCurrentPlayer ? 'underline' : ''}`}>
                        {ranking.player.name}
                        {isCurrentPlayer && ' (You)'}
                      </span>
                    </div>
                    <span
                      className={`font-semibold ${
                        balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : ''
                      }`}
                    >
                      {balance > 0 && '+'}
                      {formatCurrency(balance)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Payment Summary for current player */}
            {currentPlayerId && (
              <PaymentBreakdown
                currentPlayerId={currentPlayerId}
                payments={game.payments}
                rankings={sortedRankings}
                betAmount={betAmount}
              />
            )}

            {/* Confirmation Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  {game.confirmations.map((c) => (
                    <Tooltip key={c.player_id}>
                      <TooltipTrigger asChild>
                        <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 text-xs cursor-default">
                          {c.player.name.charAt(0).toUpperCase()}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{c.player.name} confirmed</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>

              {currentPlayerId && (
                <div className="flex gap-2">
                  {hasConfirmed ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnconfirm?.(game.id);
                      }}
                    >
                      Unconfirm
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfirm?.(game.id);
                      }}
                    >
                      Confirm Results
                    </Button>
                  )}
                  {isCreator && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSubmitRankings?.(game.id);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
