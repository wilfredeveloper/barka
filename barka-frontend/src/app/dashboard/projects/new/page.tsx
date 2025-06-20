"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const { createProject } = useProjects();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: '',
    priority: 'medium',
    status: 'planning',
    startDate: '',
    dueDate: '',
    budget: '',
    tags: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form field changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Project description is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.description.trim().length < 10) {
      toast({
        title: "Validation Error",
        description: "Project description must be at least 10 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!formData.startDate) {
      toast({
        title: "Validation Error",
        description: "Start date is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.dueDate) {
      toast({
        title: "Validation Error",
        description: "Due date is required",
        variant: "destructive",
      });
      return;
    }

    // Validate that due date is after start date
    if (new Date(formData.dueDate) <= new Date(formData.startDate)) {
      toast({
        title: "Validation Error",
        description: "Due date must be after start date",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        clientId: formData.clientId && formData.clientId !== 'no-client' ? formData.clientId : undefined, // Send undefined if no client selected
        priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
        status: formData.status as 'planning' | 'active' | 'on_hold' | 'completed',
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      };

      const newProject = await createProject(projectData);

      if (newProject) {
        toast({
          title: "Project Created",
          description: `Project "${newProject.name}" has been created successfully`,
          variant: "success" as any,
        });

        router.push(`/dashboard/projects/${newProject._id}`);
      }
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.response?.data?.message || error.message || "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
          <p className="text-muted-foreground">
            Set up a new project for your organization
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Provide the basic information for your new project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name <span className="text-[#5c1a1b]">*</span></Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter project name"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client (Optional)</Label>
                  <Select
                    value={formData.clientId}
                    onValueChange={(value) => handleInputChange('clientId', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        clientsLoading
                          ? "Loading clients..."
                          : clients.length === 0
                            ? "No clients found in your organization"
                            : "Select a client (optional)"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsLoading ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#c57b57]" />
                            Loading clients...
                          </div>
                        </SelectItem>
                      ) : clients.length === 0 ? (
                        <SelectItem value="no-clients-available" disabled>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users size={16} />
                            No clients found in your organization
                          </div>
                        </SelectItem>
                      ) : (
                        <>
                          <SelectItem value="no-client">No client (internal project)</SelectItem>
                          {clients.map((client) => (
                            <SelectItem key={client._id} value={client._id}>
                              <div className="flex flex-col">
                                <span>{client.user.firstName} {client.user.lastName}</span>
                                <span className="text-xs text-muted-foreground">{client.user.email}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {clientsError && (
                    <p className="text-xs text-[#5c1a1b] flex items-center gap-1">
                      <AlertCircle size={12} />
                      Failed to load clients: {clientsError}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description <span className="text-[#5c1a1b]">*</span></Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the project goals and requirements (minimum 10 characters)"
                  rows={4}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date <span className="text-[#5c1a1b]">*</span></Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date <span className="text-[#5c1a1b]">*</span></Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleInputChange('priority', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => handleInputChange('budget', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (Optional)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="Enter tags separated by commas (e.g., web, mobile, urgent)"
                  disabled={isSubmitting}
                />
                <p className="text-sm text-muted-foreground">
                  Separate multiple tags with commas. You can add team members after creating the project.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex items-center gap-2"
                  disabled={isSubmitting || !formData.name.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Create Project
                    </>
                  )}
                </Button>
                <Link href="/dashboard/projects">
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
