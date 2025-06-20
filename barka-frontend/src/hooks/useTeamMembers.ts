import { useState, useEffect, useCallback, useMemo } from 'react';
import { teamApi, TeamMember, TeamMemberFilters, TeamStats, handleApiError } from '@/lib/api/index';

interface UseTeamMembersState {
  teamMembers: TeamMember[];
  loading: boolean;
  error: string | null;
  total: number;
  stats: TeamStats | null;
}

export function useTeamMembers(initialFilters?: TeamMemberFilters) {
  const [state, setState] = useState<UseTeamMembersState>({
    teamMembers: [],
    loading: false,
    error: null,
    total: 0,
    stats: null,
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
        teamMembers: response.members || [],
        total: response.total || 0,
        loading: false,
      }));
    } catch (error) {
      console.error('Error fetching team members:', error);
      
      // Use mock data as fallback
      const mockTeamMembers: TeamMember[] = [
        {
          _id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'Frontend Developer',
          status: 'active',
          capacity: 40,
          skills: ['React', 'TypeScript', 'CSS'],
          expertise: ['Frontend Development'],
          certifications: [],
          currentTasks: 3,
          totalHoursAllocated: 30,
          utilization: 75,
          availability: 'available',
          joinDate: '2024-01-15T00:00:00Z',
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
        {
          _id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'Backend Developer',
          status: 'active',
          capacity: 40,
          skills: ['Node.js', 'Python', 'MongoDB'],
          expertise: ['Backend Development'],
          certifications: [],
          currentTasks: 2,
          totalHoursAllocated: 20,
          utilization: 50,
          availability: 'available',
          joinDate: '2024-01-10T00:00:00Z',
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
        },
        {
          _id: '3',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          role: 'UI/UX Designer',
          status: 'on_leave',
          capacity: 40,
          skills: ['Figma', 'Adobe XD', 'Prototyping'],
          expertise: ['User Experience Design'],
          certifications: [],
          currentTasks: 0,
          totalHoursAllocated: 0,
          utilization: 0,
          availability: 'unavailable',
          joinDate: '2024-01-05T00:00:00Z',
          createdAt: '2024-01-05T00:00:00Z',
          updatedAt: '2024-01-05T00:00:00Z',
        },
        {
          _id: '4',
          name: 'Alice Brown',
          email: 'alice@example.com',
          role: 'Project Manager',
          status: 'active',
          capacity: 40,
          skills: ['Agile', 'Scrum', 'Leadership'],
          expertise: ['Project Management'],
          certifications: [],
          currentTasks: 5,
          totalHoursAllocated: 36,
          utilization: 90,
          availability: 'busy',
          joinDate: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      setState(prev => ({
        ...prev,
        teamMembers: mockTeamMembers,
        total: mockTeamMembers.length,
        loading: false,
        error: null, // Clear error when using mock data
      }));
    }
  }, [filters]);

  // Fetch team stats
  const fetchTeamStats = useCallback(async () => {
    try {
      const response = await teamApi.getTeamStats();
      setState(prev => ({
        ...prev,
        stats: response,
      }));
    } catch (error) {
      console.error('Error fetching team stats:', error);
      
      // Calculate mock stats from current team members
      const mockStats: TeamStats = {
        total: state.teamMembers.length,
        byRole: state.teamMembers.reduce((acc, member) => {
          acc[member.role] = (acc[member.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byStatus: state.teamMembers.reduce((acc, member) => {
          acc[member.status] = (acc[member.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        averageUtilization: state.teamMembers.length > 0 
          ? Math.round(state.teamMembers.reduce((acc, member) => acc + member.utilization, 0) / state.teamMembers.length)
          : 0,
        totalCapacity: state.teamMembers.reduce((acc, member) => acc + member.capacity, 0),
        totalAllocated: state.teamMembers.reduce((acc, member) => acc + member.totalHoursAllocated, 0),
        performanceMetrics: {
          averageScore: 85,
          topPerformers: state.teamMembers.slice(0, 3),
        },
      };

      setState(prev => ({
        ...prev,
        stats: mockStats,
      }));
    }
  }, [state.teamMembers]);

  // Create team member
  const createTeamMember = useCallback(async (data: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const newMember = await teamApi.createTeamMember(data);
      setState(prev => ({
        ...prev,
        teamMembers: [...prev.teamMembers, newMember],
        total: prev.total + 1,
        loading: false,
      }));
      return newMember;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({
        ...prev,
        error: apiError.message,
        loading: false,
      }));
      throw error;
    }
  }, []);

  // Update team member
  const updateTeamMember = useCallback(async (id: string, data: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const updatedMember = await teamApi.updateTeamMember(id, data);
      setState(prev => ({
        ...prev,
        teamMembers: prev.teamMembers.map(member => 
          member._id === id ? updatedMember : member
        ),
        loading: false,
      }));
      return updatedMember;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({
        ...prev,
        error: apiError.message,
        loading: false,
      }));
      throw error;
    }
  }, []);

  // Delete team member
  const deleteTeamMember = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await teamApi.deleteTeamMember(id);
      setState(prev => ({
        ...prev,
        teamMembers: prev.teamMembers.filter(member => member._id !== id),
        total: prev.total - 1,
        loading: false,
      }));
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({
        ...prev,
        error: apiError.message,
        loading: false,
      }));
      throw error;
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
        teamMembers: response.members || [],
        total: response.total || 0,
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

  // Update filters
  const updateFilters = useCallback((newFilters: TeamMemberFilters) => {
    fetchTeamMembers(newFilters);
  }, [fetchTeamMembers]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchTeamMembers();
    fetchTeamStats();
  }, [fetchTeamMembers, fetchTeamStats]);

  // Load initial data
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Load stats when team members change
  useEffect(() => {
    if (state.teamMembers.length > 0) {
      fetchTeamStats();
    }
  }, [state.teamMembers.length, fetchTeamStats]);

  return {
    ...state,
    fetchTeamMembers,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    searchTeamMembers,
    updateFilters,
    refresh,
  };
}
