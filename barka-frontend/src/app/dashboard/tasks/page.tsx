"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Plus, Search, Filter, List, Kanban, Grid, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskCard } from "@/components/task/TaskCard";
import { CompletedTasksSection } from "@/components/task/CompletedTasksSection";
import { KanbanBoard } from "@/components/task/KanbanBoard";
import { TaskLayout } from "@/components/layouts/TaskLayout";
import { useTasks } from "@/hooks/useTasks";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TasksPage() {
  const [view, setView] = useState<"list" | "cards" | "kanban">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Use the useTasks hook to fetch real data
  const {
    tasks,
    loading,
    error,
    fetchTasks,
    updateTaskStatus,
    markTaskComplete,
    searchTasks,
    clearError
  } = useTasks();

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim()) {
      searchTasks(query);
    } else {
      fetchTasks();
    }
  };

  // Handle task status change
  const handleTaskStatusChange = async (taskId: string, newStatus: any) => {
    try {
      if (newStatus === 'completed') {
        // Use the markTaskComplete function for completion to get optimistic updates
        await markTaskComplete(taskId);
      } else {
        // Use regular updateTaskStatus for other status changes
        await updateTaskStatus(taskId, newStatus);
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error; // Re-throw so TaskCard can handle the error
    }
  };

  // Handle task navigation
  const handleTaskClick = (task: any) => {
    router.push(`/dashboard/tasks/${task._id}`);
  };

  // Map backend status to frontend status for filtering
  const mapStatus = (status: string) => {
    switch (status) {
      case "not_started": return "todo";
      case "in_progress": return "in_progress";
      case "under_review": return "review";
      case "completed": return "completed";
      case "blocked": return "blocked";
      case "cancelled": return "cancelled";
      default: return status;
    }
  };

  // Get tasks by status for kanban view
  const getTasksByStatus = (status: string) => {
    return (tasks || []).filter(task => mapStatus(task.status) === status);
  };

  // Separate active and completed tasks
  const activeTasks = (tasks || []).filter(task => task.status !== 'completed');
  const completedTasks = (tasks || []).filter(task => task.status === 'completed');



  return (
    <TaskLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track all tasks across projects
          </p>
        </div>
        <Link href="/dashboard/tasks/new">
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            New Task
          </Button>
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={clearError}
              className="ml-2"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter size={16} />
            Filters
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
            className="flex items-center gap-2"
          >
            <List size={16} />
            List
          </Button>
          <Button
            variant={view === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("cards")}
            className="flex items-center gap-2"
          >
            <Grid size={16} />
            Cards
          </Button>
          <Button
            variant={view === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("kanban")}
            className="flex items-center gap-2"
          >
            <Kanban size={16} />
            Kanban
          </Button>
        </div>
      </div>

      {/* Tasks Content */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading tasks...</p>
          </CardContent>
        </Card>
      ) : view === "list" ? (
        <div className="space-y-6">
          {/* Active Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Active Tasks ({activeTasks.length})</CardTitle>
              <CardDescription>
                Tasks currently in progress or pending
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {activeTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No active tasks found.</p>
                  {searchQuery && (
                    <p className="text-sm mt-1">Try adjusting your search criteria.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      variant="compact"
                      showProject={true}
                      showActions={true}
                      onStatusChange={handleTaskStatusChange}
                      onClick={handleTaskClick}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Tasks Section */}
          <CompletedTasksSection
            completedTasks={completedTasks}
            variant="list"
            onStatusChange={handleTaskStatusChange}
            onTaskClick={handleTaskClick}
          />
        </div>
      ) : view === "cards" ? (
        <div className="space-y-6">
          {/* Active Tasks in Card Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-100">
                Active Tasks ({activeTasks.length})
              </h2>
            </div>

            {activeTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p>No active tasks found.</p>
                  {searchQuery && (
                    <p className="text-sm mt-1">Try adjusting your search criteria.</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    variant="default"
                    showProject={true}
                    showActions={true}
                    onStatusChange={handleTaskStatusChange}
                    onClick={handleTaskClick}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Completed Tasks Section for Card View */}
          <CompletedTasksSection
            completedTasks={completedTasks}
            variant="cards"
            onStatusChange={handleTaskStatusChange}
            onTaskClick={handleTaskClick}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Enhanced Kanban Board with Drag & Drop */}
          <KanbanBoard
            tasks={tasks || []}
            onTaskStatusChange={handleTaskStatusChange}
            onTaskClick={handleTaskClick}
            loading={loading}
          />
        </div>
      )}
      </div>
    </TaskLayout>
  );
}
