'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Link as LinkIcon,
  Edit,
  Trash2,
  ArrowLeft,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import api from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

// Types
interface ScheduledEvent {
  _id: string;
  title: string;
  description: string;
  eventType: string;
  startTime: string;
  endTime: string;
  attendees: Array<{
    email: string;
    name?: string;
    status?: string;
  }>;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  location?: string;
  meetingLink?: string;
  calendarEventId?: string;
  createdAt: string;
  updatedAt: string;
  clientId?: string;
  organizationId: string;
}

const EVENT_TYPE_COLORS = {
  kickoff: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  review: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  demo: 'bg-green-500/20 text-green-300 border-green-500/30',
  planning: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  check_in: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
};

const STATUS_COLORS = {
  scheduled: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  confirmed: 'bg-green-500/20 text-green-300 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  completed: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
};

const STATUS_ICONS = {
  scheduled: AlertCircle,
  confirmed: CheckCircle,
  cancelled: XCircle,
  completed: CheckCircle
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<ScheduledEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    setUser(currentUser);
    loadEvent();
  }, [params.id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/events/${params.id}`);
      
      if (response.data.success) {
        setEvent(response.data.event);
      } else {
        console.error('Failed to load event:', response.data.error);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const response = await api.patch(`/admin/events/${params.id}`, {
        status: newStatus
      });

      if (response.data.success) {
        setEvent(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/admin/events/${params.id}`);
      
      if (response.data.success) {
        router.push('/dashboard/admin/barka-space-os/events');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes} minutes`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours} hours ${minutes} minutes` : `${hours} hours`;
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Calendar size={48} className="text-brown_sugar-400 mx-auto mb-4" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown_sugar-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Calendar size={48} className="text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">Event not found</h3>
          <p className="text-zinc-500 mb-4">The event you're looking for doesn't exist or has been deleted.</p>
          <Button 
            onClick={() => router.push('/dashboard/admin/barka-space-os/events')}
            className="bg-brown_sugar-600 hover:bg-brown_sugar-700 text-white"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[event.status];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/admin/barka-space-os/events')}
              className="text-zinc-400 hover:text-zinc-100"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Events
            </Button>
            
            <div>
              <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                <Calendar size={24} className="text-brown_sugar-400" />
                {event.title}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={`${EVENT_TYPE_COLORS[event.eventType as keyof typeof EVENT_TYPE_COLORS]} border`}>
                  {event.eventType}
                </Badge>
                <Badge className={`${STATUS_COLORS[event.status]} border flex items-center gap-1`}>
                  <StatusIcon size={12} />
                  {event.status}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <Edit size={16} className="mr-2" />
              Edit Event
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="border-red-700 text-red-400 hover:bg-red-900/20"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Event Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <Calendar size={20} className="text-brown_sugar-400" />
                  Event Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-zinc-400">Date</label>
                  <p className="text-zinc-100">{formatDate(event.startTime)}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-400">Start Time</label>
                    <p className="text-zinc-100">{formatTime(event.startTime)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400">End Time</label>
                    <p className="text-zinc-100">{formatTime(event.endTime)}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-zinc-400">Duration</label>
                  <p className="text-zinc-100 flex items-center gap-2">
                    <Clock size={16} />
                    {formatDuration(event.startTime, event.endTime)}
                  </p>
                </div>

                {event.location && (
                  <div>
                    <label className="text-sm font-medium text-zinc-400">Location</label>
                    <p className="text-zinc-100 flex items-center gap-2">
                      <MapPin size={16} />
                      {event.location}
                    </p>
                  </div>
                )}

                {event.meetingLink && (
                  <div>
                    <label className="text-sm font-medium text-zinc-400">Meeting Link</label>
                    <div className="flex items-center gap-2">
                      <a
                        href={event.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brown_sugar-400 hover:text-brown_sugar-300 flex items-center gap-1"
                      >
                        <LinkIcon size={16} />
                        Join Meeting
                        <ExternalLink size={12} />
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(event.meetingLink!)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendees */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <Users size={20} className="text-brown_sugar-400" />
                  Attendees ({event.attendees.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {event.attendees.length === 0 ? (
                  <p className="text-zinc-400">No attendees added</p>
                ) : (
                  <div className="space-y-3">
                    {event.attendees.map((attendee, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-brown_sugar-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
                            {attendee.name ? attendee.name.charAt(0).toUpperCase() : attendee.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-zinc-100 font-medium">
                              {attendee.name || attendee.email.split('@')[0]}
                            </p>
                            <p className="text-sm text-zinc-400">{attendee.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {attendee.status && (
                            <Badge variant="outline" className="text-xs">
                              {attendee.status}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(attendee.email)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {event.description && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-300 whitespace-pre-wrap">{event.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Status Management */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Event Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {event.status === 'scheduled' && (
                  <Button
                    onClick={() => handleStatusUpdate('confirmed')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Confirm Event
                  </Button>
                )}
                
                {(event.status === 'scheduled' || event.status === 'confirmed') && (
                  <Button
                    onClick={() => handleStatusUpdate('completed')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Mark Complete
                  </Button>
                )}
                
                {event.status !== 'cancelled' && event.status !== 'completed' && (
                  <Button
                    onClick={() => handleStatusUpdate('cancelled')}
                    variant="outline"
                    className="border-red-700 text-red-400 hover:bg-red-900/20"
                  >
                    <XCircle size={16} className="mr-2" />
                    Cancel Event
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Event Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-zinc-400">Event ID</label>
                  <p className="text-zinc-300 font-mono">{event._id}</p>
                </div>
                
                {event.calendarEventId && (
                  <div>
                    <label className="text-zinc-400">Calendar Event ID</label>
                    <p className="text-zinc-300 font-mono">{event.calendarEventId}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-zinc-400">Created</label>
                  <p className="text-zinc-300">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
                
                <div>
                  <label className="text-zinc-400">Last Updated</label>
                  <p className="text-zinc-300">{new Date(event.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
