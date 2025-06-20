"use client";

import React, { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  rectIntersection,
  KeyboardSensor,
  TouchSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskCard } from "./TaskCard";
import { KanbanTaskCard } from "./KanbanTaskCard";
import type { Task } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Kanban column configuration - matches backend Task status enum exactly
const KANBAN_COLUMNS = [
  {
    id: "not_started",
    title: "To Do",
    description: "Tasks ready to be started",
    color: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  },
  {
    id: "in_progress",
    title: "In Progress",
    description: "Tasks currently being worked on",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    id: "blocked",
    title: "Blocked",
    description: "Tasks that are blocked or waiting",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  {
    id: "under_review",
    title: "Review",
    description: "Tasks under review or testing",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    id: "completed",
    title: "Done",
    description: "Completed tasks",
    color: "bg-green-500/20 text-green-300 border-green-500/30",
  },
  {
    id: "cancelled",
    title: "Cancelled",
    description: "Cancelled or abandoned tasks",
    color: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  },
] as const;

export interface KanbanBoardProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: string, newStatus: Task['status']) => Promise<void>;
  onTaskClick?: (task: Task) => void;
  loading?: boolean;
  className?: string;
}

// Sortable Task Card Component
interface SortableTaskCardProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
}

function SortableTaskCard({ task, onTaskClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: {
      type: "task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <KanbanTaskCard
      ref={setNodeRef}
      style={style}
      task={task}
      isDragging={isDragging}
      onClick={onTaskClick}
      className="touch-none"
      role="button"
      tabIndex={0}
      aria-label={`Task: ${task.name}. Status: ${task.status}. ${task.assignedTo ? `Assigned to: ${task.assignedTo.name}` : 'Unassigned'}`}
      {...attributes}
      {...listeners}
    />
  );
}

// Droppable Column Component
interface KanbanColumnProps {
  column: typeof KANBAN_COLUMNS[number];
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

function KanbanColumn({ column, tasks, onTaskClick }: KanbanColumnProps) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full flex flex-col",
        isOver && "ring-2 ring-brown_sugar-500/50 rounded-lg"
      )}
    >
      <Card
        className={cn(
          "h-full flex flex-col bg-zinc-900/50 border-zinc-800 transition-all duration-200",
          isOver && "bg-brown_sugar-500/10 border-brown_sugar-500/50 shadow-lg"
        )}
        role="region"
        aria-label={`${column.title} column with ${tasks.length} tasks`}
      >
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-100">
            {column.title}
          </CardTitle>
          <Badge className={cn("border text-xs", column.color)}>
            {tasks.length}
          </Badge>
        </div>
        <p className="text-xs text-zinc-400">{column.description}</p>
      </CardHeader>
      
      <CardContent className="flex-1 p-3 pt-0">
        <div className="h-full overflow-y-auto">
          <SortableContext
            items={tasks.map(task => task._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 min-h-full">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  No {column.title.toLowerCase()} tasks
                </div>
              ) : (
                tasks.map((task) => (
                  <SortableTaskCard
                    key={task._id}
                    task={task}
                    onTaskClick={onTaskClick}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </div>
      </CardContent>
      </Card>
    </div>
  );
}

export function KanbanBoard({
  tasks,
  onTaskStatusChange,
  onTaskClick,
  loading = false,
  className,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  // Custom collision detection that prioritizes column drop zones
  const customCollisionDetection = useCallback((args: any) => {
    // First, try to find column intersections
    const columnIntersections = rectIntersection({
      ...args,
      droppableContainers: args.droppableContainers.filter((container: any) =>
        KANBAN_COLUMNS.some(col => col.id === container.id)
      )
    });

    if (columnIntersections.length > 0) {
      return columnIntersections;
    }

    // Fallback to default collision detection
    return rectIntersection(args);
  }, []);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by status
  const tasksByStatus = KANBAN_COLUMNS.reduce((acc, column) => {
    acc[column.id] = tasks.filter(task => task.status === column.id);
    return acc;
  }, {} as Record<string, Task[]>);

  // Debug logging to help identify issues
  React.useEffect(() => {
    console.log('🔍 KanbanBoard Debug Info:');
    console.log('📋 Total tasks:', tasks.length);
    console.log('📊 Tasks by status:', tasksByStatus);
    console.log('🎯 Registered drop zones:', KANBAN_COLUMNS.map(col => col.id));

    // Log task distribution
    KANBAN_COLUMNS.forEach(column => {
      const columnTasks = tasksByStatus[column.id] || [];
      console.log(`📂 ${column.title}: ${columnTasks.length} tasks`, columnTasks.map(t => t.name));
    });

    // Check for tasks with unmatched statuses
    const allColumnStatuses = KANBAN_COLUMNS.map(col => col.id);
    const unmatchedTasks = tasks.filter(task => !allColumnStatuses.includes(task.status));
    if (unmatchedTasks.length > 0) {
      console.warn('⚠️ Tasks with unmatched statuses:', unmatchedTasks.map(t => ({ id: t._id, name: t.name, status: t.status })));
    }
  }, [tasks, tasksByStatus]);



  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task;
    if (task) {
      setActiveTask(task);
      console.log('🎯 Drag started:', task.name, 'from status:', task.status);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      console.log('🚫 No drop target detected');
      return;
    }

    const activeTask = active.data.current?.task;
    const overColumn = over.data.current?.column;

    console.log('🎯 Drag over:', {
      activeTask: activeTask?.name,
      overColumn: overColumn?.title,
      overId: over.id
    });
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    console.log('🎯 Drag ended:', {
      active: active.id,
      over: over?.id,
      activeData: active.data.current,
      overData: over?.data.current
    });

    if (!over) {
      console.log('🚫 No drop target - drag cancelled');
      return;
    }

    const activeTask = active.data.current?.task;
    const overColumn = over.data.current?.column;

    console.log('🔍 Drop analysis:', {
      activeTask: activeTask?.name,
      activeTaskStatus: activeTask?.status,
      overColumn: overColumn?.title,
      overColumnId: overColumn?.id
    });

    if (!activeTask || !overColumn) {
      console.warn('⚠️ Missing task or column data:', { activeTask: !!activeTask, overColumn: !!overColumn });
      return;
    }

    // If the task is dropped in the same column, do nothing
    if (activeTask.status === overColumn.id) return;

    const newStatus = overColumn.id as Task['status'];

    console.log('🔄 Drag & Drop Status Change:');
    console.log('📝 Task:', activeTask.name);
    console.log('📊 From:', activeTask.status, '→ To:', newStatus);

    try {
      setIsUpdating(activeTask._id);
      console.log('🚀 Calling onTaskStatusChange...');
      await onTaskStatusChange(activeTask._id, newStatus);
      console.log('✅ Status change completed successfully');



      toast({
        title: "Task updated",
        description: `"${activeTask.name}" moved to ${overColumn.title}`,
      });

      // Announce to screen readers
      const announcement = `Task "${activeTask.name}" moved to ${overColumn.title} column`;
      const ariaLiveRegion = document.createElement('div');
      ariaLiveRegion.setAttribute('aria-live', 'polite');
      ariaLiveRegion.setAttribute('aria-atomic', 'true');
      ariaLiveRegion.className = 'sr-only';
      ariaLiveRegion.textContent = announcement;
      document.body.appendChild(ariaLiveRegion);
      setTimeout(() => document.body.removeChild(ariaLiveRegion), 1000);
    } catch (error) {
      console.error("Failed to update task status:", error);
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  }, [onTaskStatusChange, toast, tasks]);

  if (loading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4", className)}>
        {KANBAN_COLUMNS.map((column) => (
          <Card key={column.id} className="h-96 bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-4 bg-zinc-700 rounded w-20 mb-2"></div>
                <div className="h-3 bg-zinc-700 rounded w-32"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-zinc-800 rounded animate-pulse"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "grid gap-4 h-[calc(100vh-12rem)]",
          "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
          "lg:overflow-x-auto lg:min-w-max",
          className
        )}
        role="application"
        aria-label="Kanban board for task management"
      >
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id] || []}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <KanbanTaskCard
            task={activeTask}
            isDragging
            className="rotate-2 shadow-2xl"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
