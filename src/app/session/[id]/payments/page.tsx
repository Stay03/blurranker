'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { usePlayer } from '@/contexts/PlayerContext';
import { useSession } from '@/lib/hooks/useSession';
import { useSessionPayments } from '@/lib/hooks/usePayments';
import { Container } from '@/components/ui/Container';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingPage } from '@/components/ui/Loading';
import { BackButton } from '@/components/ui/BackButton';
import {
  PaymentTracker,
  PaymentHistory,
  SessionPaymentsSummary,
} from '@/components/payment';
import type { Player } from '@/lib/supabase/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SessionPaymentsPage({ params }: PageProps) {
  const { id: sessionId } = use(params);
  const { player, isLoading: playerLoading } = usePlayer();
  const { session, isLoading: sessionLoading, error: sessionError } =
    useSession(sessionId);
  const {
    payments,
    isLoading: paymentsLoading,
    markPaid,
    markUnpaid,
    markAllPaidBetweenPlayers,
  } = useSessionPayments(sessionId);

  const isLoading = playerLoading || sessionLoading || paymentsLoading;

  // Build players map from session players
  const playersMap = useMemo(() => {
    const map = new Map<string, Player>();
    if (session?.players) {
      for (const sp of session.players) {
        if (sp.player) {
          map.set(sp.player_id, sp.player as Player);
        }
      }
    }
    return map;
  }, [session?.players]);

  // Filter payments to only show those involving the current player
  const myPayments = useMemo(() => {
    if (!player?.id) return [];
    return payments.filter(
      (p) => p.from_player_id === player.id || p.to_player_id === player.id
    );
  }, [payments, player?.id]);

  const isInSession = useMemo(
    () =>
      session?.players?.some((sp) => sp.player_id === player?.id) ?? false,
    [session, player]
  );

  if (isLoading) {
    return <LoadingPage text="Loading payments..." />;
  }

  if (sessionError || !session) {
    return (
      <Container size="sm" className="py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Session Not Found
              </h2>
              <p className="text-muted-foreground mb-4">
                This session may have been archived or doesn&apos;t exist.
              </p>
              <Link href="/">
                <Button>Back to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!isInSession) {
    return (
      <Container size="sm" className="py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Access Denied
              </h2>
              <p className="text-muted-foreground mb-4">
                You need to join this session to view payments.
              </p>
              <Link href={`/session/${sessionId}`}>
                <Button>Go to Session</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleMarkAllPaid = async (fromPlayerId: string, toPlayerId: string) => {
    await markAllPaidBetweenPlayers(fromPlayerId, toPlayerId);
  };

  return (
    <Container size="md" className="py-8">
      <div className="space-y-6">
        <BackButton />

        {/* Page Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Payments</CardTitle>
                <p className="text-muted-foreground mt-1">{session.name}</p>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {formatCurrency(session.bet_amount)} per game
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Section - Your balance only */}
        <SessionPaymentsSummary
          payments={myPayments}
          currentPlayerId={player?.id}
        />

        {/* Payment Tracker - Only payments you're involved in */}
        <PaymentTracker
          payments={myPayments}
          players={playersMap}
          currentPlayerId={player?.id}
          onMarkPaid={handleMarkAllPaid}
        />

        {/* Payment History - Your payment history only */}
        <PaymentHistory
          payments={myPayments}
          currentPlayerId={player?.id}
          onMarkPaid={markPaid}
          onMarkUnpaid={markUnpaid}
        />
      </div>
    </Container>
  );
}
