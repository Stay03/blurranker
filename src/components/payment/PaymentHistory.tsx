'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { PaymentWithDetails } from '@/lib/payment';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils/payments';

type FilterType = 'all' | 'unpaid' | 'paid';

interface PaymentHistoryProps {
  payments: PaymentWithDetails[];
  currentPlayerId?: string;
  onMarkPaid?: (paymentId: string) => void;
  onMarkUnpaid?: (paymentId: string) => void;
  isLoading?: boolean;
}

/**
 * Shows detailed payment history with filtering options
 */
export function PaymentHistory({
  payments,
  currentPlayerId,
  onMarkPaid,
  onMarkUnpaid,
  isLoading = false,
}: PaymentHistoryProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredPayments = payments.filter((p) => {
    if (filter === 'unpaid') return !p.is_paid;
    if (filter === 'paid') return p.is_paid;
    return true;
  });

  const unpaidCount = payments.filter((p) => !p.is_paid).length;
  const paidCount = payments.filter((p) => p.is_paid).length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <CardTitle>Payment History</CardTitle>

          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
              <TabsTrigger value="unpaid">Unpaid ({unpaidCount})</TabsTrigger>
              <TabsTrigger value="paid">Paid ({paidCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {filter === 'all'
              ? 'No payments recorded yet.'
              : filter === 'unpaid'
              ? 'No unpaid payments.'
              : 'No paid payments.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPayments.map((payment) => {
              const isFromCurrent = payment.from_player_id === currentPlayerId;
              const isToCurrent = payment.to_player_id === currentPlayerId;

              return (
                <div
                  key={payment.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border gap-2 transition-colors ${
                    payment.is_paid
                      ? 'bg-muted border-border'
                      : isFromCurrent
                      ? 'bg-red-500/10 border-red-500/20'
                      : isToCurrent
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-medium ${
                          isFromCurrent && !payment.is_paid ? 'text-red-600' : ''
                        }`}
                      >
                        {payment.from_player.name}
                        {isFromCurrent && ' (You)'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span
                        className={`font-medium ${
                          isToCurrent && !payment.is_paid ? 'text-green-600' : ''
                        }`}
                      >
                        {payment.to_player.name}
                        {isToCurrent && ' (You)'}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {payment.game && (
                        <span>Game #{payment.game.game_number}</span>
                      )}
                      <span>•</span>
                      <span>{formatDate(payment.created_at)}</span>
                      {payment.is_paid && payment.paid_at && (
                        <>
                          <span>•</span>
                          <span className="text-green-600">
                            Paid {formatDate(payment.paid_at)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {payment.is_paid ? (
                      <>
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                          Paid
                        </Badge>
                        {onMarkUnpaid && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onMarkUnpaid(payment.id)}
                            disabled={isLoading}
                          >
                            Undo
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                          Unpaid
                        </Badge>
                        {onMarkPaid && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onMarkPaid(payment.id)}
                            disabled={isLoading}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
