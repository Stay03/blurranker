'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { createClient } from '@/lib/supabase/client';
import { createSession } from '@/lib/session';
import { Container } from '@/components/ui/Container';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/FormInput';
import { LoadingPage } from '@/components/ui/Loading';
import { BackButton } from '@/components/ui/BackButton';

export default function CreateSessionPage() {
  const router = useRouter();
  const { player, isLoading: playerLoading } = usePlayer();
  const supabase = useMemo(() => createClient(), []);

  const [name, setName] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (playerLoading) {
    return <LoadingPage text="Loading..." />;
  }

  if (!player) {
    router.push('/');
    return null;
  }

  const generateSessionName = () => {
    const adjectives = ['Epic', 'Wild', 'Lucky', 'Golden', 'Silver', 'Royal', 'Grand', 'Ultimate'];
    const nouns = ['Showdown', 'Battle', 'Championship', 'Tournament', 'Arena', 'Challenge', 'Clash'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Bet amount must be a positive number');
      return;
    }

    setIsSubmitting(true);

    const sessionName = name.trim() || generateSessionName();

    const session = await createSession(supabase, {
      name: sessionName,
      bet_amount: amount,
      creator_id: player.id,
    });

    if (session) {
      router.push(`/session/${session.id}`);
    } else {
      setError('Failed to create session. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Container size="sm" className="py-8">
      <div className="space-y-6">
        <BackButton />

        <Card>
          <CardContent className="pt-6">
            <CardTitle className="mb-6">Create New Session</CardTitle>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Session Name (optional)"
                placeholder="Leave empty for auto-generated name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />

              <FormInput
                label="Bet Amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g., 10.00"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isSubmitting}
              />

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Session'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          As the creator, you&apos;ll be able to manage games and rankings.
        </div>
      </div>
    </Container>
  );
}
