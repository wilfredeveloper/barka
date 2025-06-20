'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Search,
  Filter,
  Download,
  Grid,
  List,
  Plus,
  Clock,
  Users,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  X,
  Check
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
}

interface FilterState {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  eventType: 'all' | 'kickoff' | 'review' | 'demo' | 'planning' | 'check_in';
  status: 'all' | 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  search: string;
  sortBy: 'date' | 'title' | 'type' | 'status';
  sortOrder: 'asc' | 'desc';
  customStartDate?: string;
  customEndDate?: string;
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

export default function EventsAdminPage() {
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    eventType: 'all',
    status: 'all',
    search: '',
    sortBy: 'date',
    sortOrder: 'asc',
    customStartDate: '',
    customEndDate: ''
  });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return;
    }
    setUser(currentUser);
    loadEvents();
  }, []);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [filters, user]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      console.log('Loading events for user:', user);
      console.log('Organization ID:', user?.organization || user?.organizationId);

      // Prepare params - only include organizationId if available
      const params: any = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };

      // Add organizationId if available (for super_admin who needs to specify it)
      const orgId = user?.organization || user?.organizationId;
      if (orgId) {
        params.organizationId = orgId;
      }

      const response = await api.get('/admin/events', { params });

      console.log('Events API response:', response.data);

      if (response.data.success) {
        setEvents(response.data.events);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        console.error('API returned error:', response.data.error);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('Error details:', (error as any).response?.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      exportToCSV();
    } else {
      exportToPDF();
    }
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Type', 'Status', 'Date', 'Time', 'Duration', 'Attendees', 'Description'];
    const csvData = [
      headers,
      ...sortedEvents.map(event => [
        event.title,
        event.eventType,
        event.status,
        formatDate(event.startTime),
        new Date(event.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        formatDuration(event.startTime, event.endTime),
        event.attendees.map(a => a.email).join('; '),
        event.description || ''
      ])
    ];

    const csvContent = csvData.map(row =>
      row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `events-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    // For now, we'll create a simple HTML version that can be printed as PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Events Export</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status { padding: 2px 6px; border-radius: 3px; font-size: 12px; }
            .status-scheduled { background-color: #fef3c7; color: #92400e; }
            .status-confirmed { background-color: #d1fae5; color: #065f46; }
            .status-cancelled { background-color: #fee2e2; color: #991b1b; }
            .status-completed { background-color: #f3f4f6; color: #374151; }
          </style>
        </head>
        <body>
          <h1>Events Export - ${new Date().toLocaleDateString()}</h1>
          <p>Total Events: ${sortedEvents.length}</p>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date & Time</th>
                <th>Duration</th>
                <th>Attendees</th>
              </tr>
            </thead>
            <tbody>
              ${sortedEvents.map(event => `
                <tr>
                  <td>${event.title}</td>
                  <td>${event.eventType}</td>
                  <td><span class="status status-${event.status}">${event.status}</span></td>
                  <td>${formatDate(event.startTime)} ${new Date(event.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>${formatDuration(event.startTime, event.endTime)}</td>
                  <td>${event.attendees.length} (${event.attendees.map(a => a.email).join(', ')})</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleEventAction = async (eventId: string, action: 'view' | 'edit' | 'cancel' | 'complete') => {
    try {
      switch (action) {
        case 'view':
          // Navigate to event detail page
          window.open(`/dashboard/admin/barka-space-os/events/${eventId}`, '_blank');
          break;
        case 'edit':
          // Open edit modal or navigate to edit page
          console.log('Edit event:', eventId);
          // TODO: Implement edit functionality
          break;
        case 'cancel':
          if (confirm('Are you sure you want to cancel this event?')) {
            const response = await api.patch(`/admin/events/${eventId}`, { status: 'cancelled' });
            if (response.data.success) {
              loadEvents();
              // Show success message (you could add a toast notification here)
            }
          }
          break;
        case 'complete':
          if (confirm('Mark this event as completed?')) {
            const response = await api.patch(`/admin/events/${eventId}`, { status: 'completed' });
            if (response.data.success) {
              loadEvents();
              // Show success message (you could add a toast notification here)
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error performing event action:', error);
      // Show error message (you could add a toast notification here)
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  const filteredEvents = events.filter(event => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.attendees.some(attendee => 
          attendee.email.toLowerCase().includes(searchLower) ||
          (attendee.name && attendee.name.toLowerCase().includes(searchLower))
        );
      if (!matchesSearch) return false;
    }

    // Event type filter
    if (filters.eventType !== 'all' && event.eventType !== filters.eventType) {
      return false;
    }

    // Status filter
    if (filters.status !== 'all' && event.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const eventDate = new Date(event.startTime);
      const now = new Date();

      switch (filters.dateRange) {
        case 'today':
          if (eventDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (eventDate < now || eventDate > weekFromNow) return false;
          break;
        case 'month':
          const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (eventDate < now || eventDate > monthFromNow) return false;
          break;
        case 'custom':
          if (filters.customStartDate && eventDate < new Date(filters.customStartDate)) return false;
          if (filters.customEndDate && eventDate > new Date(filters.customEndDate + 'T23:59:59')) return false;
          break;
      }
    }

    return true;
  });

  // Sort events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    let comparison = 0;
    
    switch (filters.sortBy) {
      case 'date':
        comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'type':
        comparison = a.eventType.localeCompare(b.eventType);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    
    return filters.sortOrder === 'desc' ? -comparison : comparison;
  });

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Calendar size={48} className="text-brown_sugar-400 mx-auto mb-4" />
          <p className="text-zinc-400">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
              <Calendar size={24} className="text-brown_sugar-400" />
              Events Management
            </h1>
            <p className="text-zinc-400 mt-1">
              Manage all scheduled events and meetings for your organization
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  <Download size={16} className="mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <Download size={16} className="mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <Download size={16} className="mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              className="bg-brown_sugar-600 hover:bg-brown_sugar-700 text-white"
              size="sm"
            >
              <Plus size={16} className="mr-2" />
              New Event
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="border-b border-zinc-800 bg-zinc-900/30 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search events, attendees, or descriptions..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400"
            />
          </div>

          {/* Filters */}
          <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
            <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Next 7 Days</SelectItem>
              <SelectItem value="month">Next 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Range Inputs */}
          {filters.dateRange === 'custom' && (
            <>
              <Input
                type="date"
                placeholder="Start Date"
                value={filters.customStartDate}
                onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
                className="w-40 bg-zinc-800 border-zinc-700 text-zinc-100"
              />
              <Input
                type="date"
                placeholder="End Date"
                value={filters.customEndDate}
                onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
                className="w-40 bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </>
          )}

          <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
            <SelectTrigger className="w-36 bg-zinc-800 border-zinc-700 text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="kickoff">Kickoff</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="demo">Demo</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="check_in">Check-in</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-36 bg-zinc-800 border-zinc-700 text-zinc-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center bg-zinc-800 rounded-md p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
            >
              <List size={16} />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-3"
            >
              <Grid size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown_sugar-500 mx-auto mb-4"></div>
              <p className="text-zinc-400">Loading events...</p>
            </div>
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Calendar size={48} className="text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-300 mb-2">No events found</h3>
              <p className="text-zinc-500 mb-4">
                {filters.search || filters.eventType !== 'all' || filters.status !== 'all' || filters.dateRange !== 'all'
                  ? 'Try adjusting your filters to see more events.'
                  : 'No events have been scheduled yet.'}
              </p>
              <Button className="bg-brown_sugar-600 hover:bg-brown_sugar-700 text-white">
                <Plus size={16} className="mr-2" />
                Create First Event
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                Showing {sortedEvents.length} of {events.length} events
              </p>
              
              <Select value={`${filters.sortBy}-${filters.sortOrder}`} onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split('-');
                handleFilterChange('sortBy', sortBy);
                handleFilterChange('sortOrder', sortOrder);
              }}>
                <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-asc">Date (Earliest First)</SelectItem>
                  <SelectItem value="date-desc">Date (Latest First)</SelectItem>
                  <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                  <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                  <SelectItem value="type-asc">Type (A-Z)</SelectItem>
                  <SelectItem value="status-asc">Status (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Events List */}
            {viewMode === 'table' ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-800/50 border-b border-zinc-700">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-zinc-300">Event</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-300">Date & Time</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-300">Duration</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-300">Type</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-300">Attendees</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-300">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEvents.map((event, index) => (
                        <tr key={event._id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${index % 2 === 0 ? 'bg-zinc-900/20' : ''}`}>
                          <td className="p-4">
                            <div>
                              <h3 className="font-medium text-zinc-100">{event.title}</h3>
                              {event.description && (
                                <p className="text-sm text-zinc-400 mt-1 truncate max-w-xs">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              <div className="text-zinc-100">{formatDate(event.startTime)}</div>
                              <div className="text-zinc-400 flex items-center gap-1 mt-1">
                                <Clock size={12} />
                                {new Date(event.startTime).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-zinc-300">
                              {formatDuration(event.startTime, event.endTime)}
                            </span>
                          </td>
                          <td className="p-4">
                            <Badge className={`${EVENT_TYPE_COLORS[event.eventType as keyof typeof EVENT_TYPE_COLORS]} border`}>
                              {event.eventType}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-zinc-300">
                              <Users size={12} />
                              <span>{event.attendees.length}</span>
                              {event.attendees.length > 0 && (
                                <div className="ml-2 text-xs text-zinc-500 truncate max-w-32">
                                  {event.attendees[0].email}
                                  {event.attendees.length > 1 && ` +${event.attendees.length - 1}`}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={`${STATUS_COLORS[event.status]} border`}>
                              {event.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                                <DropdownMenuItem onClick={() => handleEventAction(event._id, 'view')}>
                                  <Eye size={16} className="mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEventAction(event._id, 'edit')}>
                                  <Edit size={16} className="mr-2" />
                                  Edit Event
                                </DropdownMenuItem>
                                {event.status === 'scheduled' && (
                                  <DropdownMenuItem onClick={() => handleEventAction(event._id, 'complete')}>
                                    <Check size={16} className="mr-2" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                )}
                                {event.status !== 'cancelled' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleEventAction(event._id, 'cancel')}
                                    className="text-red-400 focus:text-red-300"
                                  >
                                    <X size={16} className="mr-2" />
                                    Cancel Event
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Card view
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedEvents.map((event) => (
                  <div
                    key={event._id}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 hover:bg-zinc-800/30 transition-colors"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-zinc-100 truncate">{event.title}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`${EVENT_TYPE_COLORS[event.eventType as keyof typeof EVENT_TYPE_COLORS]} border text-xs`}>
                            {event.eventType}
                          </Badge>
                          <Badge className={`${STATUS_COLORS[event.status]} border text-xs`}>
                            {event.status}
                          </Badge>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                          <DropdownMenuItem onClick={() => handleEventAction(event._id, 'view')}>
                            <Eye size={16} className="mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEventAction(event._id, 'edit')}>
                            <Edit size={16} className="mr-2" />
                            Edit Event
                          </DropdownMenuItem>
                          {event.status === 'scheduled' && (
                            <DropdownMenuItem onClick={() => handleEventAction(event._id, 'complete')}>
                              <Check size={16} className="mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                          )}
                          {event.status !== 'cancelled' && (
                            <DropdownMenuItem
                              onClick={() => handleEventAction(event._id, 'cancel')}
                              className="text-red-400 focus:text-red-300"
                            >
                              <X size={16} className="mr-2" />
                              Cancel Event
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Event Details */}
                    <div className="space-y-3">
                      {/* Date and Time */}
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-zinc-400" />
                        <span className="text-zinc-300">{formatDate(event.startTime)}</span>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-2 text-sm">
                        <Clock size={14} className="text-zinc-400" />
                        <span className="text-zinc-300">{formatDuration(event.startTime, event.endTime)}</span>
                      </div>

                      {/* Attendees */}
                      <div className="flex items-center gap-2 text-sm">
                        <Users size={14} className="text-zinc-400" />
                        <span className="text-zinc-300">{event.attendees.length} attendees</span>
                        {event.attendees.length > 0 && (
                          <div className="flex -space-x-1 ml-2">
                            {event.attendees.slice(0, 3).map((attendee, index) => (
                              <div
                                key={index}
                                className="w-6 h-6 bg-brown_sugar-600 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-zinc-900"
                                title={attendee.email}
                              >
                                {attendee.name ? attendee.name.charAt(0).toUpperCase() : attendee.email.charAt(0).toUpperCase()}
                              </div>
                            ))}
                            {event.attendees.length > 3 && (
                              <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium text-zinc-300 border-2 border-zinc-900">
                                +{event.attendees.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {event.description && (
                        <div className="text-sm text-zinc-400 line-clamp-2">
                          {event.description}
                        </div>
                      )}

                      {/* Location */}
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin size={14} className="text-zinc-400" />
                          <span className="text-zinc-300 truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        Created {new Date(event.createdAt).toLocaleDateString()}
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEventAction(event._id, 'view')}
                        className="text-brown_sugar-400 hover:text-brown_sugar-300 hover:bg-brown_sugar-500/10"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-zinc-800">
                <div className="text-sm text-zinc-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} events
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page <= 1}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const pageNum = pagination.page <= 3
                        ? i + 1
                        : pagination.page >= pagination.pages - 2
                        ? pagination.pages - 4 + i
                        : pagination.page - 2 + i;

                      if (pageNum < 1 || pageNum > pagination.pages) return null;

                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                          className={pageNum === pagination.page
                            ? "bg-brown_sugar-600 hover:bg-brown_sugar-700 text-white"
                            : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.pages}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
