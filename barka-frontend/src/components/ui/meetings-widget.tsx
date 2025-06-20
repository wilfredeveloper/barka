'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, AlertCircle, CheckCircle, Plus, ExternalLink } from 'lucide-react';
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
}

interface MeetingsWidgetProps {
  className?: string;
}

export function MeetingsWidget({ className }: MeetingsWidgetProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch meetings from API
  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get<ApiResponse<Meeting[]>>('/clients/me/meetings?days=14');
      
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

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format meeting type for display
  const formatMeetingType = (type: string) => {
    switch (type) {
      case 'kickoff':
        return 'Kickoff';
      case 'consultation':
        return 'Consultation';
      case 'review':
        return 'Review';
      case 'demo':
        return 'Demo';
      case 'planning':
        return 'Planning';
      case 'check_in':
        return 'Check-in';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-hunter_green-100 text-hunter_green-800';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      case 'cancelled':
        return 'bg-chocolate_cosmos-100 text-chocolate_cosmos-800';
      default:
        return 'bg-brown_sugar-100 text-brown_sugar-800';
    }
  };

  // Get day abbreviation for date circle
  const getDayAbbrev = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  };

  // Get day number
  const getDayNumber = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate();
  };

  // Get upcoming meetings (next 3)
  const upcomingMeetings = meetings.slice(0, 3);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5 text-brown_sugar-600" />
            <CardTitle className="text-lg">Upcoming Meetings</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push('/dashboard/client/meetings')}
              title="View all meetings"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push('/dashboard/client/chat')}
              title="Schedule new meeting"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          {isLoading ? (
            'Loading meetings...'
          ) : error ? (
            <span className="text-chocolate_cosmos-600">Error loading meetings</span>
          ) : meetings.length > 0 ? (
            `${meetings.length} meeting${meetings.length === 1 ? '' : 's'} scheduled`
          ) : (
            'No upcoming meetings'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brown_sugar-600"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <AlertCircle className="h-8 w-8 text-chocolate_cosmos-500" />
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchMeetings}>
              Try Again
            </Button>
          </div>
        ) : upcomingMeetings.length > 0 ? (
          <div className="space-y-3">
            {upcomingMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="flex items-start space-x-3 p-3 rounded-lg bg-gradient-to-r from-brown_sugar-50 to-hunter_green-50 border border-brown_sugar-100 hover:shadow-sm transition-all duration-200 cursor-pointer"
                onClick={() => router.push(`/dashboard/client/meetings/${meeting.id}`)}
              >
                {/* Date Circle */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brown_sugar-600 text-seasalt flex flex-col items-center justify-center text-xs font-medium">
                  <div className="text-[10px] leading-none">{getDayAbbrev(meeting.startTime)}</div>
                  <div className="text-sm font-bold leading-none">{getDayNumber(meeting.startTime)}</div>
                </div>

                {/* Meeting Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-sm text-rich_black-900 truncate pr-2 hover:text-brown_sugar-600 transition-colors">
                      {meeting.title}
                    </h4>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs flex-shrink-0 ${getStatusColor(meeting.status)}`}
                    >
                      {formatMeetingType(meeting.eventType)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(meeting.startTime)}</span>
                    <span>•</span>
                    <span>{formatDate(meeting.startTime)}</span>
                  </div>
                  
                  {meeting.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {meeting.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {meetings.length > 3 && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-brown_sugar-600 hover:text-brown_sugar-700"
                  onClick={() => router.push('/dashboard/client/meetings')}
                >
                  View all {meetings.length} meetings
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-hunter_green-500 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No meetings scheduled
            </p>
            <p className="text-xs text-muted-foreground">
              Your calendar is clear!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
