'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, AlertCircle, CheckCircle, Plus, Eye, Edit, Trash2, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  createdAt: string;
  updatedAt?: string;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    fetchAllMeetings();
  }, []);

  useEffect(() => {
    filterMeetings();
  }, [meetings, statusFilter, typeFilter]);

  const fetchAllMeetings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get<ApiResponse<Meeting[]>>('/clients/me/meetings/all');
      
      if (response.data.success) {
        setMeetings(response.data.data || []);
      } else {
        setError('Failed to fetch meetings');
      }
    } catch (err: any) {
      console.error('Error fetching meetings:', err);
      setError(err.response?.data?.message || 'Failed to fetch meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const filterMeetings = () => {
    let filtered = meetings;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(meeting => meeting.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(meeting => meeting.eventType === typeFilter);
    }

    setFilteredMeetings(filtered);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    try {
      const response = await api.delete(`/clients/me/meetings/${meetingId}`);
      
      if (response.data.success) {
        setMeetings(meetings.filter(meeting => meeting.id !== meetingId));
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
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const uniqueStatuses = [...new Set(meetings.map(m => m.status))];
  const uniqueTypes = [...new Set(meetings.map(m => m.eventType))];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown_sugar-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading meetings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-rich_black-900">My Meetings</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your scheduled meetings and events
          </p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard/client/chat')}
          className="bg-brown_sugar-600 hover:bg-brown_sugar-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule New Meeting
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm text-rich_black-900"
              >
                <option value="all" className="text-rich_black-900">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status} className="text-rich_black-900">
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm text-rich_black-900"
              >
                <option value="all" className="text-rich_black-900">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type} className="text-rich_black-900">
                    {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meetings List */}
      <div className="grid gap-4">
        {filteredMeetings.length > 0 ? (
          filteredMeetings.map((meeting) => {
            const startDateTime = formatDateTime(meeting.startTime);
            const endDateTime = formatDateTime(meeting.endTime);
            
            return (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-rich_black-900">
                          {meeting.title}
                        </h3>
                        {getStatusBadge(meeting.status)}
                        {getEventTypeBadge(meeting.eventType)}
                      </div>
                      
                      {meeting.description && (
                        <p className="text-muted-foreground mb-3">
                          {meeting.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          <span>{startDateTime.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{startDateTime.time} - {endDateTime.time}</span>
                        </div>
                        {meeting.attendees.length > 0 && (
                          <span>{meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/client/meetings/${meeting.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/client/meetings/${meeting.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
                <p className="text-muted-foreground mb-4">
                  {statusFilter !== 'all' || typeFilter !== 'all' 
                    ? 'No meetings match your current filters.' 
                    : 'You don\'t have any meetings scheduled yet.'}
                </p>
                <Button 
                  onClick={() => router.push('/dashboard/client/chat')}
                  className="bg-brown_sugar-600 hover:bg-brown_sugar-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Your First Meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
