'use client';

import Link from 'next/link';
import { usePlayer } from '@/contexts/PlayerContext';
import { Container } from './Container';
import { ThemeToggle } from './ThemeToggle';
import { Skeleton } from './skeleton';

export function Header() {
  const { player, isLoading } = usePlayer();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <Container>
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
              BlurRanker
            </Link>
            <nav className="hidden sm:flex items-center gap-4">
              <Link
                href="/leaderboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/archives"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Archives
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isLoading ? (
              <Skeleton className="h-8 w-24 rounded-full" />
            ) : player ? (
              <Link
                href={`/player/${player.id}`}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-foreground hidden sm:inline">
                  {player.name}
                </span>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="sm:hidden flex items-center gap-4 pb-3 -mt-1">
          <Link
            href="/leaderboard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Leaderboard
          </Link>
          <Link
            href="/archives"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Archives
          </Link>
        </nav>
      </Container>
    </header>
  );
}
