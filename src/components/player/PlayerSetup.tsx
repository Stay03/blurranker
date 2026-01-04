'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { FormInput } from '@/components/ui/FormInput';

export function PlayerSetup() {
  const { player, isNewUser, updateName, completeSetup } = usePlayer();
  const [name, setName] = useState(player?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = () => {
    completeSetup();
  };

  const handleChangeName = () => {
    setIsEditing(true);
    setName(player?.name || '');
  };

  const handleSaveName = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Please enter a name');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 30) {
      setError('Name must be 30 characters or less');
      return;
    }

    setIsSaving(true);
    setError('');

    const success = await updateName(trimmedName);

    if (success) {
      setIsEditing(false);
      if (isNewUser) {
        completeSetup();
      }
    } else {
      setError('Failed to save name. Please try again.');
    }

    setIsSaving(false);
  };

  const handleSkip = () => {
    completeSetup();
  };

  // New user - show name input
  if (isNewUser && !isEditing) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <CardTitle>Welcome to BlurRanker!</CardTitle>
          <p className="text-muted-foreground mt-2 mb-4">
            We&apos;ve generated a name for you: <strong className="text-foreground">{player?.name}</strong>
          </p>

          <div className="space-y-3">
            <Button onClick={handleContinue} className="w-full">
              Continue as {player?.name}
            </Button>
            <Button
              onClick={handleChangeName}
              variant="secondary"
              className="w-full"
            >
              Choose a different name
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Editing name (for both new and returning users)
  if (isEditing) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <CardTitle>Choose your name</CardTitle>
          <p className="text-muted-foreground mt-2 mb-4">
            This is how other players will see you.
          </p>

          <div className="space-y-4">
            <FormInput
              label="Your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter your name"
              error={error}
              maxLength={30}
              autoFocus
            />

            <div className="flex gap-3">
              <Button
                onClick={handleSaveName}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  if (isNewUser) {
                    handleSkip();
                  }
                }}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Returning user - should not normally reach here
  // as we show the main content instead
  return null;
}
