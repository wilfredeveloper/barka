"use client";

import React, { forwardRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/api";

export interface KanbanTaskCardProps {
  task: Task;
  isDragging?: boolean;
  onClick?: (task: Task) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const KanbanTaskCard = forwardRef<HTMLDivElement, KanbanTaskCardProps>(({
  task,
  isDragging = false,
  onClick,
  className,
  style,
  ...props
}, ref) => {
  const handleClick = () => {
    if (onClick) {
      onClick(task);
    }
  };

  // Check if task is overdue
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': 'bg-green-500/20 text-green-300',
      'medium': 'bg-yellow-500/20 text-yellow-300',
      'high': 'bg-orange-500/20 text-orange-300',
      'urgent': 'bg-red-500/20 text-red-300'
    };
    return colors[priority as keyof typeof colors] || colors['medium'];
  };

  // Format due date for compact display
  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card
      ref={ref}
      style={style}
      className={cn(
        "bg-zinc-900/50 border border-zinc-800 rounded-lg hover:bg-zinc-800/30 transition-all duration-200 cursor-pointer",
        isDragging && "opacity-50 rotate-1 scale-105 shadow-2xl",
        isOverdue && "border-red-500/50 bg-red-900/10",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <CardContent className="p-3 space-y-2">
        {/* Task Title */}
        <div className="font-medium text-sm text-zinc-100 line-clamp-2 leading-tight">
          {task.name}
        </div>

        {/* Priority Badge */}
        {task.priority && task.priority !== 'medium' && (
          <Badge className={cn("text-xs px-2 py-0.5 border-0", getPriorityColor(task.priority))}>
            {task.priority}
          </Badge>
        )}

        {/* Bottom Row: Assignee, Due Date, Time */}
        <div className="flex items-center justify-between text-xs">
          {/* Assignee Avatar */}
          {task.assignedTo && (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${task.assignedTo.name || task.assignedToName}`} />
                <AvatarFallback className="text-xs bg-brown_sugar-500/20 text-brown_sugar-300">
                  {(task.assignedTo.name || task.assignedToName || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-zinc-400 truncate max-w-[60px]">
                {(task.assignedTo.name || task.assignedToName || '').split(' ')[0]}
              </span>
            </div>
          )}

          {/* Due Date and Time */}
          <div className="flex items-center gap-2 text-zinc-400">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                {isOverdue && <AlertCircle size={10} className="text-red-400" />}
                <Calendar size={10} className={isOverdue ? "text-red-400" : ""} />
                <span className={cn(
                  "text-xs",
                  isOverdue && "text-red-400 font-medium"
                )}>
                  {formatDueDate(task.dueDate)}
                </span>
              </div>
            )}
            
            {task.estimatedHours && task.estimatedHours > 0 && (
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span className="text-xs">{task.estimatedHours}h</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar (only if there's progress) */}
        {task.progress?.completionPercentage !== undefined && task.progress.completionPercentage > 0 && (
          <div className="space-y-1">
            <div className="w-full bg-zinc-700 rounded-full h-1">
              <div 
                className="bg-brown_sugar-400 h-1 rounded-full transition-all duration-300"
                style={{ width: `${task.progress.completionPercentage}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500 text-right">
              {task.progress.completionPercentage}%
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

KanbanTaskCard.displayName = "KanbanTaskCard";
