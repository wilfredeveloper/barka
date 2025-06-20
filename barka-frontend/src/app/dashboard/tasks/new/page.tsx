"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { projectsApi, Project } from "@/lib/api/projects";
import { teamApi, TeamMember } from "@/lib/api/team";
import { clientsApi, Client } from "@/lib/api/clients";

import { tasksApi, CreateTaskData } from "@/lib/api/tasks";
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
  estimatedHours: string;
  tags: string;
}

// Loading state interface
interface LoadingState {
  projects: boolean;
  teamMembers: boolean;
  clients: boolean;
  organizations: boolean;
  submitting: boolean;
}

export default function NewTaskPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form data state
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
    estimatedHours: '',
    tags: '',
  });

  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [availableTasks, setAvailableTasks] = useState<any[]>([]);

  // Loading states
  const [loading, setLoading] = useState<LoadingState>({
    projects: false,
    teamMembers: false,
    clients: false,
    organizations: false,
    submitting: false,
  });

  // Error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');

  // Get current user on component mount
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  // Fetch initial data when user is available
  useEffect(() => {
    if (currentUser) {
      fetchInitialData();
    }
  }, [currentUser]);

  // Fetch projects when client changes
  useEffect(() => {
    if (formData.client) {
      fetchProjects();
    }
  }, [formData.client]);

  // Fetch team members when user is available (organization is from user context)
  useEffect(() => {
    if (currentUser && currentUser.organization) {
      fetchTeamMembers();
    }
  }, [currentUser]);

  // Fetch available tasks for dependencies when project changes
  useEffect(() => {
    if (formData.project) {
      fetchAvailableTasks();
    }
  }, [formData.project]);

  const fetchInitialData = async () => {
    await fetchClients();
  };



  const fetchClients = async () => {
    try {
      setLoading(prev => ({ ...prev, clients: true }));
      const response = await clientsApi.getClients();
      setClients(response.clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setErrors(prev => ({ ...prev, clients: 'Failed to load clients' }));
    } finally {
      setLoading(prev => ({ ...prev, clients: false }));
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(prev => ({ ...prev, projects: true }));
      const filters: any = {};
      if (formData.client) filters.client = formData.client;

      const response = await projectsApi.getProjects(filters);
      setProjects(response.projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setErrors(prev => ({ ...prev, projects: 'Failed to load projects' }));
    } finally {
      setLoading(prev => ({ ...prev, projects: false }));
    }
  };

  const fetchTeamMembers = async () => {
    try {
      setLoading(prev => ({ ...prev, teamMembers: true }));
      const response = await teamApi.getTeamMembers({ status: 'active' });
      setTeamMembers(response.members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setErrors(prev => ({ ...prev, teamMembers: 'Failed to load team members' }));
    } finally {
      setLoading(prev => ({ ...prev, teamMembers: false }));
    }
  };

  const fetchAvailableTasks = async () => {
    try {
      const response = await tasksApi.getTasks({
        project: formData.project,
        status: 'completed'
      });
      setAvailableTasks(response.tasks || []);
    } catch (error) {
      console.error('Error fetching available tasks:', error);
    }
  };

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Handle cascading changes
    if (field === 'client') {
      // Reset project when client changes
      setFormData(prev => ({ ...prev, project: '' }));
      setProjects([]);
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
      setSubmitError('');

      // Find assigned team member name
      const assignedMember = teamMembers.find(member => member._id === formData.assignedTo);
      const isAssigned = formData.assignedTo && formData.assignedTo !== 'unassigned';
      console.log("The following user data will be used to submit the form: ", currentUser)
      console.log("Form data client:", formData.client)
      console.log("Current user organization:", currentUser?.organization)

      const taskData: CreateTaskData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        clientId: formData.client,  // Backend expects 'clientId'
        organizationId: currentUser?.organization, // Backend expects 'organizationId'
        project: formData.project,
        assignedTo: isAssigned ? formData.assignedTo : undefined,
        assignedToName: isAssigned ? assignedMember?.name : undefined,
        priority: formData.priority,
        status: formData.status,
        complexity: formData.complexity,
        dueDate: formData.dueDate || undefined,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      };

      console.log("Task data being sent to API:", taskData);

      await tasksApi.createTask(taskData);

      // Redirect to tasks list on success
      router.push('/dashboard/tasks');
    } catch (error: any) {
      console.error('Error creating task:', error);
      setSubmitError(error.response?.data?.message || 'Failed to create task. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tasks">
          <Button variant="ghost" size="icon">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Task</h1>
          <p className="text-muted-foreground">
            Add a new task to your project
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
            <CardDescription>
              Provide the details for your new task
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Info */}
              {currentUser?.organization && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Organization:</strong> This task will be created for your organization
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
                  placeholder="Describe what needs to be done"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={errors.description ? 'border-red-500' : ''}
                  required
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description}</p>
                )}
              </div>

              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Select
                  value={formData.client}
                  onValueChange={(value) => handleInputChange('client', value)}
                >
                  <SelectTrigger className={errors.client ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading.clients ? (
                      <SelectItem value="loading" disabled>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading clients...
                      </SelectItem>
                    ) : clients.length > 0 ? (
                      clients.map((client) => (
                        <SelectItem key={client._id} value={client._id}>
                          {client.user.firstName} {client.user.lastName} ({client.user.email})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-clients" disabled>
                        No clients available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.client && (
                  <p className="text-sm text-red-500">{errors.client}</p>
                )}
              </div>

              {/* Project and Assignee Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project">Project *</Label>
                  <Select
                    value={formData.project}
                    onValueChange={(value) => handleInputChange('project', value)}
                    disabled={!formData.client}
                  >
                    <SelectTrigger className={errors.project ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {loading.projects ? (
                        <SelectItem value="loading" disabled>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading projects...
                        </SelectItem>
                      ) : projects.length > 0 ? (
                        projects.map((project) => (
                          <SelectItem key={project._id} value={project._id}>
                            {project.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-projects" disabled>
                          {formData.client ? 'No projects available' : 'Select client first'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.project && (
                    <p className="text-sm text-red-500">{errors.project}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignee">Assignee</Label>
                  <Select
                    value={formData.assignedTo}
                    onValueChange={(value) => handleInputChange('assignedTo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {loading.teamMembers ? (
                        <SelectItem value="loading" disabled>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading team members...
                        </SelectItem>
                      ) : teamMembers.length > 0 ? (
                        teamMembers.map((member) => (
                          <SelectItem key={member._id} value={member._id}>
                            {member.name} ({member.role})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-members" disabled>
                          No team members available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority, Status, and Complexity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) => handleInputChange('priority', value)}
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
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => handleInputChange('status', value)}
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
                  <Label htmlFor="complexity">Complexity</Label>
                  <Select
                    value={formData.complexity}
                    onValueChange={(value: any) => handleInputChange('complexity', value)}
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

              {/* Due Date and Estimated Hours */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.5"
                    value={formData.estimatedHours}
                    onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="Enter tags separated by commas"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  e.g., frontend, design, urgent
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex items-center gap-2"
                  disabled={loading.submitting}
                >
                  {loading.submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {loading.submitting ? 'Creating...' : 'Create Task'}
                </Button>
                <Link href="/dashboard/tasks">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
