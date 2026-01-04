'use client';

import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { Player } from '@/lib/supabase/types';
import type { GameWithDetails } from '@/lib/game';
import { useGames } from '@/lib/hooks/useGames';
import { useAnimatedList } from '@/lib/hooks/useAnimatedList';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/Loading';
import { GameCard } from './GameCard';
import { RankingInput } from './RankingInput';

interface GameListProps {
  sessionId: string;
  sessionPlayers: { player_id: string; player: Player }[];
  currentPlayerId?: string;
  isCreator: boolean;
  betAmount: number;
}

export function GameList({
  sessionId,
  sessionPlayers,
  currentPlayerId,
  isCreator,
  betAmount,
}: GameListProps) {
  const { games, isLoading, create, submit, confirm, unconfirm, remove } = useGames(sessionId);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Track new games for animation
  const getGameId = useCallback((game: GameWithDetails) => game.id, []);
  const isNewGame = useAnimatedList(games, getGameId);

  const handleCreateGame = useCallback(async () => {
    if (!currentPlayerId) return;
    setIsCreating(true);
    const game = await create(currentPlayerId);
    setIsCreating(false);
    if (game) {
      setEditingGameId(game.id);
    }
  }, [currentPlayerId, create]);

  const handleSubmitRankings = useCallback(
    async (rankings: { player_id: string; position: number }[]) => {
      if (!editingGameId || !currentPlayerId) return false;
      const success = await submit(editingGameId, rankings, currentPlayerId);
      if (success) {
        setEditingGameId(null);
      }
      return success;
    },
    [editingGameId, currentPlayerId, submit]
  );

  const handleConfirm = useCallback(
    async (gameId: string) => {
      if (!currentPlayerId) return;
      await confirm(gameId, currentPlayerId);
    },
    [currentPlayerId, confirm]
  );

  const handleUnconfirm = useCallback(
    async (gameId: string) => {
      if (!currentPlayerId) return;
      await unconfirm(gameId, currentPlayerId);
    },
    [currentPlayerId, unconfirm]
  );

  const handleDelete = useCallback(
    async (gameId: string) => {
      if (!currentPlayerId) return;
      if (!window.confirm('Are you sure you want to delete this game?')) return;
      await remove(gameId, currentPlayerId);
    },
    [currentPlayerId, remove]
  );

  const handleEditRankings = useCallback((gameId: string) => {
    setEditingGameId(gameId);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingGameId(null);
  }, []);

  const editingGame = editingGameId
    ? games.find((g) => g.id === editingGameId)
    : null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loading />
        </CardContent>
      </Card>
    );
  }

  // Show ranking input modal if editing
  if (editingGame) {
    return (
      <RankingInput
        game={editingGame}
        sessionPlayers={sessionPlayers}
        betAmount={betAmount}
        onSubmit={handleSubmitRankings}
        onCancel={handleCancelEdit}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - only show if creator (for New Game button) or no games yet */}
      {(isCreator || games.length === 0) && (
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <CardTitle>
              {games.length === 0 ? 'Games' : `${games.length} Game${games.length === 1 ? '' : 's'} Played`}
            </CardTitle>
            {isCreator && (
              <Button onClick={handleCreateGame} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  '+ New Game'
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Games List */}
      {games.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <p>No games yet.</p>
            {isCreator && (
              <p className="mt-2 text-sm">Click "New Game" to start a game.</p>
            )}
            {!isCreator && (
              <p className="mt-2 text-sm">
                Waiting for the session creator to start a game.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        games.map((game) => (
          <div
            key={game.id}
            className={isNewGame(game) ? 'animate-fade-in-up' : ''}
          >
            <GameCard
              game={game}
              currentPlayerId={currentPlayerId}
              sessionPlayers={sessionPlayers}
              isCreator={isCreator}
              betAmount={betAmount}
              onConfirm={handleConfirm}
              onUnconfirm={handleUnconfirm}
              onDelete={handleDelete}
              onSubmitRankings={handleEditRankings}
            />
          </div>
        ))
      )}
    </div>
  );
}
