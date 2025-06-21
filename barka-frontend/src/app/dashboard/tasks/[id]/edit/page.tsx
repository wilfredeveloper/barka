"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { tasksApi, type Task, type UpdateTaskData } from "@/lib/api/tasks";
import { projectsApi, type Project } from "@/lib/api/projects";
import { teamApi, type TeamMember } from "@/lib/api/team";
import { clientsApi, type Client } from "@/lib/api/clients";
import { getCurrentUser } from "@/lib/auth";

// Form state interface
interface TaskFormData {
  name: string;
  description: string;
  client: string;
  project: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'not_started' | 'in_progress' | 'blocked' | 'under_review' | 'completed' | 'cancelled';
  complexity: 'simple' | 'medium' | 'complex' | 'very_complex';
  dueDate: string;
  startDate: string;
  estimatedHours: string;
  actualHours: string;
  completionPercentage: string;
  category: string;
  tags: string;
}

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    client: '',
    project: '',
    assignedTo: '',
    priority: 'medium',
    status: 'not_started',
    complexity: 'medium',
    dueDate: '',
    startDate: '',
    estimatedHours: '',
    actualHours: '',
    completionPercentage: '',
    category: '',
    tags: '',
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [loading, setLoading] = useState({
    page: true,
    clients: false,
    projects: false,
    teamMembers: false,
    submitting: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch task data
  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        setLoading(prev => ({ ...prev, page: true }));
        const taskData = await tasksApi.getTask(taskId);
        setTask(taskData);

        // Populate form with task data
        setFormData({
          name: taskData.name || '',
          description: taskData.description || '',
          client: taskData.client?._id || taskData.client || '',
          project: taskData.project?._id || taskData.project || '',
          assignedTo: taskData.assignedTo?._id || taskData.assignedTo || 'unassigned',
          priority: taskData.priority || 'medium',
          status: taskData.status || 'not_started',
          complexity: taskData.complexity || 'medium',
          dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString().split('T')[0] : '',
          startDate: taskData.startDate ? new Date(taskData.startDate).toISOString().split('T')[0] : '',
          estimatedHours: taskData.estimatedHours?.toString() || '',
          actualHours: taskData.actualHours?.toString() || '',
          completionPercentage: taskData.progress?.completionPercentage?.toString() || '',
          category: taskData.category || '',
          tags: taskData.tags?.join(', ') || '',
        });

      } catch (error: any) {
        console.error('Error fetching task:', error);
        setSubmitError(error.response?.data?.message || 'Failed to load task data');
      } finally {
        setLoading(prev => ({ ...prev, page: false }));
      }
    };

    if (taskId) {
      fetchTaskData();
    }
  }, [taskId]);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(prev => ({ ...prev, clients: true }));
        const clientsData = await clientsApi.getClients();
        setClients(clientsData.clients || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(prev => ({ ...prev, clients: false }));
      }
    };

    fetchClients();
  }, []);

  // Fetch projects when client changes
  useEffect(() => {
    const fetchProjects = async () => {
      if (!formData.client) {
        setProjects([]);
        return;
      }

      try {
        setLoading(prev => ({ ...prev, projects: true }));
        const projectsData = await projectsApi.getProjects({ clientId: formData.client });
        setProjects(projectsData.projects || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } finally {
        setLoading(prev => ({ ...prev, projects: false }));
      }
    };

    fetchProjects();
  }, [formData.client]);

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(prev => ({ ...prev, teamMembers: true }));
        const teamData = await teamApi.getTeamMembers();
        setTeamMembers(teamData.members || []);
      } catch (error) {
        console.error('Error fetching team members:', error);
      } finally {
        setLoading(prev => ({ ...prev, teamMembers: false }));
      }
    };

    fetchTeamMembers();
  }, []);

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Task description is required';
    }

    if (!formData.project) {
      newErrors.project = 'Project selection is required';
    }

    if (!formData.client) {
      newErrors.client = 'Client selection is required';
    }

    if (!currentUser?.organization) {
      newErrors.organization = 'User organization not found. Please contact support.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(prev => ({ ...prev, submitting: true }));
      setSubmitError(null);

      // Find assigned team member for name
      const assignedMember = teamMembers.find(member => member._id === formData.assignedTo);
      const isAssigned = formData.assignedTo && formData.assignedTo !== '' && formData.assignedTo !== 'unassigned';

      const updateData: UpdateTaskData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        clientId: formData.client,
        organizationId: currentUser?.organization,
        project: formData.project,
        assignedTo: isAssigned ? formData.assignedTo : undefined,
        assignedToName: isAssigned ? assignedMember?.name : undefined,
        priority: formData.priority,
        status: formData.status,
        complexity: formData.complexity,
        dueDate: formData.dueDate || undefined,
        startDate: formData.startDate || undefined,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        actualHours: formData.actualHours ? parseFloat(formData.actualHours) : undefined,
        progress: formData.completionPercentage ? {
          completionPercentage: parseFloat(formData.completionPercentage)
        } : undefined,
        category: formData.category || undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      };

      console.log("Task update data being sent to API:", updateData);

      await tasksApi.updateTask(taskId, updateData);

      // Redirect to task detail page on success
      router.push(`/dashboard/tasks/${taskId}`);
    } catch (error: any) {
      console.error('Error updating task:', error);
      setSubmitError(error.response?.data?.message || 'Failed to update task. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  // Loading state
  if (loading.page) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/tasks/${taskId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/tasks/${taskId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Task</h1>
          <p className="text-muted-foreground">
            Update task details and settings
          </p>
        </div>
      </div>

      {/* Submit Error Alert */}
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Info */}
            {currentUser?.organization && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Organization:</strong> This task belongs to your organization
                </p>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-2">
              <Label htmlFor="name">Task Title *</Label>
              <Input
                id="name"
                placeholder="Enter task title"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
                required
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Enter task description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={errors.description ? 'border-red-500' : ''}
                rows={4}
                required
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            {/* Client and Project Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Select
                  value={formData.client}
                  onValueChange={(value) => {
                    handleInputChange('client', value);
                    // Reset project when client changes
                    handleInputChange('project', '');
                  }}
                >
                  <SelectTrigger className={errors.client ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading.clients ? (
                      <SelectItem value="loading" disabled>Loading clients...</SelectItem>
                    ) : clients.length > 0 ? (
                      clients.map((client) => (
                        <SelectItem key={client._id} value={client._id}>
                          {client.user?.firstName} {client.user?.lastName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-clients" disabled>No clients available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.client && (
                  <p className="text-sm text-red-500">{errors.client}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select
                  value={formData.project}
                  onValueChange={(value) => handleInputChange('project', value)}
                  disabled={!formData.client}
                >
                  <SelectTrigger className={errors.project ? 'border-red-500' : ''}>
                    <SelectValue placeholder={formData.client ? "Select a project" : "Select a client first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loading.projects ? (
                      <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                    ) : projects.length > 0 ? (
                      projects.map((project) => (
                        <SelectItem key={project._id} value={project._id}>
                          {project.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-projects" disabled>
                        {formData.client ? "No projects available for this client" : "Select a client first"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.project && (
                  <p className="text-sm text-red-500">{errors.project}</p>
                )}
              </div>
            </div>

            {/* Assignment */}
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => handleInputChange('assignedTo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {loading.teamMembers ? (
                    <SelectItem value="loading" disabled>Loading team members...</SelectItem>
                  ) : teamMembers.length > 0 ? (
                    teamMembers.map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.name} ({member.role})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-members" disabled>No team members available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleInputChange('priority', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complexity">Complexity</Label>
                <Select
                  value={formData.complexity}
                  onValueChange={(value) => handleInputChange('complexity', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                    <SelectItem value="very_complex">Very Complex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                />
              </div>
            </div>

            {/* Time and Progress */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={formData.estimatedHours}
                  onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actualHours">Actual Hours</Label>
                <Input
                  id="actualHours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={formData.actualHours}
                  onChange={(e) => handleInputChange('actualHours', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completionPercentage">Completion %</Label>
                <Input
                  id="completionPercentage"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={formData.completionPercentage}
                  onChange={(e) => handleInputChange('completionPercentage', e.target.value)}
                />
              </div>
            </div>

            {/* Category and Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Development, Design, Testing"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="Enter tags separated by commas"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple tags with commas (e.g., urgent, frontend, bug-fix)
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <Link href={`/dashboard/tasks/${taskId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading.submitting}
                className="flex items-center gap-2"
              >
                {loading.submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Update Task
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
