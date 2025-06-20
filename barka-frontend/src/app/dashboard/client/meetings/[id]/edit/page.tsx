'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft,
  Save,
  AlertCircle,
  Calendar,
  Clock
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

interface FormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: string;
}

export default function EditMeetingPage() {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    status: 'scheduled'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
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
        const meetingData = response.data.data;
        setMeeting(meetingData);
        
        // Convert dates to local datetime-local format
        const startDate = new Date(meetingData.startTime);
        const endDate = new Date(meetingData.endTime);
        
        setFormData({
          title: meetingData.title,
          description: meetingData.description || '',
          startTime: formatDateTimeLocal(startDate),
          endTime: formatDateTimeLocal(endDate),
          status: meetingData.status
        });
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

  const formatDateTimeLocal = (date: Date) => {
    // Format date for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!formData.startTime) {
      errors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      errors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime) {
      const startDate = new Date(formData.startTime);
      const endDate = new Date(formData.endTime);
      
      if (endDate <= startDate) {
        errors.endTime = 'End time must be after start time';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        status: formData.status
      };
      
      const response = await api.put(`/clients/me/meetings/${meetingId}`, updateData);
      
      if (response.data.success) {
        router.push(`/dashboard/client/meetings/${meetingId}`);
      } else {
        setError('Failed to update meeting');
      }
    } catch (err: any) {
      console.error('Error updating meeting:', err);
      setError(err.response?.data?.message || 'Failed to update meeting');
    } finally {
      setIsSaving(false);
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

  if (error && !meeting) {
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

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/client/meetings/${meetingId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Meeting
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-rich_black-900">Edit Meeting</h1>
          <p className="text-muted-foreground mt-1">
            Update your meeting details
          </p>
        </div>
      </div>

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

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Details</CardTitle>
          <CardDescription>
            Update the meeting information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter meeting title"
                className={validationErrors.title ? 'border-red-300' : ''}
              />
              {validationErrors.title && (
                <p className="text-sm text-red-600">{validationErrors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter meeting description (optional)"
                rows={3}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date & Time *
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className={validationErrors.startTime ? 'border-red-300' : ''}
                />
                {validationErrors.startTime && (
                  <p className="text-sm text-red-600">{validationErrors.startTime}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  End Date & Time *
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className={validationErrors.endTime ? 'border-red-300' : ''}
                />
                {validationErrors.endTime && (
                  <p className="text-sm text-red-600">{validationErrors.endTime}</p>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brown_sugar-500 focus:border-brown_sugar-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-brown_sugar-600 hover:bg-brown_sugar-700"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/client/meetings/${meetingId}`)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
