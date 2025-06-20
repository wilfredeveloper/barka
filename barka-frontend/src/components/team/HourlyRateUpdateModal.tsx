"use client"

import React, { useState } from 'react';
import { DollarSign, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { teamApi, type TeamMember } from '@/lib/api/team';

interface HourlyRateUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMember: TeamMember;
  onUpdate: (updatedMember: TeamMember) => void;
}

export function HourlyRateUpdateModal({
  isOpen,
  onClose,
  teamMember,
  onUpdate,
}: HourlyRateUpdateModalProps) {
  const [hourlyRate, setHourlyRate] = useState<string>(
    teamMember.hourlyRate?.toString() || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string>('');

  const validateHourlyRate = (value: string): string | null => {
    if (!value.trim()) {
      return 'Hourly rate is required';
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return 'Please enter a valid number';
    }

    if (numValue < 10) {
      return 'Hourly rate must be at least $10/hour';
    }

    if (numValue > 500) {
      return 'Hourly rate cannot exceed $500/hour';
    }

    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHourlyRate(value);
    setError('');
  };

  const handleSubmit = () => {
    const validationError = validateHourlyRate(hourlyRate);
    if (validationError) {
      setError(validationError);
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmUpdate = async () => {
    setIsLoading(true);
    setError('');

    try {
      const numericRate = parseFloat(hourlyRate);
      const updatedMember = await teamApi.updateTeamMemberHourlyRate(
        teamMember._id,
        numericRate
      );
      
      onUpdate(updatedMember);
      onClose();
      setShowConfirmation(false);
    } catch (err) {
      console.error('Error updating hourly rate:', err);
      setError('Failed to update hourly rate. Please try again.');
      setShowConfirmation(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setHourlyRate(teamMember.hourlyRate?.toString() || '');
    setError('');
    setShowConfirmation(false);
    onClose();
  };

  const currentRate = teamMember.hourlyRate;
  const newRate = parseFloat(hourlyRate);
  const hasChanges = currentRate !== newRate && !isNaN(newRate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {!showConfirmation ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Update Hourly Rate
              </DialogTitle>
              <DialogDescription>
                Update the hourly rate for {teamMember.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="hourlyRate" className="text-sm font-medium">
                  Current Rate: {currentRate ? `$${currentRate}/hour` : 'Not set'}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="10"
                    max="500"
                    step="0.01"
                    placeholder="Enter hourly rate"
                    value={hourlyRate}
                    onChange={handleInputChange}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Valid range: $10 - $500 per hour
                </p>
                {error && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!hasChanges || !!error}
              >
                Update Rate
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Confirm Rate Update
              </DialogTitle>
              <DialogDescription>
                Please confirm the hourly rate update for {teamMember.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Rate:</span>
                  <span className="font-medium">
                    {currentRate ? `$${currentRate}/hour` : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">New Rate:</span>
                  <span className="font-medium text-green-600">
                    ${newRate}/hour
                  </span>
                </div>
                {currentRate && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm text-muted-foreground">Change:</span>
                    <span className={`font-medium ${newRate > currentRate ? 'text-green-600' : 'text-red-600'}`}>
                      {newRate > currentRate ? '+' : ''}${(newRate - currentRate).toFixed(2)}/hour
                    </span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button 
                onClick={handleConfirmUpdate}
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Confirm Update'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
