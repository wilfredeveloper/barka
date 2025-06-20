"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Home, CheckSquare, Play, Pause, Edit, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface TaskLayoutProps {
  children: React.ReactNode;
  task?: {
    id: string;
    title: string;
    status?: string;
    priority?: string;
    project?: {
      id: string;
      name: string;
    };
    assignee?: {
      id: string;
      name: string;
    };
  };
  showComments?: boolean;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export function TaskLayout({ 
  children, 
  task, 
  showComments = false, 
  breadcrumbs = [] 
}: TaskLayoutProps) {
  const pathname = usePathname();

  // Generate default breadcrumbs if none provided
  const defaultBreadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Tasks", href: "/dashboard/tasks" },
    ...(task ? [{ label: task.title, href: `/dashboard/tasks/${task.id}` }] : []),
    ...breadcrumbs
  ];

  // Task quick actions
  const taskActions = task ? [
    { label: "Edit Task", href: `/dashboard/tasks/${task.id}/edit`, icon: Edit },
    { label: "Start Timer", action: "start_timer", icon: Play },
    { label: "More Actions", action: "more", icon: MoreHorizontal },
  ] : [];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "todo": return "bg-gray-100 text-gray-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "review": return "bg-yellow-100 text-yellow-800";
      case "done": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "low": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-red-100 text-red-800";
      case "urgent": return "bg-red-200 text-red-900";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
        <Link href="/dashboard" className="flex items-center hover:text-foreground">
          <Home size={16} />
        </Link>
        {defaultBreadcrumbs.slice(1).map((crumb, index) => (
          <React.Fragment key={index}>
            <ChevronRight size={16} />
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Task Header */}
      {task && (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
                {task.status && (
                  <Badge className={getStatusColor(task.status)}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                )}
                {task.priority && (
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {task.project && (
                  <Link 
                    href={`/dashboard/projects/${task.project.id}`}
                    className="hover:text-foreground"
                  >
                    {task.project.name}
                  </Link>
                )}
                {task.assignee && (
                  <span>Assigned to {task.assignee.name}</span>
                )}
              </div>
            </div>

            {/* Task Actions */}
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/tasks/${task.id}/edit`}>
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
        </div>
      )}

      {/* Main Content */}
      <div className={showComments && task ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : ""}>
        <div className={showComments && task ? "lg:col-span-2" : ""}>
          {children}
        </div>
        
        {showComments && task && (
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Task Quick Info */}
              <div className="p-4 border rounded-lg space-y-3">
                <h3 className="font-medium">Task Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(task.status)} size="sm">
                      {task.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priority</span>
                    <Badge className={getPriorityColor(task.priority)} size="sm">
                      {task.priority}
                    </Badge>
                  </div>
                  {task.assignee && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assignee</span>
                      <span>{task.assignee.name}</span>
                    </div>
                  )}
                  {task.project && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Project</span>
                      <Link 
                        href={`/dashboard/projects/${task.project.id}`}
                        className="text-primary hover:underline"
                      >
                        {task.project.name}
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Time Tracking */}
              <div className="p-4 border rounded-lg space-y-3">
                <h3 className="font-medium">Time Tracking</h3>
                <div className="space-y-2">
                  <Button size="sm" className="w-full flex items-center gap-2">
                    <Play size={16} />
                    Start Timer
                  </Button>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Today</span>
                      <span>2.5h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span>8.5h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border rounded-lg space-y-3">
                <h3 className="font-medium">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Add Comment
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Change Status
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Log Time
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
