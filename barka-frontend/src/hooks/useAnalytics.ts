"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  analyticsApi,
  DashboardData,
  ProjectAnalytics,
  TeamAnalytics,
  TaskAnalytics,
  TimelineAnalytics,
  WorkloadAnalytics,
  handleApiError
} from '@/lib/api/index';

interface UseAnalyticsState {
  dashboardData: DashboardData | null;
  projectAnalytics: ProjectAnalytics | null;
  teamAnalytics: TeamAnalytics | null;
  taskAnalytics: TaskAnalytics | null;
  timelineAnalytics: TimelineAnalytics | null;
  workloadAnalytics: WorkloadAnalytics | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface UseAnalyticsActions {
  fetchDashboardData: () => Promise<void>;
  fetchProjectAnalytics: (timeframe?: string) => Promise<void>;
  fetchTeamAnalytics: (timeframe?: string) => Promise<void>;
  fetchTaskAnalytics: (timeframe?: string) => Promise<void>;
  fetchTimelineAnalytics: () => Promise<void>;
  fetchWorkloadAnalytics: () => Promise<void>;
  fetchAllAnalytics: (timeframe?: string) => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  exportAnalytics: (type: string, format: 'csv' | 'xlsx' | 'pdf', filters?: Record<string, any>) => Promise<Blob | null>;
  clearError: () => void;
}

export function useAnalytics(autoRefresh: boolean = false, refreshInterval: number = 300000) {
  const [state, setState] = useState<UseAnalyticsState>({
    dashboardData: null,
    projectAnalytics: null,
    teamAnalytics: null,
    taskAnalytics: null,
    timelineAnalytics: null,
    workloadAnalytics: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const dashboardData = await analyticsApi.getDashboardData();
      setState(prev => ({
        ...prev,
        dashboardData,
        loading: false,
        lastUpdated: new Date().toISOString(),
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

  // Fetch project analytics
  const fetchProjectAnalytics = useCallback(async (timeframe?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const projectAnalytics = await analyticsApi.getProjectAnalytics(timeframe);
      setState(prev => ({
        ...prev,
        projectAnalytics,
        loading: false,
        lastUpdated: new Date().toISOString(),
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

  // Fetch team analytics
  const fetchTeamAnalytics = useCallback(async (timeframe?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const teamAnalytics = await analyticsApi.getTeamAnalytics(timeframe);
      setState(prev => ({
        ...prev,
        teamAnalytics,
        loading: false,
        lastUpdated: new Date().toISOString(),
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

  // Fetch task analytics
  const fetchTaskAnalytics = useCallback(async (timeframe?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const taskAnalytics = await analyticsApi.getTaskAnalytics(timeframe);
      setState(prev => ({
        ...prev,
        taskAnalytics,
        loading: false,
        lastUpdated: new Date().toISOString(),
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

  // Fetch timeline analytics
  const fetchTimelineAnalytics = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const timelineAnalytics = await analyticsApi.getTimelineAnalytics();
      setState(prev => ({
        ...prev,
        timelineAnalytics,
        loading: false,
        lastUpdated: new Date().toISOString(),
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

  // Fetch workload analytics
  const fetchWorkloadAnalytics = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const workloadAnalytics = await analyticsApi.getWorkloadAnalytics();
      setState(prev => ({
        ...prev,
        workloadAnalytics,
        loading: false,
        lastUpdated: new Date().toISOString(),
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

  // Fetch all analytics data
  const fetchAllAnalytics = useCallback(async (timeframe?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [
        dashboardData,
        projectAnalytics,
        teamAnalytics,
        taskAnalytics,
        timelineAnalytics,
        workloadAnalytics,
      ] = await Promise.all([
        analyticsApi.getDashboardData(),
        analyticsApi.getProjectAnalytics(timeframe),
        analyticsApi.getTeamAnalytics(timeframe),
        analyticsApi.getTaskAnalytics(timeframe),
        analyticsApi.getTimelineAnalytics(),
        analyticsApi.getWorkloadAnalytics(),
      ]);

      setState(prev => ({
        ...prev,
        dashboardData,
        projectAnalytics,
        teamAnalytics,
        taskAnalytics,
        timelineAnalytics,
        workloadAnalytics,
        loading: false,
        lastUpdated: new Date().toISOString(),
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

  // Refresh analytics (alias for fetchAllAnalytics)
  const refreshAnalytics = useCallback(async () => {
    await fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  // Export analytics data
  const exportAnalytics = useCallback(async (
    type: string, 
    format: 'csv' | 'xlsx' | 'pdf', 
    filters?: Record<string, any>
  ): Promise<Blob | null> => {
    try {
      const blob = await analyticsApi.exportAnalytics(type, format, filters);
      return blob;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchDashboardData();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchDashboardData]);

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo<UseAnalyticsActions>(() => ({
    fetchDashboardData,
    fetchProjectAnalytics,
    fetchTeamAnalytics,
    fetchTaskAnalytics,
    fetchTimelineAnalytics,
    fetchWorkloadAnalytics,
    fetchAllAnalytics,
    refreshAnalytics,
    exportAnalytics,
    clearError,
  }), [
    fetchDashboardData,
    fetchProjectAnalytics,
    fetchTeamAnalytics,
    fetchTaskAnalytics,
    fetchTimelineAnalytics,
    fetchWorkloadAnalytics,
    fetchAllAnalytics,
    refreshAnalytics,
    exportAnalytics,
    clearError,
  ]);

  // Computed values
  const computedValues = useMemo(() => ({
    hasData: !!(state.dashboardData || state.projectAnalytics || state.teamAnalytics),
    isStale: state.lastUpdated 
      ? (Date.now() - new Date(state.lastUpdated).getTime()) > refreshInterval 
      : true,
    totalProjects: state.dashboardData?.projects.total || 0,
    totalTasks: state.dashboardData?.tasks.total || 0,
    totalTeamMembers: state.dashboardData?.team.total || 0,
    overallCompletionRate: state.dashboardData 
      ? Math.round((state.dashboardData.projects.completionRate + state.dashboardData.tasks.completionRate) / 2)
      : 0,
  }), [state, refreshInterval]);

  return {
    ...state,
    ...actions,
    ...computedValues,
  };
}
