"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Eye, EyeOff } from "lucide-react";

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string, reason?: string) => Promise<void>;
  projectName: string;
  isDeleting?: boolean;
}

export function DeleteProjectModal({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  isDeleting = false
}: DeleteProjectModalProps) {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('Admin password is required');
      return;
    }

    try {
      await onConfirm(password, reason.trim() || undefined);
      handleClose();
    } catch (error: any) {
      setError(error.message || 'Failed to delete project');
    }
  };

  const handleClose = () => {
    setPassword('');
    setReason('');
    setError(null);
    setShowPassword(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#5c1a1b]">
            <AlertTriangle size={20} />
            Delete Project
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The project will be moved to trash and automatically deleted after 7 days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Warning Section */}
          <div className="p-4 border border-[#5c1a1b]/20 rounded-lg bg-[#5c1a1b]/5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-[#5c1a1b] mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#5c1a1b]">
                  You are about to delete "{projectName}"
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• All project data will be moved to trash</li>
                  <li>• Team members will be unassigned from this project</li>
                  <li>• The project will be automatically deleted in 7 days</li>
                  <li>• You can recover it from trash before then</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Admin Password Input */}
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-sm font-medium">
              Admin Password <span className="text-[#5c1a1b]">*</span>
            </Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your admin password"
                className="pr-10"
                disabled={isDeleting}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isDeleting}
              >
                {showPassword ? (
                  <EyeOff size={16} className="text-muted-foreground" />
                ) : (
                  <Eye size={16} className="text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Optional Reason */}
          <div className="space-y-2">
            <Label htmlFor="deletion-reason" className="text-sm font-medium">
              Reason for Deletion (Optional)
            </Label>
            <Textarea
              id="deletion-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for deleting this project..."
              className="min-h-[80px] resize-none"
              disabled={isDeleting}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/500 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 border border-[#5c1a1b]/20 rounded-lg bg-[#5c1a1b]/5">
              <p className="text-sm text-[#5c1a1b]">{error}</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isDeleting || !password.trim()}
              className="bg-[#5c1a1b] hover:bg-[#5c1a1b]/90"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Confirm Deletion
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
