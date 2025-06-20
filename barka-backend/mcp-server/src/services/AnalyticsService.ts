import { Types } from 'mongoose';
import { MCPResponse } from '../types/index.js';
import { getModels } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export class AnalyticsService {
  private models = getModels();

  /**
   * Get project progress analytics
   */
  async getProjectProgress(
    clientId?: string, 
    organizationId?: string, 
    projectId?: string,
    dateRange?: { start_date: Date; end_date: Date },
    groupBy: string = 'week'
  ): Promise<MCPResponse<any>> {
    try {
      logger.info('Getting project progress analytics', { clientId, organizationId, projectId, groupBy });

      const query: any = { isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;
      if (projectId) query._id = projectId;

      // Get projects with progress data
      const projects = await this.models.Project
        .find(query)
        .populate('teamMembers', 'name email role')
        .sort({ updatedAt: -1 });

      const analytics = {
        summary: {
          total_projects: projects.length,
          active_projects: projects.filter((p: any) => p.status === 'active').length,
          completed_projects: projects.filter((p: any) => p.status === 'completed').length,
          overdue_projects: projects.filter((p: any) => p.dueDate && p.dueDate < new Date() && p.status !== 'completed').length,
          average_completion: projects.reduce((sum: number, p: any) => sum + (p.progress?.completionPercentage || 0), 0) / projects.length || 0
        },
        by_status: {} as any,
        by_priority: {} as any,
        progress_distribution: {
          not_started: 0,
          in_progress: 0,
          near_completion: 0,
          completed: 0
        },
        timeline_data: [] as any[]
      };

      // Group by status
      const statusGroups = projects.reduce((acc: any, project: any) => {
        const status = project.status;
        if (!acc[status]) acc[status] = [];
        acc[status].push(project);
        return acc;
      }, {});

      Object.keys(statusGroups).forEach(status => {
        analytics.by_status[status] = {
          count: statusGroups[status].length,
          average_completion: statusGroups[status].reduce((sum: number, p: any) => sum + (p.progress?.completionPercentage || 0), 0) / statusGroups[status].length || 0,
          projects: statusGroups[status].map((p: any) => ({
            id: p._id,
            name: p.name,
            completion: p.progress?.completionPercentage || 0,
            dueDate: p.dueDate
          }))
        };
      });

      // Group by priority
      const priorityGroups = projects.reduce((acc: any, project: any) => {
        const priority = project.priority;
        if (!acc[priority]) acc[priority] = [];
        acc[priority].push(project);
        return acc;
      }, {});

      Object.keys(priorityGroups).forEach(priority => {
        analytics.by_priority[priority] = {
          count: priorityGroups[priority].length,
          average_completion: priorityGroups[priority].reduce((sum: number, p: any) => sum + (p.progress?.completionPercentage || 0), 0) / priorityGroups[priority].length || 0
        };
      });

      // Progress distribution
      projects.forEach((project: any) => {
        const completion = project.progress?.completionPercentage || 0;
        if (completion === 0) analytics.progress_distribution.not_started++;
        else if (completion < 80) analytics.progress_distribution.in_progress++;
        else if (completion < 100) analytics.progress_distribution.near_completion++;
        else analytics.progress_distribution.completed++;
      });

      return {
        status: 'success',
        data: analytics
      };
    } catch (error) {
      logger.error('Error getting project progress analytics', error as Error);
      return {
        status: 'error',
        error_message: `Failed to get project progress analytics: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get team performance analytics
   */
  async getTeamPerformance(
    clientId?: string, 
    organizationId?: string, 
    teamMemberId?: string,
    dateRange?: { start_date: Date; end_date: Date }
  ): Promise<MCPResponse<any>> {
    try {
      logger.info('Getting team performance analytics', { clientId, organizationId, teamMemberId });

      const query: any = { isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;
      if (teamMemberId) query._id = teamMemberId;

      const teamMembers = await this.models.TeamMember
        .find(query)
        .populate('currentProjects', 'name status');

      const analytics = {
        summary: {
          total_members: teamMembers.length,
          active_members: teamMembers.filter((m: any) => m.status === 'active').length,
          average_utilization: teamMembers.reduce((sum: number, m: any) => sum + (m.workload?.utilizationPercentage || 0), 0) / teamMembers.length || 0,
          total_tasks_completed: teamMembers.reduce((sum: number, m: any) => sum + (m.performance?.tasksCompleted || 0), 0)
        },
        by_role: {} as any,
        by_utilization: {
          underutilized: 0, // < 60%
          optimal: 0,       // 60-90%
          overutilized: 0   // > 90%
        },
        performance_metrics: [] as any[]
      };

      // Group by role
      const roleGroups = teamMembers.reduce((acc: any, member: any) => {
        const role = member.role;
        if (!acc[role]) acc[role] = [];
        acc[role].push(member);
        return acc;
      }, {});

      Object.keys(roleGroups).forEach(role => {
        const members = roleGroups[role];
        analytics.by_role[role] = {
          count: members.length,
          average_utilization: members.reduce((sum: number, m: any) => sum + (m.workload?.utilizationPercentage || 0), 0) / members.length || 0,
          average_performance: members.reduce((sum: number, m: any) => sum + (m.performance?.onTimeDeliveryRate || 0), 0) / members.length || 0
        };
      });

      // Utilization distribution
      teamMembers.forEach((member: any) => {
        const utilization = member.workload?.utilizationPercentage || 0;
        if (utilization < 60) analytics.by_utilization.underutilized++;
        else if (utilization <= 90) analytics.by_utilization.optimal++;
        else analytics.by_utilization.overutilized++;
      });

      // Individual performance metrics
      analytics.performance_metrics = teamMembers.map((member: any) => ({
        id: member._id,
        name: member.name,
        role: member.role,
        utilization: member.workload?.utilizationPercentage || 0,
        tasks_completed: member.performance?.tasksCompleted || 0,
        on_time_delivery: member.performance?.onTimeDeliveryRate || 0,
        average_completion_time: member.performance?.averageTaskCompletionTime || 0,
        current_projects: member.currentProjects?.length || 0
      }));

      return {
        status: 'success',
        data: analytics
      };
    } catch (error) {
      logger.error('Error getting team performance analytics', error as Error);
      return {
        status: 'error',
        error_message: `Failed to get team performance analytics: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get deadline tracking analytics
   */
  async getDeadlineTracking(clientId?: string, organizationId?: string): Promise<MCPResponse<any>> {
    try {
      logger.info('Getting deadline tracking analytics', { clientId, organizationId });

      const query: any = { isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;

      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Get projects and tasks with deadlines
      const [projects, tasks] = await Promise.all([
        this.models.Project.find({ ...query, dueDate: { $exists: true } }),
        this.models.Task.find({ ...query, dueDate: { $exists: true } }).populate('project', 'name')
      ]);

      const analytics = {
        projects: {
          overdue: projects.filter((p: any) => p.dueDate < now && p.status !== 'completed').length,
          due_this_week: projects.filter((p: any) => p.dueDate >= now && p.dueDate <= oneWeekFromNow).length,
          due_this_month: projects.filter((p: any) => p.dueDate > oneWeekFromNow && p.dueDate <= oneMonthFromNow).length,
          upcoming: projects.filter((p: any) => p.dueDate > oneMonthFromNow).length
        },
        tasks: {
          overdue: tasks.filter((t: any) => t.dueDate < now && t.status !== 'completed').length,
          due_this_week: tasks.filter((t: any) => t.dueDate >= now && t.dueDate <= oneWeekFromNow).length,
          due_this_month: tasks.filter((t: any) => t.dueDate > oneWeekFromNow && t.dueDate <= oneMonthFromNow).length,
          upcoming: tasks.filter((t: any) => t.dueDate > oneMonthFromNow).length
        },
        critical_items: {
          overdue_projects: projects
            .filter((p: any) => p.dueDate < now && p.status !== 'completed')
            .map((p: any) => ({
              id: p._id,
              name: p.name,
              dueDate: p.dueDate,
              daysOverdue: Math.ceil((now.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
              priority: p.priority,
              completion: p.progress?.completionPercentage || 0
            })),
          overdue_tasks: tasks
            .filter((t: any) => t.dueDate < now && t.status !== 'completed')
            .map((t: any) => ({
              id: t._id,
              name: t.name,
              dueDate: t.dueDate,
              daysOverdue: Math.ceil((now.getTime() - t.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
              priority: t.priority,
              project: t.project?.name,
              assignedTo: t.assignedToName
            }))
        }
      };

      return {
        status: 'success',
        data: analytics
      };
    } catch (error) {
      logger.error('Error getting deadline tracking analytics', error as Error);
      return {
        status: 'error',
        error_message: `Failed to get deadline tracking analytics: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get risk analysis
   */
  async getRiskAnalysis(clientId?: string, organizationId?: string): Promise<MCPResponse<any>> {
    try {
      logger.info('Getting risk analysis', { clientId, organizationId });

      const query: any = { isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;

      const [projects, tasks, teamMembers] = await Promise.all([
        this.models.Project.find(query),
        this.models.Task.find(query).populate('project', 'name'),
        this.models.TeamMember.find(query)
      ]);

      const now = new Date();
      const risks = {
        high_risk_projects: [] as any[],
        resource_risks: [] as any[],
        deadline_risks: [] as any[],
        quality_risks: [] as any[],
        overall_risk_score: 0
      };

      // Analyze project risks
      projects.forEach((project: any) => {
        let riskScore = 0;
        const riskFactors = [];

        // Deadline risk
        if (project.dueDate && project.dueDate < now && project.status !== 'completed') {
          riskScore += 30;
          riskFactors.push('Overdue');
        } else if (project.dueDate) {
          const daysUntilDue = Math.ceil((project.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 7 && (project.progress?.completionPercentage || 0) < 80) {
            riskScore += 20;
            riskFactors.push('Tight deadline with low completion');
          }
        }

        // Progress risk
        const completion = project.progress?.completionPercentage || 0;
        if (completion < 20 && project.status === 'active') {
          riskScore += 15;
          riskFactors.push('Low progress');
        }

        // Team size risk
        if (project.teamMembers?.length === 0) {
          riskScore += 25;
          riskFactors.push('No team members assigned');
        } else if (project.teamMembers?.length === 1) {
          riskScore += 10;
          riskFactors.push('Single point of failure');
        }

        if (riskScore >= 20) {
          risks.high_risk_projects.push({
            id: project._id,
            name: project.name,
            riskScore,
            riskFactors,
            status: project.status,
            completion: completion,
            dueDate: project.dueDate
          });
        }
      });

      // Analyze resource risks
      teamMembers.forEach((member: any) => {
        const utilization = member.workload?.utilizationPercentage || 0;
        if (utilization > 95) {
          risks.resource_risks.push({
            type: 'overutilization',
            member: {
              id: member._id,
              name: member.name,
              role: member.role,
              utilization
            },
            severity: 'high'
          });
        } else if (utilization < 30 && member.status === 'active') {
          risks.resource_risks.push({
            type: 'underutilization',
            member: {
              id: member._id,
              name: member.name,
              role: member.role,
              utilization
            },
            severity: 'medium'
          });
        }
      });

      // Calculate overall risk score
      const totalProjects = projects.length;
      const highRiskProjects = risks.high_risk_projects.length;
      const resourceIssues = risks.resource_risks.filter(r => r.severity === 'high').length;
      
      risks.overall_risk_score = Math.min(100, 
        (highRiskProjects / Math.max(totalProjects, 1)) * 50 + 
        (resourceIssues / Math.max(teamMembers.length, 1)) * 50
      );

      return {
        status: 'success',
        data: risks
      };
    } catch (error) {
      logger.error('Error getting risk analysis', error as Error);
      return {
        status: 'error',
        error_message: `Failed to get risk analysis: ${(error as Error).message}`
      };
    }
  }
}
