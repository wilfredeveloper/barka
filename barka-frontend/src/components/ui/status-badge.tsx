"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusType = 'project' | 'task' | 'team';

export interface StatusBadgeProps {
  status: string | undefined;
  type: StatusType;
  variant?: 'default' | 'outline';
  showTooltip?: boolean;
  className?: string;
}

const statusConfig = {
  project: {
    planning: { color: 'bg-gray-100 text-gray-800', label: 'Planning' },
    active: { color: 'bg-green-100 text-green-800', label: 'Active' },
    on_hold: { color: 'bg-yellow-100 text-yellow-800', label: 'On Hold' },
    completed: { color: 'bg-blue-100 text-blue-800', label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  },
  task: {
    // Frontend status values (legacy)
    todo: { color: 'bg-gray-100 text-gray-800', label: 'To Do' },
    in_progress: { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
    review: { color: 'bg-yellow-100 text-yellow-800', label: 'Review' },
    done: { color: 'bg-green-100 text-green-800', label: 'Done' },
    blocked: { color: 'bg-red-100 text-red-800', label: 'Blocked' },
    // Backend status values
    not_started: { color: 'bg-gray-100 text-gray-800', label: 'Not Started' },
    under_review: { color: 'bg-yellow-100 text-yellow-800', label: 'Under Review' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  },
  team: {
    active: { color: 'bg-green-100 text-green-800', label: 'Active' },
    inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
    on_leave: { color: 'bg-yellow-100 text-yellow-800', label: 'On Leave' },
  },
};

export function StatusBadge({ 
  status, 
  type, 
  variant = 'default',
  showTooltip = false,
  className 
}: StatusBadgeProps) {
  const config = statusConfig[type]?.[status as keyof typeof statusConfig[typeof type]];
  
  if (!config) {
    return (
      <Badge variant={variant} className={cn("capitalize", className)}>
        {status ? status.replace('_', ' ') : 'Unknown'}
      </Badge>
    );
  }

  const badgeElement = (
    <Badge 
      variant={variant}
      className={cn(
        variant === 'default' ? config.color : '',
        "capitalize",
        className
      )}
    >
      {config.label}
    </Badge>
  );

  if (showTooltip) {
    return (
      <div className="relative group">
        {badgeElement}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {config.label}
        </div>
      </div>
    );
  }

  return badgeElement;
}
