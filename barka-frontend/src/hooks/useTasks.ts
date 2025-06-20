"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  tasksApi,
  Task,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters,
  TaskComment,
  TimeEntry
} from '@/lib/api/tasks';
import { createOptimisticUpdate, handleApiError } from '@/lib/api/index';

interface UseTasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  total: number;
  selectedTask: Task | null;
}

interface UseTasksActions {
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  fetchTask: (id: string) => Promise<Task | null>;
  createTask: (data: CreateTaskData) => Promise<Task | null>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  updateTaskStatus: (id: string, status: Task['status'], comment?: string) => Promise<Task | null>;
  markTaskComplete: (id: string, comment?: string) => Promise<Task | null>;
  assignTask: (id: string, assignedTo: string, assignedToName: string) => Promise<Task | null>;
  updateTaskProgress: (id: string, completionPercentage: number, timeSpent?: number) => Promise<Task | null>;
  addTaskComment: (id: string, comment: TaskComment) => Promise<boolean>;
  logTaskTime: (id: string, timeEntry: TimeEntry) => Promise<boolean>;
  searchTasks: (query: string, filters?: Omit<TaskFilters, 'search'>) => Promise<void>;
  getTasksByStatus: (status: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  setSelectedTask: (task: Task | null) => void;
  clearError: () => void;
}

export function useTasks(initialFilters?: TaskFilters) {
  const [state, setState] = useState<UseTasksState>({
    tasks: [],
    loading: false,
    error: null,
    total: 0,
    selectedTask: null,
  });

  // Memoized filters to prevent unnecessary re-renders
  const filters = useMemo(() => initialFilters || {}, [initialFilters]);

  // Fetch tasks
  const fetchTasks = useCallback(async (newFilters?: TaskFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tasksApi.getTasks(newFilters || filters);
      setState(prev => ({
        ...prev,
        tasks: response.tasks,
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

  // Fetch single task
  const fetchTask = useCallback(async (id: string): Promise<Task | null> => {
    try {
      const task = await tasksApi.getTask(id);
      
      // Update the task in the list if it exists
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t._id === id ? task : t),
        selectedTask: prev.selectedTask?._id === id ? task : prev.selectedTask,
      }));
      
      return task;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Create task with optimistic update
  const createTask = useCallback(async (data: CreateTaskData): Promise<Task | null> => {
    const tempTask: Partial<Task> = {
      _id: `temp-${Date.now()}`,
      name: data.name,
      description: data.description,
      project: typeof data.project === 'string' ? { _id: data.project } : data.project,
      assignedTo: data.assignedTo ? { _id: data.assignedTo } : undefined,
      status: 'not_started',
      priority: data.priority || 'medium',
      progress: { completionPercentage: 0, timeSpent: 0, remainingWork: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update
    setState(prev => ({
      ...prev,
      tasks: createOptimisticUpdate(prev.tasks, tempTask, 'create'),
      total: prev.total + 1,
    }));

    try {
      const newTask = await tasksApi.createTask(data);
      
      // Replace temp task with real one
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => 
          t._id === tempTask._id ? newTask : t
        ),
      }));
      
      return newTask;
    } catch (error) {
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t._id !== tempTask._id),
        total: prev.total - 1,
      }));
      
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Update task
  const updateTask = useCallback(async (id: string, data: UpdateTaskData): Promise<Task | null> => {
    try {
      const updatedTask = await tasksApi.updateTask(id, data);

      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t._id === id ? updatedTask : t),
        selectedTask: prev.selectedTask?._id === id ? updatedTask : prev.selectedTask,
      }));

      return updatedTask;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Delete task with optimistic update
  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    const taskToDelete = state.tasks.find(t => t._id === id);
    
    // Optimistic update
    setState(prev => ({
      ...prev,
      tasks: createOptimisticUpdate(prev.tasks, { _id: id }, 'delete'),
      total: prev.total - 1,
      selectedTask: prev.selectedTask?._id === id ? null : prev.selectedTask,
    }));

    try {
      await tasksApi.deleteTask(id);
      return true;
    } catch (error) {
      // Revert optimistic update
      if (taskToDelete) {
        setState(prev => ({
          ...prev,
          tasks: createOptimisticUpdate(prev.tasks, taskToDelete, 'create'),
          total: prev.total + 1,
        }));
      }
      
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return false;
    }
  }, [state.tasks]);

  // Update task status with optimistic updates
  const updateTaskStatus = useCallback(async (
    id: string,
    status: Task['status'],
    comment?: string
  ): Promise<Task | null> => {
    const originalTask = state.tasks.find(t => t._id === id);
    if (!originalTask) {
      console.warn('⚠️ updateTaskStatus: Task not found:', id);
      return null;
    }

    console.log('🔄 useTasks.updateTaskStatus:', {
      taskId: id,
      taskName: originalTask.name,
      fromStatus: originalTask.status,
      toStatus: status
    });

    // Optimistic update
    const optimisticTask = { ...originalTask, status };
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t._id === id ? optimisticTask : t),
      selectedTask: prev.selectedTask?._id === id ? optimisticTask : prev.selectedTask,
    }));

    console.log('✅ Optimistic update applied');

    try {
      const updatedTask = await tasksApi.updateTaskStatus(id, status, comment);
      console.log('🎯 API call successful, updating with server data:', updatedTask.status);

      // Update with real data from server
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t._id === id ? updatedTask : t),
        selectedTask: prev.selectedTask?._id === id ? updatedTask : prev.selectedTask,
      }));

      console.log('✅ Final state update completed');
      return updatedTask;
    } catch (error) {
      console.error('❌ API call failed, reverting optimistic update:', error);

      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t._id === id ? originalTask : t),
        selectedTask: prev.selectedTask?._id === id ? originalTask : prev.selectedTask,
      }));

      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, [state.tasks]);

  // Mark task as complete with optimistic updates
  const markTaskComplete = useCallback(async (
    id: string,
    comment?: string
  ): Promise<Task | null> => {
    const originalTask = state.tasks.find(t => t._id === id);
    if (!originalTask) return null;

    // Optimistic update
    const optimisticTask = { ...originalTask, status: 'completed' as Task['status'] };
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t._id === id ? optimisticTask : t),
      selectedTask: prev.selectedTask?._id === id ? optimisticTask : prev.selectedTask,
    }));

    try {
      // Perform the API call
      const updatedTask = await tasksApi.updateTaskStatus(id, 'completed', comment);

      // Update with real data from server
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t._id === id ? updatedTask : t),
        selectedTask: prev.selectedTask?._id === id ? updatedTask : prev.selectedTask,
      }));

      return updatedTask;
    } catch (error) {
      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t._id === id ? originalTask : t),
        selectedTask: prev.selectedTask?._id === id ? originalTask : prev.selectedTask,
      }));

      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, [state.tasks]);

  // Assign task
  const assignTask = useCallback(async (
    id: string,
    assignedTo: string,
    assignedToName: string
  ): Promise<Task | null> => {
    try {
      const updatedTask = await tasksApi.assignTask(id, assignedTo, assignedToName);

      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t._id === id ? updatedTask : t),
        selectedTask: prev.selectedTask?._id === id ? updatedTask : prev.selectedTask,
      }));

      return updatedTask;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Update task progress
  const updateTaskProgress = useCallback(async (
    id: string, 
    completionPercentage: number, 
    timeSpent?: number
  ): Promise<Task | null> => {
    try {
      const updatedTask = await tasksApi.updateTaskProgress(id, completionPercentage, timeSpent);
      
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t._id === id ? updatedTask : t),
        selectedTask: prev.selectedTask?._id === id ? updatedTask : prev.selectedTask,
      }));
      
      return updatedTask;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Add task comment
  const addTaskComment = useCallback(async (id: string, comment: TaskComment): Promise<boolean> => {
    try {
      await tasksApi.addTaskComment(id, comment);
      
      // Refresh the task to get updated comments
      await fetchTask(id);
      
      return true;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return false;
    }
  }, [fetchTask]);

  // Log task time
  const logTaskTime = useCallback(async (id: string, timeEntry: TimeEntry): Promise<boolean> => {
    try {
      await tasksApi.logTaskTime(id, timeEntry);
      
      // Refresh the task to get updated time entries
      await fetchTask(id);
      
      return true;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return false;
    }
  }, [fetchTask]);

  // Search tasks
  const searchTasks = useCallback(async (
    query: string, 
    searchFilters?: Omit<TaskFilters, 'search'>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tasksApi.searchTasks(query, searchFilters);
      setState(prev => ({
        ...prev,
        tasks: response.tasks,
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

  // Get tasks by status
  const getTasksByStatus = useCallback(async (status: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await tasksApi.getTasksByStatus(status);
      setState(prev => ({
        ...prev,
        tasks: response.tasks,
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

  // Refresh tasks
  const refreshTasks = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  // Set selected task
  const setSelectedTask = useCallback((task: Task | null) => {
    setState(prev => ({ ...prev, selectedTask: task }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo<UseTasksActions>(() => ({
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    markTaskComplete,
    assignTask,
    updateTaskProgress,
    addTaskComment,
    logTaskTime,
    searchTasks,
    getTasksByStatus,
    refreshTasks,
    setSelectedTask,
    clearError,
  }), [
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    markTaskComplete,
    assignTask,
    updateTaskProgress,
    addTaskComment,
    logTaskTime,
    searchTasks,
    getTasksByStatus,
    refreshTasks,
    setSelectedTask,
    clearError,
  ]);

  return {
    ...state,
    ...actions,
  };
}
