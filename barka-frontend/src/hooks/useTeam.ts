"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  teamApi,
  TeamMember,
  CreateTeamMemberData,
  UpdateTeamMemberData,
  TeamMemberFilters,
  TeamStats,
  WorkloadUpdate,
  createOptimisticUpdate,
  handleApiError
} from '@/lib/api/index';

interface UseTeamState {
  members: TeamMember[];
  loading: boolean;
  error: string | null;
  total: number;
  stats: TeamStats | null;
  selectedMember: TeamMember | null;
}

interface UseTeamActions {
  fetchTeamMembers: (filters?: TeamMemberFilters) => Promise<void>;
  fetchTeamMember: (id: string) => Promise<TeamMember | null>;
  createTeamMember: (data: CreateTeamMemberData) => Promise<TeamMember | null>;
  updateTeamMember: (id: string, data: UpdateTeamMemberData) => Promise<TeamMember | null>;
  deleteTeamMember: (id: string) => Promise<boolean>;
  updateTeamMemberStatus: (id: string, status: TeamMember['status']) => Promise<TeamMember | null>;
  updateTeamMemberWorkload: (id: string, workload: WorkloadUpdate) => Promise<TeamMember | null>;
  updateTeamMemberSkills: (id: string, skills: string[], expertise: string[], certifications: string[]) => Promise<TeamMember | null>;
  searchTeamMembers: (query: string, filters?: Omit<TeamMemberFilters, 'search'>) => Promise<void>;
  getAvailableMembers: (filters?: { hoursNeeded?: number; skills?: string[]; role?: string }) => Promise<TeamMember[]>;
  fetchTeamStats: () => Promise<void>;
  refreshTeamMembers: () => Promise<void>;
  setSelectedMember: (member: TeamMember | null) => void;
  clearError: () => void;
}

