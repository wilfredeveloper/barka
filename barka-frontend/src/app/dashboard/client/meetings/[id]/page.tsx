'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CalendarDays, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Edit, 
  Trash2, 
  ArrowLeft,
  MapPin,
  Link as LinkIcon,
  Users,
  Bell
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { ApiResponse } from '@/types';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  eventType: string;
  status: string;
  attendees: Array<{
    email: string;
    name: string;
    role: string;
  }>;
  calendarEventId?: string;
  location?: string;
  meetingLink?: string;
  reminders: Array<{
    type: string;
    minutesBefore: number;
    sent: boolean;
  }>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

export default function MeetingDetailsPage() {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const meetingId = params.id as string;

  useEffect(() => {
    if (meetingId) {
      fetchMeetingDetails();
    }
  }, [meetingId]);

  const fetchMeetingDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get<ApiResponse<Meeting>>(`/clients/me/meetings/${meetingId}`);
      
      if (response.data.success && response.data.data) {
        setMeeting(response.data.data);
      } else {
        setError('Failed to fetch meeting details');
      }
    } catch (err: any) {
      console.error('Error fetching meeting details:', err);
      if (err.response?.status === 404) {
        setError('Meeting not found');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch meeting details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/clients/me/meetings/${meetingId}`);
      
      if (response.data.success) {
        router.push('/dashboard/client/meetings');
      } else {
        alert('Failed to delete meeting');
      }
    } catch (err: any) {
      console.error('Error deleting meeting:', err);
      alert(err.response?.data?.message || 'Failed to delete meeting');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      completed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getEventTypeBadge = (eventType: string) => {
    const typeColors = {
      kickoff: 'bg-purple-100 text-purple-800',
      review: 'bg-orange-100 text-orange-800',
      demo: 'bg-cyan-100 text-cyan-800',
      planning: 'bg-indigo-100 text-indigo-800',
      check_in: 'bg-yellow-100 text-yellow-800'
    };

    const color = typeColors[eventType as keyof typeof typeColors] || 'bg-gray-100 text-gray-800';

    return (
      <Badge className={color}>
        {eventType.replace('_', ' ').charAt(0).toUpperCase() + eventType.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes} minutes`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown_sugar-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading meeting details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-red-700">Error</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button 
                onClick={() => router.push('/dashboard/client/meetings')}
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Meetings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!meeting) {
    return null;
  }

  const startDateTime = formatDateTime(meeting.startTime);
  const endDateTime = formatDateTime(meeting.endTime);
  const duration = calculateDuration(meeting.startTime, meeting.endTime);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/client/meetings')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meetings
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-rich_black-900">{meeting.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(meeting.status)}
              {getEventTypeBadge(meeting.eventType)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/client/meetings/${meetingId}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleDeleteMeeting}
            className="text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {meeting.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{meeting.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Date & Time
                  </h4>
                  <p className="text-muted-foreground">{startDateTime.date}</p>
                  <p className="text-muted-foreground">{startDateTime.time} - {endDateTime.time}</p>
                  <p className="text-sm text-muted-foreground">Duration: {duration}</p>
                </div>

                {meeting.location && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </h4>
                    <p className="text-muted-foreground">{meeting.location}</p>
                  </div>
                )}
              </div>

              {meeting.meetingLink && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Meeting Link
                  </h4>
                  <a 
                    href={meeting.meetingLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-brown_sugar-600 hover:text-brown_sugar-700 underline"
                  >
                    {meeting.meetingLink}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendees */}
          {meeting.attendees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendees ({meeting.attendees.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {meeting.attendees.map((attendee, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{attendee.name || attendee.email}</p>
                        {attendee.name && (
                          <p className="text-sm text-muted-foreground">{attendee.email}</p>
                        )}
                      </div>
                      {attendee.role && (
                        <Badge variant="outline">{attendee.role}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full bg-brown_sugar-600 hover:bg-brown_sugar-700"
                onClick={() => router.push(`/dashboard/client/meetings/${meetingId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Meeting
              </Button>
              
              {meeting.calendarEventId && (
                <Button variant="outline" className="w-full">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  View in Calendar
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full text-red-600 hover:text-red-700 hover:border-red-300"
                onClick={handleDeleteMeeting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Meeting
              </Button>
            </CardContent>
          </Card>

          {/* Reminders */}
          {meeting.reminders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Reminders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {meeting.reminders.map((reminder, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)}</span>
                      <span className="text-muted-foreground">
                        {reminder.minutesBefore} min before
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meeting Info */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(meeting.createdAt).toLocaleDateString()}</span>
              </div>
              {meeting.updatedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span>{new Date(meeting.updatedAt).toLocaleDateString()}</span>
                </div>
              )}
              {meeting.calendarEventId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calendar ID:</span>
                  <span className="font-mono text-xs">{meeting.calendarEventId}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
