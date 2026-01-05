'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, Loader2, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getPlayerStats, type PlayerProfileStats } from '@/lib/stats';
import { usePlayer } from '@/contexts/PlayerContext';
import { Container } from '@/components/ui/Container';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/ui/Loading';
import { BackButton } from '@/components/ui/BackButton';
import { OnlineIndicator } from '@/components/ui/OnlineIndicator';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlayerProfilePage({ params }: PageProps) {
  const { id: playerId } = use(params);
  const [stats, setStats] = useState<PlayerProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const { player: currentPlayer, updateName } = usePlayer();
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      const data = await getPlayerStats(supabase, playerId);
      setStats(data);
      setIsLoading(false);
    }
    fetchStats();
  }, [supabase, playerId]);

  if (isLoading) {
    return <LoadingPage text="Loading player stats..." />;
  }

  if (!stats) {
    return (
      <Container size="sm" className="py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Player Not Found
              </h2>
              <p className="text-muted-foreground mb-4">
                This player doesn&apos;t exist or hasn&apos;t played any games.
              </p>
              <Link href="/" className="text-primary hover:underline">
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const isCurrentPlayer = currentPlayer?.id === playerId;

  const handleStartEdit = () => {
    setEditName(stats?.playerName || '');
    setEditError('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError('');
  };

  const handleSaveName = async () => {
    const trimmedName = editName.trim();

    if (!trimmedName) {
      setEditError('Please enter a name');
      return;
    }

    if (trimmedName.length < 2) {
      setEditError('Name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 30) {
      setEditError('Name must be 30 characters or less');
      return;
    }

    setIsSaving(true);
    setEditError('');

    const result = await updateName(trimmedName);

    if (result.success) {
      setIsEditing(false);
      // Refresh stats to show updated name
      const updatedStats = await getPlayerStats(supabase, playerId);
      setStats(updatedStats);
    } else {
      setEditError(result.error || 'Failed to save name');
    }

    setIsSaving(false);
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;
    return formatted;
  };

  const getPositionSuffix = (position: number) => {
    if (position === 1) return 'st';
    if (position === 2) return 'nd';
    if (position === 3) return 'rd';
    return 'th';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Container size="md" className="py-8">
      <div className="space-y-6">
        <BackButton />

        {/* Player Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                    stats.netProfit > 0
                      ? 'bg-green-500/10 text-green-600'
                      : stats.netProfit < 0
                      ? 'bg-red-500/10 text-red-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stats.playerName.charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5">
                  <OnlineIndicator lastSeen={stats.lastSeen} size="lg" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => {
                          setEditName(e.target.value);
                          setEditError('');
                        }}
                        className="flex-1 min-w-0 text-lg font-bold bg-background border border-input rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                        maxLength={30}
                        autoFocus
                        disabled={isSaving}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSaveName}
                        disabled={isSaving}
                        className="h-8 w-8 shrink-0"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 w-8 shrink-0"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                    {editError && (
                      <p className="text-sm text-red-600">{editError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">
                      {stats.playerName}
                    </h1>
                    {isCurrentPlayer && (
                      <>
                        <Badge variant="secondary">You</Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleStartEdit}
                          className="h-8 w-8"
                          title="Edit name"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
                <p className="text-muted-foreground">
                  {stats.sessionsPlayed} session{stats.sessionsPlayed !== 1 ? 's' : ''} played
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.gamesPlayed}</p>
              <p className="text-sm text-muted-foreground">Games Played</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.wins}</p>
              <p className="text-sm text-muted-foreground">Wins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-foreground">
                {stats.winRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardContent className="pt-6 text-center">
              <p
                className={`text-2xl font-bold ${
                  stats.netProfit > 0
                    ? 'text-green-600'
                    : stats.netProfit < 0
                    ? 'text-red-600'
                    : 'text-foreground'
                }`}
              >
                {formatCurrency(stats.netProfit)}
              </p>
              <p className="text-sm text-muted-foreground">Net Profit</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <Card>
          <CardContent className="pt-6">
            <CardTitle>Detailed Statistics</CardTitle>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-lg col-span-3 sm:col-span-1">
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(stats.totalEarnings)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg col-span-3 sm:col-span-1">
                <p className="text-sm text-muted-foreground">Total Losses</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(-stats.totalLosses)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg col-span-3 sm:col-span-1">
                <p className="text-sm text-muted-foreground">Average Position</p>
                <p className="text-lg font-semibold text-foreground">
                  {stats.averagePosition > 0 ? stats.averagePosition.toFixed(2) : '-'}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">2nd Places</p>
                <p className="text-lg font-semibold text-foreground">{stats.secondPlaces}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">3rd Places</p>
                <p className="text-lg font-semibold text-foreground">{stats.thirdPlaces}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Last Places</p>
                <p className="text-lg font-semibold text-foreground">{stats.lastPlaces}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Games */}
        {stats.recentGames.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <CardTitle>Recent Games</CardTitle>
              <div className="mt-4 space-y-2">
                {stats.recentGames.map((game, index) => (
                  <div
                    key={game.gameId}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          game.position === 1
                            ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-500'
                            : game.position === game.totalPlayers
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-muted-foreground/10 text-muted-foreground'
                        }`}
                      >
                        {game.position}
                        <sup className="text-xs">{getPositionSuffix(game.position)}</sup>
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{game.sessionName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(game.completedAt)} &middot; {game.totalPlayers} players
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold ${
                        game.netResult > 0
                          ? 'text-green-600'
                          : game.netResult < 0
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatCurrency(game.netResult)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Container>
  );
}
