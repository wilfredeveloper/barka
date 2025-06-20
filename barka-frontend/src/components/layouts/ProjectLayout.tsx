"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Home, FolderKanban } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ProjectLayoutProps {
  children: React.ReactNode;
  project?: {
    id: string;
    name: string;
    status?: string;
    teamCount?: number;
    progress?: number;
  };
  showSidebar?: boolean;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  onAddTask?: () => void;
  onAddMember?: () => void;
  tabs?: React.ReactNode;
}

export function ProjectLayout({
  children,
  project,
  showSidebar = false,
  breadcrumbs = [],
  onAddTask,
  onAddMember,
  tabs
}: ProjectLayoutProps) {
  const pathname = usePathname();

  // Generate default breadcrumbs if none provided
  const defaultBreadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Projects", href: "/dashboard/projects" },
    ...(project ? [{ label: project.name, href: `/dashboard/projects/${project.id}` }] : []),
    ...breadcrumbs
  ];

  // Remove redundant project navigation - tabs are now handled in the main project page

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

      {/* Project Header */}
      {project && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              {project.status && (
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    project.status === 'active' ? 'bg-green-500' :
                    project.status === 'completed' ? 'bg-blue-500' :
                    project.status === 'on_hold' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`} />
                  <span className="text-sm text-muted-foreground capitalize">
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* High-level Navigation Tabs */}
          {tabs && (
            <div className="border-b">
              {tabs}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className={showSidebar && project ? "grid grid-cols-1 lg:grid-cols-4 gap-6" : ""}>
        {showSidebar && project && (
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Project Quick Info */}
              <div className="p-4 border rounded-lg space-y-3">
                <h3 className="font-medium">Project Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="capitalize">{project.status?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span>{project.progress ?? 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Team</span>
                    <span>{project.teamCount ?? 0} member{project.teamCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border rounded-lg space-y-3">
                <h3 className="font-medium">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={onAddTask}
                    disabled={!onAddTask}
                  >
                    Add Task
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={onAddMember}
                    disabled={!onAddMember}
                  >
                    Add Member
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className={showSidebar && project ? "lg:col-span-3" : ""}>
          {children}
        </div>
      </div>
    </div>
  );
}
