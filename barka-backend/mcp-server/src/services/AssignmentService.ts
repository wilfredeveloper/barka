import { Types } from 'mongoose';
import { MCPResponse } from '../types/index.js';
import { getModels } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export class AssignmentService {
  private models = getModels();

  /**
   * Skill-based task assignment recommendations
   */
  async getSkillBasedAssignment(
    taskId: string,
    requiredSkills: string[] = [],
    priorityLevel: string = 'medium',
    estimatedHours: number = 0,
    dueDate?: Date,
    clientId?: string,
    organizationId?: string,
    teamMemberIds?: string[]
  ): Promise<MCPResponse<any>> {
    try {
      logger.info('Getting skill-based assignment recommendations', { 
        taskId, requiredSkills, priorityLevel, estimatedHours 
      });

      // Get task details if taskId provided
      let task = null;
      if (taskId) {
        task = await this.models.Task.findById(taskId).populate('project', 'name teamMembers');
        if (!task) {
          return {
            status: 'error',
            error_message: 'Task not found'
          };
        }
      }

      // Build query for team members
      const query: any = { isActive: true, status: 'active' };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;
      if (teamMemberIds?.length) query._id = { $in: teamMemberIds };

      // Get available team members
      const teamMembers = await this.models.TeamMember
        .find(query)
        .populate('currentProjects', 'name status');

      const recommendations = [];

      for (const member of teamMembers) {
        let score = 0;
        const factors = [];

        // Skill matching score (40% of total score)
        if (requiredSkills.length > 0) {
          const memberSkills = member.skills || [];
          const memberExpertise = member.expertise || [];
          
          let skillMatchScore = 0;
          let expertiseBonus = 0;

          requiredSkills.forEach(skill => {
            // Check if member has the skill
            if (memberSkills.some((s: string) => s.toLowerCase().includes(skill.toLowerCase()))) {
              skillMatchScore += 10;
              factors.push(`Has skill: ${skill}`);
            }

            // Check expertise level
            const expertise = memberExpertise.find((e: any) => 
              e.skill.toLowerCase().includes(skill.toLowerCase())
            );
            if (expertise) {
              switch (expertise.level) {
                case 'expert': expertiseBonus += 5; break;
                case 'advanced': expertiseBonus += 3; break;
                case 'intermediate': expertiseBonus += 2; break;
                case 'beginner': expertiseBonus += 1; break;
              }
              factors.push(`${expertise.level} in ${skill}`);
            }
          });

          score += Math.min(40, skillMatchScore + expertiseBonus);
        } else {
          score += 20; // Base score if no specific skills required
        }

        // Availability score (30% of total score)
        const utilization = member.workload?.utilizationPercentage || 0;
        if (utilization < 60) {
          score += 30;
          factors.push('Low utilization (available)');
        } else if (utilization < 80) {
          score += 20;
          factors.push('Moderate utilization');
        } else if (utilization < 95) {
          score += 10;
          factors.push('High utilization');
        } else {
          score += 0;
          factors.push('Overutilized');
        }

        // Capacity score (20% of total score)
        const availableHours = member.capacity?.hoursPerWeek || 40;
        const allocatedHours = member.workload?.totalHoursAllocated || 0;
        const remainingCapacity = availableHours - allocatedHours;

        if (estimatedHours > 0) {
          if (remainingCapacity >= estimatedHours) {
            score += 20;
            factors.push('Sufficient capacity');
          } else if (remainingCapacity >= estimatedHours * 0.5) {
            score += 10;
            factors.push('Partial capacity');
          } else {
            score += 0;
            factors.push('Insufficient capacity');
          }
        } else {
          score += 10; // Base score if no hours specified
        }

        // Performance score (10% of total score)
        const onTimeRate = member.performance?.onTimeDeliveryRate || 80;
        if (onTimeRate >= 90) {
          score += 10;
          factors.push('Excellent delivery record');
        } else if (onTimeRate >= 80) {
          score += 7;
          factors.push('Good delivery record');
        } else if (onTimeRate >= 70) {
          score += 5;
          factors.push('Average delivery record');
        } else {
          score += 2;
          factors.push('Below average delivery record');
        }

        // Priority adjustment
        if (priorityLevel === 'urgent' && utilization > 90) {
          score -= 10; // Penalize overutilized members for urgent tasks
        }

        recommendations.push({
          member: {
            id: member._id,
            name: member.name,
            email: member.email,
            role: member.role,
            skills: member.skills,
            utilization: utilization,
            capacity: remainingCapacity
          },
          score: Math.round(score),
          factors,
          recommendation: score >= 70 ? 'highly_recommended' : 
                         score >= 50 ? 'recommended' : 
                         score >= 30 ? 'possible' : 'not_recommended'
        });
      }

      // Sort by score descending
      recommendations.sort((a, b) => b.score - a.score);

      const result = {
        task_info: task ? {
          id: task._id,
          name: task.name,
          project: task.project?.name,
          required_skills: requiredSkills,
          estimated_hours: estimatedHours,
          priority: priorityLevel,
          due_date: dueDate
        } : {
          required_skills: requiredSkills,
          estimated_hours: estimatedHours,
          priority: priorityLevel,
          due_date: dueDate
        },
        recommendations: recommendations.slice(0, 10), // Top 10 recommendations
        summary: {
          total_candidates: recommendations.length,
          highly_recommended: recommendations.filter(r => r.recommendation === 'highly_recommended').length,
          recommended: recommendations.filter(r => r.recommendation === 'recommended').length,
          possible: recommendations.filter(r => r.recommendation === 'possible').length
        }
      };

      return {
        status: 'success',
        data: result
      };
    } catch (error) {
      logger.error('Error getting skill-based assignment', error as Error, { taskId });
      return {
        status: 'error',
        error_message: `Failed to get skill-based assignment: ${(error as Error).message}`
      };
    }
  }

  /**
   * Workload balancing recommendations
   */
  async getWorkloadBalancing(
    clientId?: string,
    organizationId?: string,
    maxUtilization: number = 90
  ): Promise<MCPResponse<any>> {
    try {
      logger.info('Getting workload balancing recommendations', { clientId, organizationId, maxUtilization });

      const query: any = { isActive: true, status: 'active' };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;

      const teamMembers = await this.models.TeamMember
        .find(query)
        .populate('currentProjects', 'name status');

      // Get unassigned tasks
      const unassignedTasks = await this.models.Task
        .find({ 
          ...query, 
          assignedTo: { $exists: false },
          status: { $in: ['not_started', 'in_progress'] }
        })
        .populate('project', 'name priority');

      const analysis = {
        team_utilization: {
          overutilized: [] as any[],
          optimal: [] as any[],
          underutilized: [] as any[]
        },
        rebalancing_suggestions: [] as any[],
        unassigned_tasks: unassignedTasks.length,
        recommendations: [] as any[]
      };

      // Analyze current utilization
      teamMembers.forEach((member: any) => {
        const utilization = member.workload?.utilizationPercentage || 0;
        const memberData = {
          id: member._id,
          name: member.name,
          role: member.role,
          utilization,
          current_tasks: member.workload?.currentTasks || 0,
          capacity: member.capacity?.hoursPerWeek || 40
        };

        if (utilization > maxUtilization) {
          analysis.team_utilization.overutilized.push(memberData);
        } else if (utilization >= 60) {
          analysis.team_utilization.optimal.push(memberData);
        } else {
          analysis.team_utilization.underutilized.push(memberData);
        }
      });

      // Generate rebalancing suggestions
      if (analysis.team_utilization.overutilized.length > 0 && analysis.team_utilization.underutilized.length > 0) {
        for (const overutilized of analysis.team_utilization.overutilized) {
          // Find tasks that could be reassigned
          const memberTasks = await this.models.Task
            .find({ 
              assignedTo: overutilized.id, 
              status: { $in: ['not_started', 'in_progress'] }
            })
            .populate('project', 'name priority')
            .sort({ priority: 1, dueDate: 1 });

          for (const task of memberTasks.slice(0, 3)) { // Consider top 3 tasks for reassignment
            const suitableCandidates = analysis.team_utilization.underutilized
              .filter((member: any) => {
                // Basic role compatibility check
                return member.role === overutilized.role || 
                       ['developer', 'qa_engineer'].includes(member.role);
              })
              .slice(0, 2);

            if (suitableCandidates.length > 0) {
              analysis.rebalancing_suggestions.push({
                task: {
                  id: task._id,
                  name: task.name,
                  project: task.project?.name,
                  priority: task.priority,
                  estimated_hours: task.estimatedHours
                },
                from: {
                  id: overutilized.id,
                  name: overutilized.name,
                  current_utilization: overutilized.utilization
                },
                to_candidates: suitableCandidates.map((candidate: any) => ({
                  id: candidate.id,
                  name: candidate.name,
                  current_utilization: candidate.utilization,
                  projected_utilization: candidate.utilization + ((task.estimatedHours || 8) / candidate.capacity * 100)
                }))
              });
            }
          }
        }
      }

      // Generate recommendations for unassigned tasks
      for (const task of unassignedTasks.slice(0, 10)) { // Top 10 unassigned tasks
        const bestCandidates = analysis.team_utilization.underutilized
          .concat(analysis.team_utilization.optimal.filter((m: any) => m.utilization < 80))
          .sort((a: any, b: any) => a.utilization - b.utilization)
          .slice(0, 3);

        if (bestCandidates.length > 0) {
          analysis.recommendations.push({
            task: {
              id: task._id,
              name: task.name,
              project: task.project?.name,
              priority: task.priority
            },
            suggested_assignees: bestCandidates
          });
        }
      }

      return {
        status: 'success',
        data: analysis
      };
    } catch (error) {
      logger.error('Error getting workload balancing', error as Error);
      return {
        status: 'error',
        error_message: `Failed to get workload balancing: ${(error as Error).message}`
      };
    }
  }

  /**
   * Capacity planning analysis
   */
  async getCapacityPlanning(
    planningHorizon: 'week' | 'month' | 'quarter' = 'month',
    clientId?: string,
    organizationId?: string
  ): Promise<MCPResponse<any>> {
    try {
      logger.info('Getting capacity planning analysis', { planningHorizon, clientId, organizationId });

      const query: any = { isActive: true };
      if (clientId) query.client = clientId;
      if (organizationId) query.organization = organizationId;

      // Calculate date range based on planning horizon
      const now = new Date();
      let endDate: Date;
      switch (planningHorizon) {
        case 'week':
          endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
          break;
      }

      const [teamMembers, upcomingTasks, projects] = await Promise.all([
        this.models.TeamMember.find({ ...query, status: 'active' }),
        this.models.Task.find({
          ...query,
          dueDate: { $gte: now, $lte: endDate },
          status: { $in: ['not_started', 'in_progress'] }
        }).populate('project', 'name priority'),
        this.models.Project.find({
          ...query,
          dueDate: { $gte: now, $lte: endDate },
          status: { $in: ['planning', 'active'] }
        })
      ]);

      const analysis = {
        planning_horizon: planningHorizon,
        period: {
          start_date: now,
          end_date: endDate
        },
        team_capacity: {
          total_members: teamMembers.length,
          total_hours_available: 0,
          total_hours_allocated: 0,
          utilization_percentage: 0
        },
        demand_forecast: {
          upcoming_tasks: upcomingTasks.length,
          estimated_hours_needed: 0,
          projects_due: projects.length
        },
        capacity_gaps: [] as any[],
        recommendations: [] as any[]
      };

      // Calculate team capacity
      let totalAvailableHours = 0;
      let totalAllocatedHours = 0;

      teamMembers.forEach((member: any) => {
        const weeklyHours = member.capacity?.hoursPerWeek || 40;
        let periodHours: number;
        
        switch (planningHorizon) {
          case 'week':
            periodHours = weeklyHours;
            break;
          case 'month':
            periodHours = weeklyHours * 4;
            break;
          case 'quarter':
            periodHours = weeklyHours * 12;
            break;
        }

        totalAvailableHours += periodHours;
        totalAllocatedHours += member.workload?.totalHoursAllocated || 0;
      });

      analysis.team_capacity.total_hours_available = totalAvailableHours;
      analysis.team_capacity.total_hours_allocated = totalAllocatedHours;
      analysis.team_capacity.utilization_percentage = Math.round(
        (totalAllocatedHours / totalAvailableHours) * 100
      );

      // Calculate demand forecast
      const totalEstimatedHours = upcomingTasks.reduce(
        (sum: number, task: any) => sum + (task.estimatedHours || 8), 0
      );
      analysis.demand_forecast.estimated_hours_needed = totalEstimatedHours;

      // Identify capacity gaps
      const remainingCapacity = totalAvailableHours - totalAllocatedHours;
      if (totalEstimatedHours > remainingCapacity) {
        analysis.capacity_gaps.push({
          type: 'overall_capacity_shortage',
          shortage_hours: totalEstimatedHours - remainingCapacity,
          severity: totalEstimatedHours > remainingCapacity * 1.5 ? 'high' : 'medium'
        });
      }

      // Role-based capacity analysis
      const roleCapacity: any = {};
      teamMembers.forEach((member: any) => {
        const role = member.role;
        if (!roleCapacity[role]) {
          roleCapacity[role] = {
            members: 0,
            total_capacity: 0,
            allocated_hours: 0,
            demand: 0
          };
        }
        
        roleCapacity[role].members++;
        roleCapacity[role].total_capacity += member.capacity?.hoursPerWeek || 40;
        roleCapacity[role].allocated_hours += member.workload?.totalHoursAllocated || 0;
      });

      // Calculate demand by role (simplified)
      upcomingTasks.forEach((task: any) => {
        const estimatedHours = task.estimatedHours || 8;
        // Simple heuristic: assign to developer role by default
        const targetRole = 'developer';
        if (roleCapacity[targetRole]) {
          roleCapacity[targetRole].demand += estimatedHours;
        }
      });

      // Generate recommendations
      Object.keys(roleCapacity).forEach(role => {
        const capacity = roleCapacity[role];
        const availableHours = capacity.total_capacity - capacity.allocated_hours;
        
        if (capacity.demand > availableHours) {
          analysis.recommendations.push({
            type: 'hire_additional_staff',
            role: role,
            current_members: capacity.members,
            shortage_hours: capacity.demand - availableHours,
            suggested_additional_members: Math.ceil((capacity.demand - availableHours) / 40)
          });
        } else if (availableHours > capacity.demand * 1.5) {
          analysis.recommendations.push({
            type: 'redistribute_workload',
            role: role,
            excess_capacity: availableHours - capacity.demand,
            suggestion: 'Consider cross-training or project reallocation'
          });
        }
      });

      return {
        status: 'success',
        data: analysis
      };
    } catch (error) {
      logger.error('Error getting capacity planning', error as Error);
      return {
        status: 'error',
        error_message: `Failed to get capacity planning: ${(error as Error).message}`
      };
    }
  }
}
