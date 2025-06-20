"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { Calendar, DollarSign, Users, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Project } from "@/lib/api";

export interface ProjectCardProps {
  project: Project;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  onClick?: (project: Project) => void;
  className?: string;
}

export function ProjectCard({ 
  project, 
  variant = 'default',
  showActions = true,
  onClick,
  className 
}: ProjectCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(project);
    }
  };

  const cardContent = (
    <Card 
      className={cn(
        "hover:shadow-md transition-shadow",
        onClick && "cursor-pointer",
        className
      )}
      onClick={handleClick}
    >
      <CardHeader className={variant === 'compact' ? 'pb-2' : 'pb-3'}>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className={cn(
              "truncate",
              variant === 'compact' ? 'text-base' : 'text-lg'
            )}>
              {project.name}
            </CardTitle>
            {variant !== 'compact' && (
              <CardDescription className="line-clamp-2">
                {project.description || 'No description provided'}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <StatusBadge status={project.status} type="project" />
            {showActions && (
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal size={14} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={variant === 'compact' ? 'pt-0' : ''}>
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{project.progress?.completionPercentage || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${project.progress?.completionPercentage || 0}%` }}
              />
            </div>
          </div>

          {/* Project Details */}
          <div className={cn(
            "grid gap-2 text-sm",
            variant === 'detailed' ? 'grid-cols-1' : 'grid-cols-2'
          )}>
            {project.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span className="font-medium">
                  {new Date(project.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {project.budget && variant === 'detailed' && (
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-muted-foreground" />
                <span className="text-muted-foreground">Budget:</span>
                <span className="font-medium">
                  ${project.budget.toLocaleString()}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Users size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Team:</span>
              <span className="font-medium">
                {project.teamMembers?.length || 0} members
              </span>
            </div>
          </div>

          {/* Priority and Additional Info */}
          {variant === 'detailed' && (
            <div className="flex items-center justify-between pt-2 border-t">
              <PriorityIndicator priority={project.priority} variant="icon" />
              <div className="text-xs text-muted-foreground">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // If no onClick handler is provided, wrap with Link
  if (!onClick) {
    return (
      <Link href={`/dashboard/projects/${project._id}`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
