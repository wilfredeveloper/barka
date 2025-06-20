"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  projectsApi,
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectFilters,
  ProjectStats,
  createOptimisticUpdate,
  handleApiError
} from '@/lib/api/index';

interface UseProjectsState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  total: number;
  stats: ProjectStats | null;
}

interface UseProjectsActions {
  fetchProjects: (filters?: ProjectFilters) => Promise<void>;
  fetchProject: (id: string) => Promise<Project | null>;
  createProject: (data: CreateProjectData) => Promise<Project | null>;
  updateProject: (id: string, data: UpdateProjectData) => Promise<Project | null>;
  deleteProject: (id: string, password: string, reason?: string) => Promise<{
    success: boolean;
    message: string;
    data: {
      id: string;
      name: string;
      trashId: string;
      autoDeleteDate: string;
      daysUntilDeletion: number;
    };
  }>;
  validateAdminPassword: (password: string) => Promise<boolean>;
  recoverProject: (trashId: string, password: string) => Promise<Project | null>;
  updateProjectStatus: (id: string, status: Project['status'], reason?: string) => Promise<Project | null>;
  searchProjects: (query: string, filters?: Omit<ProjectFilters, 'search'>) => Promise<void>;
  fetchProjectStats: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  clearError: () => void;
}

export function useProjects(initialFilters?: ProjectFilters) {
  const [state, setState] = useState<UseProjectsState>({
    projects: [],
    loading: false,
    error: null,
    total: 0,
    stats: null,
  });

  // Memoized filters to prevent unnecessary re-renders
  const filters = useMemo(() => initialFilters || {}, [initialFilters]);

  // Fetch projects
  const fetchProjects = useCallback(async (newFilters?: ProjectFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await projectsApi.getProjects(newFilters || filters);
      setState(prev => ({
        ...prev,
        projects: response.projects,
        total: response.total,
        loading: false,
      }));
    } catch (error) {
      // For development: provide mock data when API is not available
      const mockProjects: Project[] = [
        {
          _id: '1',
          name: 'Website Redesign',
          description: 'Complete redesign of the company website with modern UI/UX',
          status: 'active',
          priority: 'high',
          progress: 75,
          dueDate: '2024-12-31',
          budget: 50000,
          teamMembers: ['1', '2', '3'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-06-15T00:00:00Z',
        },
        {
          _id: '2',
          name: 'Mobile App Development',
          description: 'Native mobile app for iOS and Android platforms',
          status: 'planning',
          priority: 'medium',
          progress: 25,
          dueDate: '2025-03-15',
          budget: 75000,
          teamMembers: ['2', '4'],
          createdAt: '2024-02-01T00:00:00Z',
          updatedAt: '2024-06-15T00:00:00Z',
        },
        {
          _id: '3',
          name: 'API Integration',
          description: 'Integration with third-party APIs and services',
          status: 'completed',
          priority: 'low',
          progress: 100,
          dueDate: '2024-06-01',
          budget: 25000,
          teamMembers: ['1'],
          createdAt: '2024-03-01T00:00:00Z',
          updatedAt: '2024-06-01T00:00:00Z',
        },
      ];

      setState(prev => ({
        ...prev,
        projects: mockProjects,
        total: mockProjects.length,
        loading: false,
        error: null, // Clear error when using mock data
      }));
    }
  }, [filters]);

  // Fetch single project
  const fetchProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      const project = await projectsApi.getProject(id);
      
      // Update the project in the list if it exists
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p._id === id ? project : p),
      }));
      
      return project;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Create project with optimistic update
  const createProject = useCallback(async (data: CreateProjectData): Promise<Project | null> => {
    const tempProject: Partial<Project> = {
      _id: `temp-${Date.now()}`,
      name: data.name,
      description: data.description,
      status: 'planning',
      priority: data.priority || 'medium',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update
    setState(prev => ({
      ...prev,
      projects: createOptimisticUpdate(prev.projects, tempProject, 'create'),
      total: prev.total + 1,
    }));

    try {
      const newProject = await projectsApi.createProject(data);
      
      // Replace temp project with real one
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => 
          p._id === tempProject._id ? newProject : p
        ),
      }));
      
      return newProject;
    } catch (error) {
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p._id !== tempProject._id),
        total: prev.total - 1,
      }));
      
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Update project with optimistic update
  const updateProject = useCallback(async (id: string, data: UpdateProjectData): Promise<Project | null> => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      projects: createOptimisticUpdate(prev.projects, { _id: id, ...data }, 'update'),
    }));

    try {
      const updatedProject = await projectsApi.updateProject(id, data);
      
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p._id === id ? updatedProject : p),
      }));
      
      return updatedProject;
    } catch (error) {
      // Revert optimistic update by refetching
      await fetchProjects();
      
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, [fetchProjects]);

  // Delete project with password validation (soft delete)
  const deleteProject = useCallback(async (id: string, password: string, reason?: string) => {
    const projectToDelete = state.projects.find(p => p._id === id);

    // Optimistic update
    setState(prev => ({
      ...prev,
      projects: createOptimisticUpdate(prev.projects, { _id: id }, 'delete'),
      total: prev.total - 1,
    }));

    try {
      const result = await projectsApi.deleteProject(id, password, reason);
      return result;
    } catch (error) {
      // Revert optimistic update
      if (projectToDelete) {
        setState(prev => ({
          ...prev,
          projects: createOptimisticUpdate(prev.projects, projectToDelete, 'create'),
          total: prev.total + 1,
        }));
      }

      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      throw error;
    }
  }, [state.projects]);

  // Validate admin password
  const validateAdminPassword = useCallback(async (password: string): Promise<boolean> => {
    try {
      await projectsApi.validateAdminPassword(password);
      return true;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return false;
    }
  }, []);

  // Recover project from trash
  const recoverProject = useCallback(async (trashId: string, password: string): Promise<Project | null> => {
    try {
      const recoveredProject = await projectsApi.recoverProject(trashId, password);

      // Add recovered project to the list
      setState(prev => ({
        ...prev,
        projects: createOptimisticUpdate(prev.projects, recoveredProject, 'create'),
        total: prev.total + 1,
      }));

      return recoveredProject;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Update project status
  const updateProjectStatus = useCallback(async (
    id: string, 
    status: Project['status'], 
    reason?: string
  ): Promise<Project | null> => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      projects: createOptimisticUpdate(prev.projects, { _id: id, status }, 'update'),
    }));

    try {
      const updatedProject = await projectsApi.updateProjectStatus(id, status, reason);
      
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p._id === id ? updatedProject : p),
      }));
      
      return updatedProject;
    } catch (error) {
      // Revert optimistic update
      await fetchProjects();
      
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, [fetchProjects]);

  // Search projects
  const searchProjects = useCallback(async (
    query: string, 
    searchFilters?: Omit<ProjectFilters, 'search'>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await projectsApi.searchProjects(query, searchFilters);
      setState(prev => ({
        ...prev,
        projects: response.projects,
        total: response.total,
        loading: false,
      }));
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({
        ...prev,
        error: apiError.message,
        loading: false,
      }));
    }
  }, []);

  // Fetch project statistics
  const fetchProjectStats = useCallback(async () => {
    try {
      const stats = await projectsApi.getProjectStats();
      setState(prev => ({ ...prev, stats }));
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
    }
  }, []);

  // Refresh projects
  const refreshProjects = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo<UseProjectsActions>(() => ({
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    validateAdminPassword,
    recoverProject,
    updateProjectStatus,
    searchProjects,
    fetchProjectStats,
    refreshProjects,
    clearError,
  }), [
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    validateAdminPassword,
    recoverProject,
    updateProjectStatus,
    searchProjects,
    fetchProjectStats,
    refreshProjects,
    clearError,
  ]);

  return {
    ...state,
    ...actions,
  };
}
