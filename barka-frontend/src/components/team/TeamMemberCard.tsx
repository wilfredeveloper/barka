"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Mail, Phone, Calendar, CheckSquare, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { TeamMember } from "@/lib/api";

export interface TeamMemberCardProps {
  member: TeamMember;
  variant?: 'default' | 'compact' | 'detailed';
  showWorkload?: boolean;
  showActions?: boolean;
  onClick?: (member: TeamMember) => void;
  className?: string;
}

export function TeamMemberCard({ 
  member, 
  variant = 'default',
  showWorkload = true,
  showActions = true,
  onClick,
  className 
}: TeamMemberCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(member);
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return "text-red-600";
    if (utilization >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={cn(
            "bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0",
            variant === 'compact' ? 'w-8 h-8' : 'w-12 h-12'
          )}>
            <span className={cn(
              "font-semibold text-primary",
              variant === 'compact' ? 'text-xs' : 'text-sm'
            )}>
              {getInitials(member.name)}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            <CardTitle className={cn(
              "truncate",
              variant === 'compact' ? 'text-sm' : 'text-base'
            )}>
              {member.name}
            </CardTitle>
            <CardDescription className="truncate">
              {member.role}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <StatusBadge status={member.status} type="team" />
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
          {/* Contact Information */}
          {variant !== 'compact' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail size={14} />
                <span className="truncate">{member.email}</span>
              </div>
            </div>
          )}

          {/* Workload Information */}
          {showWorkload && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Tasks</span>
                <span className="font-medium">{member.currentTasks}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilization</span>
                <span className={cn(
                  "font-medium",
                  getUtilizationColor(member.utilization)
                )}>
                  {member.utilization}%
                </span>
              </div>
              
              {/* Utilization Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    member.utilization >= 90 ? "bg-red-500" :
                    member.utilization >= 70 ? "bg-yellow-500" :
                    "bg-green-500"
                  )}
                  style={{ width: `${Math.min(member.utilization, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Skills */}
          {member.skills && member.skills.length > 0 && variant !== 'compact' && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Skills</p>
              <div className="flex flex-wrap gap-1">
                {member.skills.slice(0, variant === 'detailed' ? 6 : 3).map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {member.skills.length > (variant === 'detailed' ? 6 : 3) && (
                  <Badge variant="outline" className="text-xs">
                    +{member.skills.length - (variant === 'detailed' ? 6 : 3)}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Additional Details for Detailed Variant */}
          {variant === 'detailed' && (
            <div className="space-y-2 pt-2 border-t">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <CheckSquare size={12} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Capacity:</span>
                  <span className="font-medium">{member.capacity}h/week</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Calendar size={12} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="font-medium">
                    {new Date(member.joinDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {member.performanceScore && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Performance Score</span>
                  <span className="font-medium">{member.performanceScore}/100</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {variant !== 'compact' && (
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail size={14} className="mr-1" />
                Contact
              </Button>
              {showActions && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  Assign Task
                </Button>
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
      <Link href={`/dashboard/team/${member._id}`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
