"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";
import { useProjects } from "@/hooks/useProjects";
import { useDebounce } from "@/hooks/useDebounce";
import { ProjectLayout } from "@/components/layouts/ProjectLayout";
import { ProjectCard } from "@/components/project/ProjectCard";

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    projects,
    loading,
    error,
    total,
    searchProjects,
    clearError,
  } = useProjects();

  // Handle search
  React.useEffect(() => {
    if (debouncedSearch) {
      searchProjects(debouncedSearch);
    }
  }, [debouncedSearch, searchProjects]);



  return (
    <ProjectLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage and track all your organization's projects ({total} total)
            </p>
          </div>
          <Link href="/dashboard/projects/new">
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              New Project
            </Button>
          </Link>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex justify-between items-center">
              <p className="text-red-800">{error}</p>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && projects && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                variant="default"
                showActions={true}
              />
            ))}
          </div>
        )}

        {/* Empty State (when no projects) */}
        {!loading && projects && projects.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Plus size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try adjusting your search terms or filters'
                : 'Get started by creating your first project'
              }
            </p>
            {!searchQuery && (
              <Link href="/dashboard/projects/new">
                <Button>Create Project</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </ProjectLayout>
  );
}
