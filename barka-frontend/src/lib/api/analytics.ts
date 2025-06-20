import api from '../api';

export interface DashboardData {
  projects: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
  };
  team: {
    total: number;
    active: number;
    averageUtilization: number;
    topPerformers: Array<{
      id: string;
      name: string;
      score: number;
    }>;
  };
  recentActivity: Array<{
    id: string;
    type: 'project' | 'task' | 'team';
    action: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
}

export interface ProjectAnalytics {
  overview: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    averageCompletionTime: number;
  };
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  completionTrends: Array<{
    date: string;
    completed: number;
    started: number;
  }>;
  budgetAnalysis: {
    totalBudget: number;
    spentBudget: number;
    averageBudget: number;
    budgetUtilization: number;
  };
  timelineAnalysis: {
    onTime: number;
    delayed: number;
    averageDelay: number;
  };
}

export interface TeamAnalytics {
  overview: {
    totalMembers: number;
    activeMembers: number;
    averageUtilization: number;
    totalCapacity: number;
  };
  utilizationMetrics: Array<{
    memberId: string;
    memberName: string;
    utilization: number;
    capacity: number;
    efficiency: number;
  }>;
  performanceMetrics: Array<{
    memberId: string;
    memberName: string;
    tasksCompleted: number;
    averageTaskTime: number;
    qualityScore: number;
  }>;
  skillsDistribution: Record<string, number>;
  workloadDistribution: Array<{
    memberId: string;
    memberName: string;
    currentTasks: number;
    hoursAllocated: number;
    capacity: number;
  }>;
}

export interface TaskAnalytics {
  overview: {
    totalTasks: number;
    completedTasks: number;
    averageCompletionTime: number;
    averageTaskSize: number;
  };
  completionTrends: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  complexityAnalysis: Record<string, number>;
  bottlenecks: Array<{
    type: string;
    description: string;
    impact: number;
    suggestions: string[];
  }>;
}

export interface TimelineAnalytics {
  projectTimelines: Array<{
    projectId: string;
    projectName: string;
    startDate: string;
    dueDate: string;
    actualCompletionDate?: string;
    progress: number;
    milestones: Array<{
      name: string;
      dueDate: string;
      completedDate?: string;
      status: 'pending' | 'completed' | 'overdue';
    }>;
  }>;
  milestoneProgress: {
    total: number;
    completed: number;
    overdue: number;
    upcoming: number;
  };
  criticalPath: Array<{
    taskId: string;
    taskName: string;
    duration: number;
    dependencies: string[];
  }>;
}

export interface WorkloadAnalytics {
  teamWorkload: Array<{
    memberId: string;
    memberName: string;
    currentLoad: number;
    capacity: number;
    utilization: number;
    projectedLoad: number;
  }>;
  capacityPlanning: {
    totalCapacity: number;
    currentUtilization: number;
    projectedUtilization: number;
    recommendations: string[];
  };
  resourceAllocation: Array<{
    projectId: string;
    projectName: string;
    allocatedHours: number;
    spentHours: number;
    remainingHours: number;
  }>;
}

class AnalyticsApi {
  // Get comprehensive dashboard data
  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  // Get project analytics
  async getProjectAnalytics(timeframe?: string): Promise<ProjectAnalytics> {
    try {
      const response = await api.get('/analytics/projects/overview', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching project analytics:', error);
      throw error;
    }
  }

  // Get team performance metrics
  async getTeamAnalytics(timeframe?: string): Promise<TeamAnalytics> {
    try {
      const response = await api.get('/analytics/team/performance', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching team analytics:', error);
      throw error;
    }
  }

  // Get task completion analytics
  async getTaskAnalytics(timeframe?: string): Promise<TaskAnalytics> {
    try {
      const response = await api.get('/analytics/tasks/completion', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching task analytics:', error);
      throw error;
    }
  }

  // Get workload distribution
  async getWorkloadAnalytics(): Promise<WorkloadAnalytics> {
    try {
      const response = await api.get('/analytics/workload/distribution');
      return response.data;
    } catch (error) {
      console.error('Error fetching workload analytics:', error);
      throw error;
    }
  }

  // Get timeline and progress analytics
  async getTimelineAnalytics(): Promise<TimelineAnalytics> {
    try {
      const response = await api.get('/analytics/timeline/progress');
      return response.data;
    } catch (error) {
      console.error('Error fetching timeline analytics:', error);
      throw error;
    }
  }

  // Get custom analytics report
  async getCustomReport(config: {
    metrics: string[];
    timeframe: string;
    filters?: Record<string, any>;
    groupBy?: string;
  }) {
    try {
      const response = await api.post('/analytics/custom-report', config);
      return response.data;
    } catch (error) {
      console.error('Error fetching custom report:', error);
      throw error;
    }
  }

  // Export analytics data
  async exportAnalytics(type: string, format: 'csv' | 'xlsx' | 'pdf', filters?: Record<string, any>) {
    try {
      const response = await api.get(`/analytics/export/${type}`, {
        params: { format, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  }

  // Get real-time metrics
  async getRealTimeMetrics() {
    try {
      const response = await api.get('/analytics/real-time');
      return response.data;
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      throw error;
    }
  }

  // Get performance trends
  async getPerformanceTrends(metric: string, timeframe: string) {
    try {
      const response = await api.get('/analytics/trends', {
        params: { metric, timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      throw error;
    }
  }

  // Get predictive analytics
  async getPredictiveAnalytics(type: 'completion' | 'workload' | 'budget', projectId?: string) {
    try {
      const response = await api.get('/analytics/predictions', {
        params: { type, projectId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching predictive analytics:', error);
      throw error;
    }
  }
}

export const analyticsApi = new AnalyticsApi();
