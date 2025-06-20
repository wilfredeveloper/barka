"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Mail, Phone, Users } from "lucide-react";
import Link from "next/link";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { TeamLayout } from "@/components/layouts/TeamLayout";
import { useTeamMembers } from "@/hooks/useTeamMembers";

export default function TeamPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});

  const {
    teamMembers,
    loading,
    error,
    total,
    stats,
    searchTeamMembers,
    updateFilters,
    refresh
  } = useTeamMembers();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      await searchTeamMembers(query, filters);
    } else {
      refresh();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "on_leave": return "bg-yellow-100 text-yellow-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return "text-red-600";
    if (utilization >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <TeamLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">
            Manage your organization's team members and their workload
          </p>
        </div>
        <Link href="/dashboard/team/new">
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            Add Team Member
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats?.total || teamMembers.length}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats?.byStatus?.active || teamMembers.filter(m => m.status === "active").length}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {stats?.byStatus?.on_leave || teamMembers.filter(m => m.status === "on_leave").length}
              </p>
              <p className="text-sm text-muted-foreground">On Leave</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {stats?.averageUtilization ||
                  (teamMembers.length > 0
                    ? Math.round(teamMembers.reduce((acc, m) => acc + m.utilization, 0) / teamMembers.length)
                    : 0
                  )
                }%
              </p>
              <p className="text-sm text-muted-foreground">Avg Utilization</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter size={16} />
          Filters
        </Button>
      </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading team members...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button variant="outline" onClick={refresh}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Team Members Grid */}
        {!loading && !error && (
          <>
            {teamMembers.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Users size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start building your team by adding your first member
                </p>
                <Link href="/dashboard/team/new">
                  <Button>Add Team Member</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamMembers.map((member) => (
                  <TeamMemberCard
                    key={member._id}
                    member={member}
                    variant="default"
                    showWorkload={true}
                    showActions={true}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </TeamLayout>
  );
}
