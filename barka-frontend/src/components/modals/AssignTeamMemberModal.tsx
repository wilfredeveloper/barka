"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, User, UserPlus, AlertCircle, X } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";

interface AssignTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (memberIds: string[]) => Promise<void>;
  projectId: string;
  currentTeamMembers?: Array<{
    _id: string;
    name: string;
    email?: string;
    role?: string;
  }>;
}

export function AssignTeamMemberModal({
  isOpen,
  onClose,
  onAssign,
  projectId,
  currentTeamMembers = []
}: AssignTeamMemberModalProps) {
  const { members: allTeamMembers, fetchTeamMembers, loading } = useTeam();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current member IDs for filtering
  const currentMemberIds = currentTeamMembers.map(member => member._id);

  // Filter available members (not already assigned)
  const availableMembers = (allTeamMembers || []).filter(member =>
    !currentMemberIds.includes(member._id) &&
    (searchQuery === '' ||
     member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     member.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Load team members when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
      setSelectedMembers([]);
      setSearchQuery('');
      setError(null);
    }
  }, [isOpen, fetchTeamMembers]);

  const handleSubmit = async () => {
    if (selectedMembers.length === 0) {
      setError('Please select at least one team member to assign');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      await onAssign(selectedMembers);
      setSelectedMembers([]);
      onClose();
    } catch (error) {
      console.error('Error assigning team members:', error);
      setError('Failed to assign team members. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
    setError(null);
  };

  const getSelectedMemberNames = () => {
    return selectedMembers
      .map(id => (allTeamMembers || []).find(member => member._id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus size={20} />
            Assign Team Members
          </DialogTitle>
          <DialogDescription>
            Select team members to assign to this project. They will be able to view and work on project tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Search Team Members</Label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Members ({selectedMembers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map(memberId => {
                  const member = (allTeamMembers || []).find(m => m._id === memberId);
                  return member ? (
                    <Badge key={memberId} variant="secondary" className="flex items-center gap-1">
                      {member.name}
                      <button
                        onClick={() => toggleMemberSelection(memberId)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Available Members List */}
          <div className="space-y-2">
            <Label>Available Team Members</Label>
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading team members...</p>
                </div>
              ) : availableMembers.length === 0 ? (
                <div className="p-4 text-center">
                  <User size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No team members found matching your search' : 'No available team members to assign'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {availableMembers.map((member) => (
                    <div
                      key={member._id}
                      className={`p-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer ${
                        selectedMembers.includes(member._id) ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                      }`}
                      onClick={() => toggleMemberSelection(member._id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {member.email && <span>{member.email}</span>}
                            {member.role && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{member.role}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.status && (
                          <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {member.status}
                          </Badge>
                        )}
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member._id)}
                          onChange={() => toggleMemberSelection(member._id)}
                          className="rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || selectedMembers.length === 0}
          >
            {isSubmitting ? 'Assigning...' : `Assign ${selectedMembers.length} Member${selectedMembers.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
