"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/api";

interface CompletedTasksSectionProps {
  completedTasks: Task[];
  variant?: 'list' | 'cards' | 'kanban';
  onStatusChange?: (taskId: string, status: Task['status']) => void;
  onTaskClick?: (task: Task) => void;
  className?: string;
}

export function CompletedTasksSection({
  completedTasks,
  variant = 'list',
  onStatusChange,
  onTaskClick,
  className
}: CompletedTasksSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (completedTasks.length === 0) {
    return null;
  }

  return (
    <Card className={cn("mt-6", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Completed Tasks ({completedTasks.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 animate-in slide-in-from-top-2 duration-200">
          <div className={cn(
            variant === 'list' && "space-y-4",
            variant === 'kanban' && "space-y-3",
            variant === 'cards' && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          )}>
            {completedTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                variant={
                  variant === 'list' ? 'compact' :
                  variant === 'cards' ? 'default' :
                  'kanban'
                }
                showProject={variant === 'list' || variant === 'cards'}
                showActions={variant === 'list' || variant === 'cards'}
                onStatusChange={onStatusChange}
                onClick={onTaskClick}
                isCompleted={true}
                className="opacity-75 bg-zinc-900/30 border-zinc-700"
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