export function useTeam(initialFilters?: TeamMemberFilters) {
  const [state, setState] = useState<UseTeamState>({
    members: [],
    loading: false,
    error: null,
    total: 0,
    stats: null,
    selectedMember: null,
  });

  // Memoized filters to prevent unnecessary re-renders
  const filters = useMemo(() => initialFilters || {}, [initialFilters]);

  // Fetch team members
  const fetchTeamMembers = useCallback(async (newFilters?: TeamMemberFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await teamApi.getTeamMembers(newFilters || filters);
      setState(prev => ({
        ...prev,
        members: response.members,
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
  }, [filters]);

  // Fetch single team member
  const fetchTeamMember = useCallback(async (id: string): Promise<TeamMember | null> => {
    try {
      const member = await teamApi.getTeamMember(id);
      
      // Update the member in the list if it exists
      setState(prev => ({
        ...prev,
        members: prev.members.map(m => m._id === id ? member : m),
        selectedMember: prev.selectedMember?._id === id ? member : prev.selectedMember,
      }));
      
      return member;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Create team member with optimistic update
  const createTeamMember = useCallback(async (data: CreateTeamMemberData): Promise<TeamMember | null> => {
    const tempMember: Partial<TeamMember> = {
      _id: `temp-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      status: 'active',
      capacity: data.capacity || 40,
      skills: data.skills || [],
      expertise: data.expertise || [],
      certifications: data.certifications || [],
      currentTasks: 0,
      totalHoursAllocated: 0,
      utilization: 0,
      availability: 'available',
      joinDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update
    setState(prev => ({
      ...prev,
      members: createOptimisticUpdate(prev.members, tempMember, 'create'),
      total: prev.total + 1,
    }));

    try {
      const newMember = await teamApi.createTeamMember(data);
      
      // Replace temp member with real one
      setState(prev => ({
        ...prev,
        members: prev.members.map(m => 
          m._id === tempMember._id ? newMember : m
        ),
      }));
      
      return newMember;
    } catch (error) {
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        members: prev.members.filter(m => m._id !== tempMember._id),
        total: prev.total - 1,
      }));
      
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Update team member with optimistic update
  const updateTeamMember = useCallback(async (id: string, data: UpdateTeamMemberData): Promise<TeamMember | null> => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      members: createOptimisticUpdate(prev.members, { _id: id, ...data }, 'update'),
      selectedMember: prev.selectedMember?._id === id 
        ? { ...prev.selectedMember, ...data } 
        : prev.selectedMember,
    }));

    try {
      const updatedMember = await teamApi.updateTeamMember(id, data);
      
      setState(prev => ({
        ...prev,
        members: prev.members.map(m => m._id === id ? updatedMember : m),
        selectedMember: prev.selectedMember?._id === id ? updatedMember : prev.selectedMember,
      }));
      
      return updatedMember;
    } catch (error) {
      // Revert optimistic update by refetching
      await fetchTeamMembers();
      
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, [fetchTeamMembers]);

  // Delete team member with optimistic update
  const deleteTeamMember = useCallback(async (id: string): Promise<boolean> => {
    const memberToDelete = state.members.find(m => m._id === id);
    
    // Optimistic update
    setState(prev => ({
      ...prev,
      members: createOptimisticUpdate(prev.members, { _id: id }, 'delete'),
      total: prev.total - 1,
      selectedMember: prev.selectedMember?._id === id ? null : prev.selectedMember,
    }));

    try {
      await teamApi.deleteTeamMember(id);
      return true;
    } catch (error) {
      // Revert optimistic update
      if (memberToDelete) {
        setState(prev => ({
          ...prev,
          members: createOptimisticUpdate(prev.members, memberToDelete, 'create'),
          total: prev.total + 1,
        }));
      }
      
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return false;
    }
  }, [state.members]);

  // Update team member status
  const updateTeamMemberStatus = useCallback(async (
    id: string, 
    status: TeamMember['status']
  ): Promise<TeamMember | null> => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      members: createOptimisticUpdate(prev.members, { _id: id, status }, 'update'),
      selectedMember: prev.selectedMember?._id === id 
        ? { ...prev.selectedMember, status } 
        : prev.selectedMember,
    }));

    try {
      const updatedMember = await teamApi.updateTeamMemberStatus(id, status);
      
      setState(prev => ({
        ...prev,
        members: prev.members.map(m => m._id === id ? updatedMember : m),
        selectedMember: prev.selectedMember?._id === id ? updatedMember : prev.selectedMember,
      }));
      
      return updatedMember;
    } catch (error) {
      // Revert optimistic update
      await fetchTeamMembers();
      
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, [fetchTeamMembers]);

  // Update team member workload
  const updateTeamMemberWorkload = useCallback(async (
    id: string, 
    workload: WorkloadUpdate
  ): Promise<TeamMember | null> => {
    try {
      const updatedMember = await teamApi.updateTeamMemberWorkload(id, workload);
      
      setState(prev => ({
        ...prev,
        members: prev.members.map(m => m._id === id ? updatedMember : m),
        selectedMember: prev.selectedMember?._id === id ? updatedMember : prev.selectedMember,
      }));
      
      return updatedMember;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Update team member skills
  const updateTeamMemberSkills = useCallback(async (
    id: string, 
    skills: string[], 
    expertise: string[], 
    certifications: string[]
  ): Promise<TeamMember | null> => {
    try {
      const updatedMember = await teamApi.updateTeamMemberSkills(id, skills, expertise, certifications);
      
      setState(prev => ({
        ...prev,
        members: prev.members.map(m => m._id === id ? updatedMember : m),
        selectedMember: prev.selectedMember?._id === id ? updatedMember : prev.selectedMember,
      }));
      
      return updatedMember;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Search team members
  const searchTeamMembers = useCallback(async (
    query: string, 
    searchFilters?: Omit<TeamMemberFilters, 'search'>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await teamApi.searchTeamMembers(query, searchFilters);
      setState(prev => ({
        ...prev,
        members: response.members,
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

  // Get available team members
  const getAvailableMembers = useCallback(async (filters?: { 
    hoursNeeded?: number; 
    skills?: string[]; 
    role?: string 
  }): Promise<TeamMember[]> => {
    try {
      const response = await teamApi.getAvailableTeamMembers(filters);
      return response.members;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return [];
    }
  }, []);

  // Fetch team statistics
  const fetchTeamStats = useCallback(async () => {
    try {
      const stats = await teamApi.getTeamStats();
      setState(prev => ({ ...prev, stats }));
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
    }
  }, []);

  // Refresh team members
  const refreshTeamMembers = useCallback(async () => {
    await fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Set selected member
  const setSelectedMember = useCallback((member: TeamMember | null) => {
    setState(prev => ({ ...prev, selectedMember: member }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo<UseTeamActions>(() => ({
    fetchTeamMembers,
    fetchTeamMember,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    updateTeamMemberStatus,
    updateTeamMemberWorkload,
    updateTeamMemberSkills,
    searchTeamMembers,
    getAvailableMembers,
    fetchTeamStats,
    refreshTeamMembers,
    setSelectedMember,
    clearError,
  }), [
    fetchTeamMembers,
    fetchTeamMember,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    updateTeamMemberStatus,
    updateTeamMemberWorkload,
    updateTeamMemberSkills,
    searchTeamMembers,
    getAvailableMembers,
    fetchTeamStats,
    refreshTeamMembers,
    setSelectedMember,
    clearError,
  ]);

  return {
    ...state,
    ...actions,
  };
}
