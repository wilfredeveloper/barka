// Export all project management hooks
export { useProjects } from './useProjects';
export { useTasks } from './useTasks';
export { useTeam } from './useTeam';
export { useAnalytics } from './useAnalytics';
export { useOrganizations } from './useOrganizations';
export { useClients } from './useClients';
export { useTeamMembers } from './useTeamMembers';

// Common hook utilities
export { useDebounce } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';
export { usePagination } from './usePagination';
export { useFilters } from './useFilters';

// Re-export types from API layer for convenience
export type {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectFilters,
  ProjectStats,
} from '@/lib/api/index';

export type {
  Task,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters,
  TaskComment,
  TimeEntry,
} from '@/lib/api/index';

export type {
  TeamMember,
  CreateTeamMemberData,
  UpdateTeamMemberData,
  TeamMemberFilters,
  TeamStats,
  WorkloadUpdate,
} from '@/lib/api/index';

export type {
  DashboardData,
  ProjectAnalytics,
  TeamAnalytics,
  TaskAnalytics,
  TimelineAnalytics,
  WorkloadAnalytics,
} from '@/lib/api/index';
