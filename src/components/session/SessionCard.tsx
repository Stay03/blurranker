'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { SessionWithCreator } from '@/lib/session';

interface SessionCardProps {
  session: SessionWithCreator;
}

export function SessionCard({ session }: SessionCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Link href={`/session/${session.id}`}>
      <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-foreground">{session.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Created by {session.creator.name}
              </p>
            </div>
            <div className="text-right">
              <div className="font-medium text-primary">
                {formatCurrency(session.bet_amount)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">per game</div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>
                {session.player_count} player{session.player_count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(session.created_at)}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
