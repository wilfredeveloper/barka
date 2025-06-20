"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Home, UserCheck, Mail, Phone, Edit, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface TeamLayoutProps {
  children: React.ReactNode;
  member?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status?: string;
    skills?: string[];
    currentTasks?: number;
    utilization?: number;
  };
  showStats?: boolean;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export function TeamLayout({ 
  children, 
  member, 
  showStats = false, 
  breadcrumbs = [] 
}: TeamLayoutProps) {
  const pathname = usePathname();

  // Generate default breadcrumbs if none provided
  const defaultBreadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Team", href: "/dashboard/team" },
    ...(member ? [{ label: member.name, href: `/dashboard/team/${member.id}` }] : []),
    ...breadcrumbs
  ];

  // Team member navigation items
  const memberNavItems = member ? [
    { label: "Profile", href: `/dashboard/team/${member.id}`, icon: UserCheck },
    { label: "Tasks", href: `/dashboard/team/${member.id}/tasks` },
    { label: "Projects", href: `/dashboard/team/${member.id}/projects` },
    { label: "Performance", href: `/dashboard/team/${member.id}/performance` },
    { label: "Settings", href: `/dashboard/team/${member.id}/settings` },
  ] : [];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "on_leave": return "bg-yellow-100 text-yellow-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getUtilizationColor = (utilization?: number) => {
    if (!utilization) return "text-gray-600";
    if (utilization >= 90) return "text-red-600";
    if (utilization >= 70) return "text-yellow-600";
    return "text-green-600";
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

      {/* Member Header */}
      {member && (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="font-semibold text-primary text-lg">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{member.name}</h1>
                  {member.status && (
                    <Badge className={getStatusColor(member.status)}>
                      {member.status.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-muted-foreground">{member.role}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail size={14} />
                    {member.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Member Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Mail size={16} className="mr-2" />
                Contact
              </Button>
              <Link href={`/dashboard/team/${member.id}/edit`}>
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

          {/* Member Navigation */}
          <div className="border-b">
            <nav className="flex space-x-8">
              {memberNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {item.icon && <item.icon size={16} />}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={showStats && member ? "grid grid-cols-1 lg:grid-cols-4 gap-6" : ""}>
        {showStats && member && (
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Member Stats */}
              <div className="p-4 border rounded-lg space-y-3">
                <h3 className="font-medium">Current Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Tasks</span>
                    <span className="font-medium">{member.currentTasks || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className={`font-medium ${getUtilizationColor(member.utilization)}`}>
                      {member.utilization || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(member.status)} size="sm">
                      {member.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                {/* Utilization Bar */}
                {member.utilization && (
                  <div className="space-y-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${member.utilization}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Skills */}
              {member.skills && member.skills.length > 0 && (
                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="font-medium">Skills</h3>
                  <div className="flex flex-wrap gap-1">
                    {member.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="p-4 border rounded-lg space-y-3">
                <h3 className="font-medium">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Mail size={16} className="mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Assign Task
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    View Schedule
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className={showStats && member ? "lg:col-span-3" : ""}>
          {children}
        </div>
      </div>
    </div>
  );
}
