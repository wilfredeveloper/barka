"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Mail, Clock, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { TeamMember, UpdateTeamMemberData, teamApi } from '@/lib/api/team';
import { TeamMemberForm } from '@/components/team/TeamMemberForm';
import { HourlyRateUpdateModal } from '@/components/team/HourlyRateUpdateModal';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  { value: 'on_leave', label: 'On Leave', color: 'bg-yellow-100 text-yellow-800' },
];

interface TeamMemberDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function TeamMemberDetailsPage({ params }: TeamMemberDetailsPageProps) {
  const router = useRouter();
  const { updateTeamMember, deleteTeamMember, loading } = useTeamMembers();

  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isHourlyRateModalOpen, setIsHourlyRateModalOpen] = useState(false);

  // Resolve params and set member ID
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setMemberId(resolvedParams.id);
    };

    resolveParams();
  }, [params]);

  // Fetch team member data when memberId is available
  useEffect(() => {
    if (!memberId) return;

    const fetchTeamMember = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const member = await teamApi.getTeamMember(memberId);
        setTeamMember(member);
      } catch (error: any) {
        console.error('Error fetching team member:', error);
        setError(error.response?.data?.message || 'Failed to load team member details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMember();
  }, [memberId]);



  const handleSave = async (data: UpdateTeamMemberData) => {
    if (!memberId) return;

    try {
      const updatedMember = await updateTeamMember(memberId, data);
      if (updatedMember) {
        setTeamMember(updatedMember);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating team member:', error);
    }
  };

  const handleDelete = async () => {
    if (!memberId) return;

    if (window.confirm('Are you sure you want to delete this team member? This action cannot be undone.')) {
      try {
        await deleteTeamMember(memberId);
        router.push('/dashboard/team');
      } catch (error) {
        console.error('Error deleting team member:', error);
      }
    }
  };

  const handleHourlyRateUpdate = (updatedMember: TeamMember) => {
    setTeamMember(updatedMember);
  };

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(option => option.value === status);
    return statusOption?.color || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold">Loading...</h2>
            <p className="text-muted-foreground">Fetching team member details</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-600">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="space-x-2">
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
              <Link href="/dashboard/team">
                <Button variant="outline">Back to Team</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!teamMember) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Team Member Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested team member could not be found.</p>
            <Link href="/dashboard/team">
              <Button variant="outline">Back to Team</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(teamMember.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{teamMember.name}</h1>
              <p className="text-muted-foreground">
                {teamMember.displayRole || teamMember.customRole || teamMember.role.replace('_', ' ')}
              </p>
              {teamMember.title && (
                <p className="text-sm text-muted-foreground">{teamMember.title}</p>
              )}
            </div>
            <Badge className={getStatusColor(teamMember.status)}>
              {teamMember.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!isEditing && (
            <>
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button onClick={handleDelete} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <TeamMemberForm
          mode="edit"
          initialData={teamMember}
          onSubmit={handleSave}
          onCancel={() => setIsEditing(false)}
          loading={loading}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{teamMember.email}</span>
                  </div>
                  {teamMember.phone && (
                    <div className="flex items-center space-x-2">
                      <span className="h-4 w-4 text-muted-foreground">📞</span>
                      <span>{teamMember.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{teamMember.capacity?.hoursPerWeek || 40} hours/week</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{teamMember.capacity?.availability?.replace('_', ' ') || 'Full Time'}</span>
                  </div>
                  {teamMember.capacity?.timezone && (
                    <div className="flex items-center space-x-2">
                      <span className="h-4 w-4 text-muted-foreground">🌍</span>
                      <span>{teamMember.capacity.timezone}</span>
                    </div>
                  )}
                  {teamMember.capacity?.workingHours && (
                    <div className="flex items-center space-x-2">
                      <span className="h-4 w-4 text-muted-foreground">⏰</span>
                      <span>
                        {teamMember.capacity.workingHours.start} - {teamMember.capacity.workingHours.end}
                      </span>
                    </div>
                  )}
                  {teamMember.department && (
                    <div className="flex items-center space-x-2">
                      <span className="h-4 w-4 text-muted-foreground">🏢</span>
                      <span>{teamMember.department}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Skills & Expertise */}
            <Card>
              <CardHeader>
                <CardTitle>Skills & Expertise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {teamMember.skills?.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      )) || []}
                      {(!teamMember.skills || teamMember.skills.length === 0) && (
                        <span className="text-muted-foreground">No skills added</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Areas of Expertise</h4>
                    <div className="flex flex-wrap gap-2">
                      {teamMember.expertise?.map((exp, index) => (
                        <Badge key={index} variant="outline" className="flex items-center gap-1">
                          {typeof exp === 'string' ? exp : exp.skill}
                          {typeof exp === 'object' && exp.level && (
                            <span className="text-xs opacity-70">({exp.level})</span>
                          )}
                        </Badge>
                      )) || []}
                      {(!teamMember.expertise || teamMember.expertise.length === 0) && (
                        <span className="text-muted-foreground">No expertise areas added</span>
                      )}
                    </div>
                  </div>
                  {teamMember.certifications && teamMember.certifications.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Certifications</h4>
                      <div className="space-y-2">
                        {teamMember.certifications.map((cert, index) => (
                          <div key={index} className="p-2 border rounded-md">
                            <div className="font-medium">{cert.name}</div>
                            {cert.issuedBy && (
                              <div className="text-sm text-muted-foreground">Issued by: {cert.issuedBy}</div>
                            )}
                            {cert.issuedDate && (
                              <div className="text-sm text-muted-foreground">
                                Issued: {new Date(cert.issuedDate).toLocaleDateString()}
                                {cert.expiryDate && (
                                  <span> | Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {teamMember.tags && teamMember.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {teamMember.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes Section */}
            {teamMember.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{teamMember.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Quick Stats
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsHourlyRateModalOpen(true)}
                    className="flex items-center gap-1"
                  >
                    <DollarSign className="h-3 w-3" />
                    Rate
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hourly Rate</span>
                  <span className="font-semibold">
                    {teamMember.hourlyRate ? `$${teamMember.hourlyRate}/hr` : 'Not set'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Tasks</span>
                  <span className="font-semibold">{teamMember.workload?.currentTasks || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hours Allocated</span>
                  <span className="font-semibold">{teamMember.workload?.totalHoursAllocated || 0}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className="font-semibold">{teamMember.workload?.utilizationPercentage || 0}%</span>
                </div>
                {teamMember.performance && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tasks Completed</span>
                      <span className="font-semibold">{teamMember.performance.tasksCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">On-Time Delivery</span>
                      <span className="font-semibold">{teamMember.performance.onTimeDeliveryRate}%</span>
                    </div>
                    {teamMember.performance.qualityRating && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quality Rating</span>
                        <span className="font-semibold">{teamMember.performance.qualityRating}/5</span>
                      </div>
                    )}
                  </>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member Since</span>
                  <span className="font-semibold">
                    {new Date(teamMember.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {teamMember.lastActivity && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Active</span>
                    <span className="font-semibold">
                      {new Date(teamMember.lastActivity).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold">
                    {teamMember.availabilityStatus?.replace('_', ' ') || 'Available'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Hourly Rate Update Modal */}
      {teamMember && (
        <HourlyRateUpdateModal
          isOpen={isHourlyRateModalOpen}
          onClose={() => setIsHourlyRateModalOpen(false)}
          teamMember={teamMember}
          onUpdate={handleHourlyRateUpdate}
        />
      )}
    </div>
  );
}
