"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { CreateTeamMemberData } from '@/lib/api/team';
import { TeamMemberForm } from '@/components/team/TeamMemberForm';

export default function AddTeamMemberPage() {
  const router = useRouter();
  const { createTeamMember, loading } = useTeamMembers();

  const handleSubmit = async (data: CreateTeamMemberData) => {
    try {
      const newMember = await createTeamMember(data);
      if (newMember) {
        router.push('/dashboard/team');
      }
    } catch (error) {
      console.error('Error creating team member:', error);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/team');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/team">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Team
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Add Team Member</h1>
            <p className="text-muted-foreground">Create a new team member profile</p>
          </div>
        </div>
      </div>

      <TeamMemberForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  );
}
