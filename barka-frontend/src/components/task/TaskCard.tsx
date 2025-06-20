"use client";

import React, { useCallback, forwardRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, User, MoreHorizontal, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Task } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface TaskCardProps {
  task: Task;
  variant?: 'default' | 'compact' | 'kanban';
  draggable?: boolean;
  showProject?: boolean;
  showActions?: boolean;
  onUpdate?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
  onClick?: (task: Task) => void;
  isCompleted?: boolean;
  isDragging?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(({
  task,
  variant = 'default',
  draggable = false,
  showProject = true,
  showActions = true,
  onUpdate,
  onStatusChange,
  onClick,
  isCompleted = false,
  isDragging = false,
  className,
  style,
  ...props
}, ref) => {
  const { toast } = useToast();

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger navigation if the click is not on an interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="checkbox"]')) {
      return;
    }

    if (onClick) {
      onClick(task);
    }
  };

  const handleStatusToggle = useCallback(async (checked: boolean) => {
    if (checked && task.status !== 'completed') {
      // Show loading toast
      const loadingToast = toast({
        title: "Marking task as complete...",
        description: `Updating "${task.name}"`,
        variant: "default",
      });

      try {
        // Call the status change handler
        if (onStatusChange) {
          await onStatusChange(task._id, 'completed');
        }

        // Dismiss loading toast
        loadingToast.dismiss();

        // Show success toast
        toast({
          title: "Task completed!",
          description: `"${task.name}" has been marked as complete.`,
          variant: "success",
        });
      } catch (error) {
        // Dismiss loading toast
        loadingToast.dismiss();

        // Show error toast
        toast({
          title: "Error completing task",
          description: `An error occurred while marking "${task.name}" as complete.`,
          variant: "destructive",
        });
      }
    } else if (!checked && task.status === 'completed') {
      // Handle unchecking (reverting completion)
      if (onStatusChange) {
        onStatusChange(task._id, 'in_progress');
      }
    }
  }, [task._id, task.name, task.status, onStatusChange, toast]);

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  // Define task status colors matching event cards
  const getTaskStatusColors = (status: string) => {
    const statusColors = {
      'not_started': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      'in_progress': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'blocked': 'bg-red-500/20 text-red-300 border-red-500/30',
      'under_review': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'completed': 'bg-green-500/20 text-green-300 border-green-500/30',
      'cancelled': 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    };
    return statusColors[status as keyof typeof statusColors] || statusColors['not_started'];
  };

  const getPriorityColors = (priority: string) => {
    const priorityColors = {
      'low': 'bg-green-500/20 text-green-300 border-green-500/30',
      'medium': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'high': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'urgent': 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    return priorityColors[priority as keyof typeof priorityColors] || priorityColors['medium'];
  };

  // Format due date
  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    return date.toLocaleDateString();
  };

  const cardContent = (
    <Card
      ref={ref}
      style={style}
      className={cn(
        // Base styling matching event cards
        "bg-zinc-900/50 border border-zinc-800 rounded-lg hover:bg-zinc-800/30 transition-all duration-300 ease-in-out",
        onClick && "cursor-pointer",
        draggable && "cursor-move",
        isDragging && "opacity-50 rotate-2 scale-105 shadow-2xl",
        isOverdue && "border-red-500/50 bg-red-900/20",
        variant === 'kanban' && "mb-3",
        isCompleted && "opacity-75 bg-zinc-900/30 border-zinc-700",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <CardHeader className={cn(
        "pb-3 p-6",
        variant === 'compact' && "pb-2 p-4"
      )}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Checkbox for task completion */}
            <div
              className="flex items-center justify-center p-1 -m-1 rounded hover:bg-zinc-700/50 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={task.status === 'completed'}
                onCheckedChange={handleStatusToggle}
                className="mt-1"
              />
            </div>

            <div className="flex-1 min-w-0">
              <CardTitle className={cn(
                "font-semibold text-zinc-100 truncate",
                variant === 'compact' ? 'text-sm' : 'text-base',
                (task.status === 'completed' || isCompleted) && "line-through text-zinc-400"
              )}>
                {task.name}
              </CardTitle>

              {variant !== 'compact' && task.description && (
                <CardDescription className="line-clamp-2 mt-1 text-zinc-400">
                  {task.description}
                </CardDescription>
              )}
            </div>
          </div>

          {showActions && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={16} />
            </Button>
          )}
        </div>

        {/* Status and Priority Badges */}
        <div className="flex items-center gap-2 mt-2">
          <Badge className={cn("border text-xs", getTaskStatusColors(task.status))}>
            {task.status.replace('_', ' ')}
          </Badge>
          {task.priority && (
            <Badge className={cn("border text-xs", getPriorityColors(task.priority))}>
              {task.priority}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 p-6">
        <div className="space-y-3">
          {/* Project Info */}
          {showProject && variant !== 'compact' && task.project?.name && (
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <div className="w-2 h-2 rounded-full bg-brown_sugar-400"></div>
              <span className="truncate">{task.project.name}</span>
            </div>
          )}

          {/* Task Details */}
          <div className="space-y-2">
            {task.assignedTo && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${task.assignedTo.name || task.assignedToName}`} />
                  <AvatarFallback className="text-xs bg-brown_sugar-500/20 text-brown_sugar-300">
                    {(task.assignedTo.name || task.assignedToName || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-zinc-300 truncate">
                  {task.assignedTo.name || task.assignedToName}
                </span>
              </div>
            )}

            {/* Due Date and Time Info */}
            <div className="flex items-center justify-between text-sm">
              {task.dueDate && (
                <div className={cn(
                  "flex items-center gap-1",
                  isOverdue ? "text-red-400" : "text-zinc-300"
                )}>
                  <Calendar size={14} />
                  <span>{formatDueDate(task.dueDate)}</span>
                </div>
              )}

              {task.estimatedHours && (
                <div className="flex items-center gap-1 text-zinc-300">
                  <Clock size={14} />
                  <span>{task.estimatedHours}h</span>
                </div>
              )}
            </div>

            {task.comments && task.comments.length > 0 && variant !== 'compact' && (
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <MessageSquare size={12} />
                <span>{task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Progress Bar for tasks with completion percentage */}
          {task.progress?.completionPercentage !== undefined && task.progress.completionPercentage > 0 && variant !== 'compact' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Progress</span>
                <span>{task.progress.completionPercentage}%</span>
              </div>
              <Progress
                value={task.progress.completionPercentage}
                className="h-1.5 bg-zinc-700"
              />
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && variant === 'default' && (
            <div className="flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700"
                >
                  {tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // If no onClick handler is provided, wrap with Link
  if (!onClick) {
    return (
      <Link href={`/dashboard/tasks/${task._id}`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
});

TaskCard.displayName = "TaskCard";
