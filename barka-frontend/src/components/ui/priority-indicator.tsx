"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface PriorityIndicatorProps {
  priority: Priority | undefined;
  variant?: 'badge' | 'icon' | 'both';
  showLabel?: boolean;
  className?: string;
}

const priorityConfig = {
  low: {
    color: 'bg-green-100 text-green-800',
    icon: ArrowDown,
    label: 'Low',
    iconColor: 'text-green-600',
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Minus,
    label: 'Medium',
    iconColor: 'text-yellow-600',
  },
  high: {
    color: 'bg-red-100 text-red-800',
    icon: ArrowUp,
    label: 'High',
    iconColor: 'text-red-600',
  },
  urgent: {
    color: 'bg-red-200 text-red-900',
    icon: AlertTriangle,
    label: 'Urgent',
    iconColor: 'text-red-700',
  },
};

export function PriorityIndicator({
  priority,
  variant = 'badge',
  showLabel = true,
  className
}: PriorityIndicatorProps) {
  const config = priorityConfig[priority];

  if (!config) {
    return (
      <Badge variant="outline" className={cn("capitalize", className)}>
        {priority || 'Unknown'}
      </Badge>
    );
  }

  const Icon = config.icon;

  if (variant === 'icon') {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Icon size={16} className={config.iconColor} />
        {showLabel && (
          <span className={cn("text-sm", config.iconColor)}>
            {config.label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'both') {
    return (
      <Badge className={cn(config.color, "flex items-center gap-1", className)}>
        <Icon size={12} />
        {showLabel && config.label}
      </Badge>
    );
  }

  // Default badge variant
  return (
    <Badge className={cn(config.color, className)}>
      {showLabel ? config.label : priority}
    </Badge>
  );
}
