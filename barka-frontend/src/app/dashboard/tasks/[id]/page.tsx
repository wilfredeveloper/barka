"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { ArrowLeft, Edit, MoreHorizontal, Clock, MessageSquare, History, Play, Pause, User, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { tasksApi, type Task } from "@/lib/api/tasks";

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Task['comments']>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Fetch task data
  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch task details
        const taskData = await tasksApi.getTask(taskId);
        setTask(taskData);

        // Fetch comments
        const commentsData = await tasksApi.getTaskComments(taskId);
        setComments(commentsData || []);

        // Fetch history
        const historyData = await tasksApi.getTaskHistory(taskId);
        setHistory(historyData || []);

      } catch (err: any) {
        console.error('Error fetching task data:', err);
        setError(err.response?.data?.message || 'Failed to load task data');
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      fetchTaskData();
    }
  }, [taskId]);

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const comment = await tasksApi.addTaskComment(taskId, { content: newComment.trim() });
      setComments(prev => [...(prev || []), comment]);
      setNewComment("");
    } catch (err: any) {
      console.error('Error adding comment:', err);
      // You might want to show a toast notification here
    } finally {
      setSubmittingComment(false);
    }
  };

  // Helper function to get author display name
  const getAuthorName = (author: any): string => {
    if (typeof author === 'object' && author) {
      return `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Unknown User';
    } else if (typeof author === 'string') {
      return author;
    }
    return 'Unknown User';
  };

  // Helper function to get author initials
  const getAuthorInitials = (author: any): string => {
    if (typeof author === 'object' && author) {
      const fullName = `${author.firstName || ''} ${author.lastName || ''}`.trim();
      return fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    } else if (typeof author === 'string') {
      return author.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return 'U';
  };

  // Format date helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format relative time helper
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }

    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    // Debug logging
    console.log('formatRelativeTime debug:', {
      dateString,
      parsedDate: date.toISOString(),
      now: now.toISOString(),
      diffInMs,
      diffInMinutes,
      diffInHours,
      diffInDays
    });

    // Handle future dates (shouldn't happen but just in case)
    if (diffInMs < 0) {
      return 'In the future';
    }

    // Less than 1 minute
    if (diffInMinutes < 1) return 'Just now';

    // Less than 1 hour
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }

    // Less than 24 hours
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    // Less than 7 days
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    // Less than 30 days
    if (diffInDays < 30) {
      const diffInWeeks = Math.floor(diffInDays / 7);
      return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    }

    // More than 30 days, show formatted date
    return formatDate(dateString);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tasks">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tasks">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Task Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle size={24} />
              <div>
                <h3 className="font-semibold">Error Loading Task</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No task found
  if (!task) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tasks">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Task Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tasks">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{task.name}</h1>
              <StatusBadge status={task.status} type="task" />
              <PriorityIndicator priority={task.priority} />
            </div>
            <p className="text-muted-foreground">
              {task.project?.name || 'No project assigned'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/tasks/${taskId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="ghost" size="icon">
            <MoreHorizontal size={20} />
          </Button>
        </div>
      </div>

      {/* Task Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-semibold">{formatDate(task.dueDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                {(task.assignedTo?.name || task.assignedToName) ? (
                  <span className="font-semibold text-primary text-sm">
                    {(task.assignedTo?.name || task.assignedToName || '').split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                ) : (
                  <User size={20} className="text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assignee</p>
                <p className="font-semibold">{task.assignedTo?.name || task.assignedToName || 'Unassigned'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Estimated</p>
              <p className="font-semibold">
                {task.estimatedHours ? `${task.estimatedHours} hours` : 'Not set'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Time Spent</p>
              <p className="font-semibold">
                {task.actualHours ? `${task.actualHours} hours` : '0 hours'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </CardContent>
          </Card>

          <Tabs defaultValue="comments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="comments">
                Comments ({comments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="time">Time Tracking</TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare size={20} />
                    Comments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {comments && comments.length > 0 ? (
                      comments.map((comment) => (
                        <div key={comment._id} className="flex gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-primary text-xs">
                              {getAuthorInitials(comment.author)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {getAuthorName(comment.author)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No comments yet. Be the first to add one!
                      </p>
                    )}
                  </div>
                  <div className="border-t pt-4">
                    <Textarea
                      placeholder="Add a comment..."
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button
                      className="mt-2"
                      size="sm"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || submittingComment}
                    >
                      {submittingComment ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History size={20} />
                    Activity History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {history && history.length > 0 ? (
                      history.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                          <div>
                            <p>
                              {item.action || `Status changed to ${item.status?.replace('_', ' ')}`}
                              {item.comment && (
                                <span className="text-muted-foreground"> - {item.comment}</span>
                              )}
                            </p>
                            <p className="text-muted-foreground">
                              {formatRelativeTime(item.timestamp)} by {item.changedBy || 'System'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No activity history available.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="time">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock size={20} />
                    Time Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Hours</p>
                      <p className="text-lg font-semibold">
                        {task.estimatedHours || 0}h
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Actual Hours</p>
                      <p className="text-lg font-semibold">
                        {task.actualHours || 0}h
                      </p>
                    </div>
                  </div>

                  {task.progress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{task.progress.completionPercentage || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress.completionPercentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <Button size="sm" className="flex items-center gap-2">
                      <Play size={16} />
                      Start Timer
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Pause size={16} />
                      Pause
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Time Summary</h4>
                    <div className="space-y-2">
                      {task.progress?.timeSpent ? (
                        <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                          <div>
                            <p className="font-medium text-sm">{task.progress.timeSpent}h</p>
                            <p className="text-xs text-muted-foreground">Total time logged</p>
                          </div>
                          <span className="text-xs text-muted-foreground">Current</span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No time entries yet.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project</span>
                {task.project?._id ? (
                  <Link href={`/dashboard/projects/${task.project._id}`} className="text-primary hover:underline">
                    {task.project.name || 'Unnamed Project'}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">No project</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span title={`Full date: ${task.createdAt}`}>
                  {formatRelativeTime(task.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span title={`Full date: ${task.updatedAt}`}>
                  {formatRelativeTime(task.updatedAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Complexity</span>
                <Badge variant="secondary" className="capitalize">
                  {task.complexity?.replace('_', ' ') || 'Not set'}
                </Badge>
              </div>
              {task.category && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="outline">{task.category}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {task.tags && task.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {((task.dependsOn && task.dependsOn.length > 0) || (task.blockedBy && task.blockedBy.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle>Dependencies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {task.dependsOn && task.dependsOn.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Depends On</h4>
                      <div className="space-y-2">
                        {task.dependsOn.map((depId) => (
                          <Link key={depId} href={`/dashboard/tasks/${depId}`} className="block p-2 bg-muted/50 rounded hover:bg-muted">
                            <p className="font-medium text-sm">Task #{depId.slice(-6)}</p>
                            <p className="text-xs text-muted-foreground">Click to view</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {task.blockedBy && task.blockedBy.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Blocked By</h4>
                      <div className="space-y-2">
                        {task.blockedBy.map((blockId) => (
                          <Link key={blockId} href={`/dashboard/tasks/${blockId}`} className="block p-2 bg-red-50 rounded hover:bg-red-100">
                            <p className="font-medium text-sm">Task #{blockId.slice(-6)}</p>
                            <p className="text-xs text-red-600">Blocking this task</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
