"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, MoreHorizontal, Plus, Calendar, DollarSign, Users, CheckSquare, Clock, User, FileText, Upload, Download, Trash2, Settings, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useTeam } from "@/hooks/useTeam";
import { ProjectLayout } from "@/components/layouts/ProjectLayout";
import { projectsApi } from "@/lib/api/projects";
import { Task, CreateTaskData } from "@/lib/api/tasks";
import { clientsApi } from "@/lib/api/clients";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import { AssignTeamMemberModal } from "@/components/modals/AssignTeamMemberModal";
import { DeleteProjectModal } from "@/components/modals/DeleteProjectModal";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { fetchProject, projects, loading, error, deleteProject } = useProjects();
  const { createTask, updateTaskStatus } = useTasks();
  const { members: teamMembers, fetchTeamMembers } = useTeam();
  const { toast } = useToast();

  // Local state for project-specific data
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [projectTeam, setProjectTeam] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isAssignMemberModalOpen, setIsAssignMemberModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [projectDocuments, setProjectDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  // Project settings form state
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    startDate: '',
    dueDate: '',
    priority: 'medium',
    budget: '',
    currency: 'USD',
    clientId: ''
  });

  // Client assignment state
  const [organizationClients, setOrganizationClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);

  // User authentication state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Find the current project in the list or fetch it
  const currentProject = projects.find(p => p._id === projectId);

  // Check user authentication and role
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setIsAdmin(user.role === 'org_admin' || user.role === 'super_admin');
    }
  }, []);

  useEffect(() => {
    if (!currentProject && projectId) {
      fetchProject(projectId);
    }
  }, [projectId, currentProject, fetchProject]);

  // Fetch project tasks
  const fetchProjectTasks = async () => {
    if (!projectId) return;

    setTasksLoading(true);
    setTasksError(null);
    try {
      const response = await projectsApi.getProjectTasks(projectId);
      setProjectTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      const errorMessage = 'Failed to load project tasks';
      setTasksError(errorMessage);
      toast({
        title: "Error loading tasks",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTasksLoading(false);
    }
  };

  // Fetch project team
  const fetchProjectTeam = async () => {
    if (!projectId) return;

    setTeamLoading(true);
    setTeamError(null);
    try {
      const response = await projectsApi.getProjectTeam(projectId);
      console.log('Raw API response:', response);

      // Backend returns { success: true, data: { teamMembers: [...] } }
      const teamMembers = response.data?.teamMembers || [];
      console.log('Extracted team members:', teamMembers);
      console.log('Team members count:', teamMembers.length);

      setProjectTeam(teamMembers);
    } catch (error) {
      console.error('Error fetching project team:', error);
      const errorMessage = 'Failed to load project team';
      setTeamError(errorMessage);
      toast({
        title: "Error loading team",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTeamLoading(false);
    }
  };

  // Fetch project documents
  const fetchProjectDocuments = async () => {
    if (!projectId) return;

    setDocumentsLoading(true);
    setDocumentsError(null);
    try {
      // TODO: Replace with actual API call when documents API is available
      // const response = await projectsApi.getProjectDocuments(projectId);
      // setProjectDocuments(response.data || []);

      // For now, set empty array since no real documents API exists
      setProjectDocuments([]);
    } catch (error) {
      console.error('Error fetching project documents:', error);
      const errorMessage = 'Failed to load project documents';
      setDocumentsError(errorMessage);
      toast({
        title: "Error loading documents",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Fetch organization clients for assignment dropdown
  const fetchOrganizationClients = async () => {
    setClientsLoading(true);
    setClientsError(null);
    try {
      const response = await clientsApi.getClients();
      setOrganizationClients(response.clients || []);
    } catch (error) {
      console.error('Error fetching organization clients:', error);
      const errorMessage = 'Failed to load clients';
      setClientsError(errorMessage);
      toast({
        title: "Error loading clients",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setClientsLoading(false);
    }
  };

  // Load project-specific data when project is available
  useEffect(() => {
    if (currentProject) {
      fetchProjectTasks();
      fetchProjectTeam();
      fetchProjectDocuments();

      // Only fetch clients for admin users
      if (isAdmin) {
        fetchOrganizationClients();
      }

      // Initialize settings form data
      setSettingsFormData({
        name: currentProject.name || '',
        description: currentProject.description || '',
        status: currentProject.status || 'planning',
        startDate: currentProject.startDate ? new Date(currentProject.startDate).toISOString().split('T')[0] : '',
        dueDate: currentProject.dueDate ? new Date(currentProject.dueDate).toISOString().split('T')[0] : '',
        priority: currentProject.priority || 'medium',
        budget: currentProject.budget?.toString() || '',
        currency: currentProject.currency || 'USD',
        clientId: typeof currentProject.client === 'object' && currentProject.client?._id ? currentProject.client._id : (typeof currentProject.client === 'string' ? currentProject.client : '')
      });
    }
  }, [currentProject, isAdmin]);

  // Task creation handler
  const handleCreateTask = async (taskData: CreateTaskData) => {
    try {
      const newTask = await createTask(taskData);
      if (newTask) {
        // Refresh project tasks
        await fetchProjectTasks();
        toast({
          title: "Task created successfully",
          description: `"${newTask.name}" has been added to the project.`,
        });
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Failed to create task",
        description: "There was an error creating the task. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Team member assignment handler
  const handleAssignTeamMembers = async (memberIds: string[]) => {
    try {
      // TODO: Implement API call to assign team members to project
      console.log('Assigning team members:', memberIds, 'to project:', projectId);

      // For now, just refresh the project team
      await fetchProjectTeam();
      toast({
        title: "Team members assigned",
        description: `${memberIds.length} team member${memberIds.length !== 1 ? 's' : ''} assigned to the project.`,
      });
    } catch (error) {
      console.error('Error assigning team members:', error);
      toast({
        title: "Failed to assign team members",
        description: "There was an error assigning team members. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Task status update handler
  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';
      const updatedTask = await updateTaskStatus(taskId, newStatus);

      if (updatedTask) {
        // Update the task in the local state
        setProjectTasks(prev =>
          prev.map(task =>
            task._id === taskId ? { ...task, status: newStatus } : task
          )
        );
        toast({
          title: "Task updated",
          description: `Task marked as ${newStatus === 'done' ? 'completed' : 'incomplete'}.`,
        });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Failed to update task",
        description: "There was an error updating the task status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Quick action handlers
  const handleAddTask = () => {
    setIsCreateTaskModalOpen(true);
  };

  const handleAddMember = () => {
    setIsAssignMemberModalOpen(true);
  };

  // Project deletion handler
  const handleDeleteProject = async (password: string, reason?: string) => {
    if (!currentProject) return;

    setIsDeleting(true);
    try {
      const result = await deleteProject(currentProject._id, password, reason);

      toast({
        title: "Project Deleted",
        description: result.message,
        variant: "success" as any,
      });

      // Redirect to projects list after successful deletion
      window.location.href = '/dashboard/projects';
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.response?.data?.message || error.message || "Failed to delete project",
        variant: "destructive",
      });
      throw error; // Re-throw to let modal handle it
    } finally {
      setIsDeleting(false);
    }
  };

  // Project settings save handler
  const handleSaveProjectSettings = async () => {
    if (!currentProject) return;

    // Validation
    if (!settingsFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    if (!settingsFormData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Project description is required",
        variant: "destructive",
      });
      return;
    }

    if (!settingsFormData.startDate) {
      toast({
        title: "Validation Error",
        description: "Start date is required",
        variant: "destructive",
      });
      return;
    }

    if (!settingsFormData.dueDate) {
      toast({
        title: "Validation Error",
        description: "Due date is required",
        variant: "destructive",
      });
      return;
    }

    // Validate that due date is after start date
    if (new Date(settingsFormData.dueDate) <= new Date(settingsFormData.startDate)) {
      toast({
        title: "Validation Error",
        description: "Due date must be after start date",
        variant: "destructive",
      });
      return;
    }

    setIsSavingSettings(true);
    try {
      const updateData: any = {
        name: settingsFormData.name.trim(),
        description: settingsFormData.description.trim(),
        status: settingsFormData.status as any,
        startDate: settingsFormData.startDate,
        dueDate: settingsFormData.dueDate,
        priority: settingsFormData.priority as any,
        budget: settingsFormData.budget ? parseFloat(settingsFormData.budget) : undefined,
        currency: settingsFormData.currency
      };

      // Only include clientId for admin users
      if (isAdmin) {
        updateData.clientId = settingsFormData.clientId || null;
      }

      const updatedProject = await projectsApi.updateProject(currentProject._id, updateData);

      // Update the project in the projects list
      await fetchProject(currentProject._id);

      toast({
        title: "Project Updated",
        description: "Project settings have been saved successfully.",
      });
    } catch (error: any) {
      console.error('Error saving project settings:', error);
      toast({
        title: "Save Failed",
        description: error.response?.data?.message || error.message || "Failed to save project settings",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };



  // Tab navigation component
  const tabNavigation = (
    <nav className="flex space-x-8">
      {[
        { id: 'overview', label: 'Overview' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'team', label: 'Team' },
        { id: 'timeline', label: 'Timeline' },
        { id: 'documents', label: 'Documents' },
        { id: 'settings', label: 'Settings' },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );

  if (loading) {
    return (
      <ProjectLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ProjectLayout>
    );
  }

  if (error) {
    return (
      <ProjectLayout>
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      </ProjectLayout>
    );
  }

  if (!currentProject) {
    return (
      <ProjectLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout
      project={{
        id: currentProject._id,
        name: currentProject.name,
        status: currentProject.status,
        teamCount: projectTeam.length,
        progress: currentProject.progress?.completionPercentage || 0,
      }}
      showSidebar={true}
      onAddTask={handleAddTask}
      onAddMember={handleAddMember}
      tabs={tabNavigation}
    >
      <div className="space-y-6">

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-semibold">
                    {currentProject.dueDate
                      ? new Date(currentProject.dueDate).toLocaleDateString()
                      : 'Not set'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-semibold">
                    {currentProject.budget
                      ? `$${currentProject.budget.toLocaleString()}`
                      : 'Not set'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Team Size</p>
                  <p className="font-semibold">
                    {projectTeam.length} member{projectTeam.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CheckSquare size={20} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="font-semibold">{currentProject.progress?.completionPercentage || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">

          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Overall Progress</span>
                        <span>{currentProject.progress?.completionPercentage || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full"
                          style={{ width: `${currentProject.progress?.completionPercentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Completed Tasks</p>
                          <p className="font-semibold">
                            {currentProject.progress?.completedTasks || 0} / {currentProject.progress?.totalTasks || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Days Remaining</p>
                          <p className="font-semibold">{currentProject.daysRemaining || 0} days</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {projectTasks.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground text-sm">No recent activity</p>
                          <p className="text-muted-foreground text-xs mt-1">Activity will appear here as tasks are completed</p>
                        </div>
                      ) : (
                        projectTasks
                          .filter(task => task.status === 'done')
                          .slice(0, 3)
                          .map((task) => (
                            <div key={task._id} className="flex items-start gap-3 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                              <div>
                                <p>Task "{task.name}" was completed</p>
                                <p className="text-muted-foreground">
                                  {task.updatedAt
                                    ? new Date(task.updatedAt).toLocaleDateString()
                                    : 'Recently'
                                  }
                                </p>
                              </div>
                            </div>
                          ))
                      )}
                      {projectTasks.filter(task => task.status === 'done').length === 0 && projectTasks.length > 0 && (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground text-sm">No completed tasks yet</p>
                          <p className="text-muted-foreground text-xs mt-1">Complete some tasks to see activity here</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Project Tasks</h3>
                <Button size="sm" onClick={handleAddTask}>
                  <Plus size={16} className="mr-2" />
                  Add Task
                </Button>
              </div>

              {tasksLoading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading tasks...</p>
                  </CardContent>
                </Card>
              ) : tasksError ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-red-600">{tasksError}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={fetchProjectTasks}>
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    {projectTasks.length === 0 ? (
                      <div className="p-8 text-center">
                        <CheckSquare size={48} className="mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
                        <p className="text-muted-foreground mb-4">Get started by creating your first task for this project.</p>
                        <Button size="sm" onClick={handleAddTask}>
                          <Plus size={16} className="mr-2" />
                          Create First Task
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {projectTasks.map((task) => (
                          <div key={task._id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                className="rounded"
                                checked={task.status === 'done'}
                                onChange={() => handleToggleTaskStatus(task._id, task.status)}
                              />
                              <div>
                                <p className="font-medium">{task.name}</p>
                                <p className="text-sm text-muted-foreground">{task.description || 'No description'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {task.assignedToName && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <User size={12} />
                                      {task.assignedToName}
                                    </div>
                                  )}
                                  {task.dueDate && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock size={12} />
                                      {new Date(task.dueDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={
                                task.status === 'done' ? "default" :
                                  task.status === 'in_progress' ? "secondary" :
                                    task.status === 'blocked' ? "destructive" :
                                      "outline"
                              }>
                                {task.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge variant={
                                task.priority === 'urgent' ? "destructive" :
                                  task.priority === 'high' ? "secondary" :
                                    "outline"
                              }>
                                {task.priority.toUpperCase()}
                              </Badge>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal size={16} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Team Members</h3>
                <Button size="sm" onClick={handleAddMember}>
                  <Plus size={16} className="mr-2" />
                  Add Member
                </Button>
              </div>

              {teamLoading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading team members...</p>
                  </CardContent>
                </Card>
              ) : teamError ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-red-600">{teamError}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={fetchProjectTeam}>
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectTeam.length === 0 ? (
                    <div className="col-span-full">
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">No team members assigned</h3>
                          <p className="text-muted-foreground mb-4">Add team members to start collaborating on this project.</p>
                          <Button size="sm" onClick={handleAddMember}>
                            <Plus size={16} className="mr-2" />
                            Add First Member
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    (Array.isArray(projectTeam) ? projectTeam : []).map((member) => (
                      <Card key={member._id || member.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          {/* Header with avatar and basic info */}
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="font-bold text-primary text-lg">
                                {member.name ? member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-lg truncate">{member.name || 'Unknown Member'}</h4>
                              <p className="text-sm text-muted-foreground capitalize">
                                {member.role?.replace('_', ' ') || 'Team Member'}
                              </p>
                              {member.email && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">{member.email}</p>
                              )}
                            </div>
                            <Badge
                              variant={member.status === 'active' ? 'default' : member.status === 'on_leave' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {member.status === 'active' ? '🟢 Active' :
                               member.status === 'on_leave' ? '🟡 On Leave' :
                               member.status === 'inactive' ? '🔴 Inactive' : 'Unknown'}
                            </Badge>
                          </div>

                          {/* Stats and info */}
                          <div className="space-y-3">
                            {/* Capacity and workload */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-muted-foreground text-xs mb-1">Capacity</p>
                                <p className="font-semibold">
                                  {member.capacity?.hoursPerWeek || 40}h/week
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {member.capacity?.availability || 'full_time'}
                                </p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-muted-foreground text-xs mb-1">Current Tasks</p>
                                <p className="font-semibold">
                                  {member.projectWorkload?.currentTasks || 0}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.projectWorkload?.totalEstimatedHours || 0}h allocated
                                </p>
                              </div>
                            </div>

                            {/* Skills */}
                            {member.skills && member.skills.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Skills</p>
                                <div className="flex flex-wrap gap-1">
                                  {member.skills.slice(0, 3).map((skill: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {member.skills.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{member.skills.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Performance indicator */}
                            {member.workload?.utilizationPercentage !== undefined && (
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <p className="text-xs text-muted-foreground">Utilization</p>
                                  <p className="text-xs font-medium">{member.workload.utilizationPercentage}%</p>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      member.workload.utilizationPercentage >= 90 ? 'bg-red-500' :
                                      member.workload.utilizationPercentage >= 70 ? 'bg-yellow-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(member.workload.utilizationPercentage, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Project Timeline</CardTitle>
                  <CardDescription>Track project milestones and progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Project Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Start Date</p>
                        <p className="font-semibold">
                          {currentProject?.startDate
                            ? new Date(currentProject.startDate).toLocaleDateString()
                            : 'Not set'
                          }
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Due Date</p>
                        <p className="font-semibold">
                          {currentProject?.dueDate
                            ? new Date(currentProject.dueDate).toLocaleDateString()
                            : 'Not set'
                          }
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Days Remaining</p>
                        <p className="font-semibold">{currentProject?.daysRemaining || 0} days</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall Progress</span>
                        <span>{currentProject?.progress?.completionPercentage || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full transition-all duration-300"
                          style={{ width: `${currentProject?.progress?.completionPercentage || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Timeline Events */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Project Milestones</h4>
                      <div className="space-y-4">
                        {/* Project Start */}
                        <div className="flex items-start gap-4">
                          <div className="w-3 h-3 bg-primary rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Project Started</p>
                              <span className="text-sm text-muted-foreground">
                                {currentProject?.startDate
                                  ? new Date(currentProject.startDate).toLocaleDateString()
                                  : 'Not started'
                                }
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">Project initialization and team setup</p>
                          </div>
                        </div>

                        {/* Task Milestones */}
                        {projectTasks.filter(task => task.status === 'done').slice(0, 3).map((task) => (
                          <div key={task._id} className="flex items-start gap-4">
                            <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">Task Completed: {task.name}</p>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(task.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{task.description || 'No description'}</p>
                            </div>
                          </div>
                        ))}

                        {/* Current Status */}
                        <div className="flex items-start gap-4">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Current Status</p>
                              <span className="text-sm text-muted-foreground">Now</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {currentProject?.progress?.inProgressTasks || 0} tasks in progress,
                              {' '}{currentProject?.progress?.notStartedTasks || 0} tasks remaining
                            </p>
                          </div>
                        </div>

                        {/* Project End */}
                        {currentProject?.dueDate && (
                          <div className="flex items-start gap-4">
                            <div className={`w-3 h-3 rounded-full mt-2 ${currentProject.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                              }`}></div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">Project Due</p>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(currentProject.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {currentProject.status === 'completed'
                                  ? 'Project completed successfully'
                                  : 'Target completion date'
                                }
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Project Documents</h3>
                <Button size="sm" onClick={() => {
                  // TODO: Open file upload modal
                  console.log('Upload document clicked');
                }}>
                  <Upload size={16} className="mr-2" />
                  Upload Document
                </Button>
              </div>

              {documentsLoading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading documents...</p>
                  </CardContent>
                </Card>
              ) : documentsError ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-red-600">{documentsError}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={fetchProjectDocuments}>
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    {projectDocuments.length === 0 ? (
                      <div className="p-8 text-center">
                        <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No documents yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Upload documents to share with your team and keep everything organized.
                          Documents help maintain project knowledge and facilitate collaboration.
                        </p>
                        <div className="space-y-2">
                          <Button size="sm" onClick={() => {
                            // TODO: Open file upload modal
                            console.log('Upload first document clicked');
                          }}>
                            <Upload size={16} className="mr-2" />
                            Upload First Document
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, MD, and images
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {projectDocuments.map((doc) => (
                          <div key={doc._id || doc.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <FileText size={20} className="text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{doc.name}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{doc.size}</span>
                                  <span>•</span>
                                  <span>Uploaded by {doc.uploadedBy || 'Unknown'}</span>
                                  <span>•</span>
                                  <span>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Unknown date'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => {
                                // TODO: Download document
                                console.log('Download document:', doc._id || doc.id);
                              }}>
                                <Download size={16} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                // TODO: Delete document
                                console.log('Delete document:', doc._id || doc.id);
                              }}>
                                <Trash2 size={16} />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal size={16} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}


            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Project Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings size={20} />
                    Project Details
                  </CardTitle>
                  <CardDescription>Update basic project information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-name">Project Name <span className="text-[#5c1a1b]">*</span></Label>
                      <Input
                        id="project-name"
                        value={settingsFormData.name}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter project name"
                        disabled={isSavingSettings}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-status">Status</Label>
                      <Select
                        value={settingsFormData.status}
                        onValueChange={(value) => setSettingsFormData(prev => ({ ...prev, status: value }))}
                        disabled={isSavingSettings}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-description">Description <span className="text-[#5c1a1b]">*</span></Label>
                    <Textarea
                      id="project-description"
                      value={settingsFormData.description}
                      onChange={(e) => setSettingsFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter project description (minimum 10 characters)"
                      rows={3}
                      disabled={isSavingSettings}
                    />
                  </div>

                  {/* Client Assignment - Only visible to admin users */}
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="assigned-client">Assigned Client</Label>
                      <Select
                        value={settingsFormData.clientId || "unassigned"}
                        onValueChange={(value) => setSettingsFormData(prev => ({
                          ...prev,
                          clientId: value === "unassigned" ? "" : value
                        }))}
                        disabled={isSavingSettings || clientsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select a client or leave unassigned"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">No Client Assigned</SelectItem>
                          {organizationClients.map((client) => (
                            <SelectItem key={client._id} value={client._id}>
                              {client.user?.firstName && client.user?.lastName
                                ? `${client.user.firstName} ${client.user.lastName} (${client.user.email})`
                                : client.user?.email || 'Unknown Client'
                              }
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {clientsError && (
                        <p className="text-sm text-red-600">{clientsError}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date <span className="text-[#5c1a1b]">*</span></Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={settingsFormData.startDate}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        disabled={isSavingSettings}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due-date">Due Date <span className="text-[#5c1a1b]">*</span></Label>
                      <Input
                        id="due-date"
                        type="date"
                        value={settingsFormData.dueDate}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                        disabled={isSavingSettings}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={settingsFormData.priority}
                        onValueChange={(value) => setSettingsFormData(prev => ({ ...prev, priority: value }))}
                        disabled={isSavingSettings}
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
                        value={settingsFormData.budget}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, budget: e.target.value }))}
                        placeholder="Enter budget amount"
                        disabled={isSavingSettings}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={settingsFormData.currency}
                        onValueChange={(value) => setSettingsFormData(prev => ({ ...prev, currency: value }))}
                        disabled={isSavingSettings}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveProjectSettings}
                      disabled={isSavingSettings}
                    >
                      <Save size={16} className="mr-2" />
                      {isSavingSettings ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  <CardDescription>Irreversible and destructive actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-red-600">Archive Project</h4>
                      <p className="text-sm text-muted-foreground">Archive this project to hide it from active projects</p>
                    </div>
                    <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                      Archive
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-red-600">Delete Project</h4>
                      <p className="text-sm text-muted-foreground">Move this project to trash. It will be automatically deleted after 7 days unless restored.</p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setIsDeleteModalOpen(true)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Project'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>


      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSubmit={handleCreateTask}
        projectId={projectId}
        teamMembers={Array.isArray(projectTeam) ? projectTeam : []}
      />

      {/* Assign Team Member Modal */}
      <AssignTeamMemberModal
        isOpen={isAssignMemberModalOpen}
        onClose={() => setIsAssignMemberModalOpen(false)}
        onAssign={handleAssignTeamMembers}
        projectId={projectId}
        currentTeamMembers={Array.isArray(projectTeam) ? projectTeam : []}
      />

      {/* Delete Project Modal */}
      <DeleteProjectModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteProject}
        projectName={currentProject?.name || ''}
        isDeleting={isDeleting}
      />
    </ProjectLayout>
  );
}
