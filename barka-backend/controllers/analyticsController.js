const { validationResult } = require("express-validator");
const Task = require("../models/Task");
const Project = require("../models/Project");
const TeamMember = require("../models/TeamMember");

/**
 * @desc    Get comprehensive dashboard data
 * @route   GET /api/analytics/dashboard
 * @access  Private (Organization/Client scoped)
 */
exports.getDashboardAnalytics = async (req, res) => {
  try {
    // Build filter based on user role and organization
    let filter = {};

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Get current date for time-based calculations
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parallel data fetching for better performance
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      tasksThisWeek,
      tasksThisMonth,
      teamMembers,
      recentTasks,
      recentProjects
    ] = await Promise.all([
      // Project metrics
      Project.countDocuments(filter),
      Project.countDocuments({ ...filter, status: "active" }),
      Project.countDocuments({ ...filter, status: "completed" }),
      
      // Task metrics
      Task.countDocuments(filter),
      Task.countDocuments({ ...filter, status: "completed" }),
      Task.countDocuments({
        ...filter,
        dueDate: { $lt: new Date() },
        status: { $not: { $in: ["completed", "cancelled"] } }
      }),
      Task.countDocuments({ 
        ...filter, 
        createdAt: { $gte: startOfWeek } 
      }),
      Task.countDocuments({ 
        ...filter, 
        createdAt: { $gte: startOfMonth } 
      }),
      
      // Team metrics
      TeamMember.countDocuments(filter),
      
      // Recent activity
      Task.find(filter)
        .populate("project", "name")
        .populate("assignedTo", "name")
        .sort({ createdAt: -1 })
        .limit(5),
      Project.find(filter)
        .populate("client", "firstName lastName")
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Calculate completion rates
    const projectCompletionRate = totalProjects > 0 ? (completedProjects / totalProjects * 100).toFixed(1) : 0;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

    // Get task status distribution
    const taskStatusDistribution = await Task.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Get project status distribution
    const projectStatusDistribution = await Project.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Get priority distribution
    const taskPriorityDistribution = await Task.aggregate([
      { $match: filter },
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]);

    const dashboardData = {
      overview: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        overdueTasks,
        teamMembers,
        projectCompletionRate: parseFloat(projectCompletionRate),
        taskCompletionRate: parseFloat(taskCompletionRate)
      },
      activity: {
        tasksCreatedThisWeek: tasksThisWeek,
        tasksCreatedThisMonth: tasksThisMonth
      },
      distributions: {
        tasksByStatus: taskStatusDistribution,
        projectsByStatus: projectStatusDistribution,
        tasksByPriority: taskPriorityDistribution
      },
      recentActivity: {
        recentTasks: recentTasks.map(task => ({
          id: task._id,
          name: task.name,
          status: task.status,
          priority: task.priority,
          project: task.project?.name,
          assignee: task.assignedTo?.name,
          createdAt: task.createdAt
        })),
        recentProjects: recentProjects.map(project => ({
          id: project._id,
          name: project.name,
          status: project.status,
          priority: project.priority,
          client: project.client ? `${project.client.firstName} ${project.client.lastName}` : null,
          createdAt: project.createdAt
        }))
      }
    };

    res.status(200).json({
      success: true,
      message: "Dashboard analytics retrieved successfully",
      data: dashboardData
    });
  } catch (error) {
    console.error("Get dashboard analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get project overview statistics
 * @route   GET /api/analytics/projects/overview
 * @access  Private (Organization/Client scoped)
 */
exports.getProjectOverview = async (req, res) => {
  try {
    // Build filter based on user role and organization
    let filter = {};

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    // Get project statistics
    const [
      totalProjects,
      statusDistribution,
      priorityDistribution,
      budgetAnalysis,
      completionRates,
      overdueProjects
    ] = await Promise.all([
      Project.countDocuments(filter),
      
      // Status distribution
      Project.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      
      // Priority distribution
      Project.aggregate([
        { $match: filter },
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]),
      
      // Budget analysis
      Project.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalBudget: { $sum: "$budget" },
            averageBudget: { $avg: "$budget" },
            minBudget: { $min: "$budget" },
            maxBudget: { $max: "$budget" }
          }
        }
      ]),
      
      // Completion rates by status
      Project.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgCompletion: { $avg: "$progress.completionPercentage" }
          }
        }
      ]),
      
      // Overdue projects
      Project.countDocuments({
        ...filter,
        dueDate: { $lt: new Date() },
        status: { $not: { $in: ["completed", "cancelled"] } }
      })
    ]);

    const projectOverview = {
      summary: {
        totalProjects,
        overdueProjects
      },
      distributions: {
        byStatus: statusDistribution,
        byPriority: priorityDistribution
      },
      budget: budgetAnalysis[0] || {
        totalBudget: 0,
        averageBudget: 0,
        minBudget: 0,
        maxBudget: 0
      },
      completion: completionRates
    };

    res.status(200).json({
      success: true,
      message: "Project overview analytics retrieved successfully",
      data: projectOverview
    });
  } catch (error) {
    console.error("Get project overview error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get team performance metrics
 * @route   GET /api/analytics/team/performance
 * @access  Private (Admin only)
 */
exports.getTeamPerformance = async (req, res) => {
  try {
    // Build filter based on user organization
    let filter = {};

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Get team performance data
    const [
      teamMembers,
      taskAssignments,
      completionRates,
      workloadDistribution
    ] = await Promise.all([
      // Team member basic info
      TeamMember.find(filter).select("name email role capacity status"),
      
      // Task assignments per team member
      Task.aggregate([
        { $match: { ...filter, assignedTo: { $exists: true } } },
        {
          $group: {
            _id: "$assignedTo",
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
            },
            inProgressTasks: {
              $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] }
            },
            overdueTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$dueDate", new Date()] },
                      { $not: { $in: ["$status", ["completed", "cancelled"]] } }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            avgEstimatedHours: { $avg: "$estimatedHours" },
            totalActualHours: { $sum: "$actualHours" }
          }
        }
      ]),
      
      // Overall completion rates
      Task.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$assignedTo",
            completionRate: {
              $avg: {
                $cond: [{ $eq: ["$status", "completed"] }, 100, 0]
              }
            }
          }
        }
      ]),
      
      // Workload distribution
      TeamMember.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
            totalCapacity: { $sum: "$capacity.hoursPerWeek" },
            avgCapacity: { $avg: "$capacity.hoursPerWeek" }
          }
        }
      ])
    ]);

    const teamPerformance = {
      summary: {
        totalTeamMembers: teamMembers.length,
        activeMembers: teamMembers.filter(member => member.status === "active").length
      },
      members: teamMembers.map(member => {
        const assignments = taskAssignments.find(
          assignment => assignment._id.toString() === member._id.toString()
        ) || {};
        
        const completion = completionRates.find(
          rate => rate._id && rate._id.toString() === member._id.toString()
        ) || {};

        return {
          id: member._id,
          name: member.name,
          email: member.email,
          role: member.role,
          status: member.status,
          capacity: member.capacity,
          performance: {
            totalTasks: assignments.totalTasks || 0,
            completedTasks: assignments.completedTasks || 0,
            inProgressTasks: assignments.inProgressTasks || 0,
            overdueTasks: assignments.overdueTasks || 0,
            completionRate: completion.completionRate || 0,
            avgEstimatedHours: assignments.avgEstimatedHours || 0,
            totalActualHours: assignments.totalActualHours || 0
          }
        };
      }),
      workloadByRole: workloadDistribution
    };

    res.status(200).json({
      success: true,
      message: "Team performance analytics retrieved successfully",
      data: teamPerformance
    });
  } catch (error) {
    console.error("Get team performance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get task completion analytics
 * @route   GET /api/analytics/tasks/completion
 * @access  Private (Organization/Client scoped)
 */
exports.getTaskCompletionAnalytics = async (req, res) => {
  try {
    // Build filter based on user role and organization
    let filter = {};

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries for task completion analytics
    const [
      totalTasks,
      completedTasks,
      averageCompletionTime,
      completionTrends,
      tasksByComplexity,
      bottlenecks,
      completionRateByPriority
    ] = await Promise.all([
      // Basic counts
      Task.countDocuments(filter),
      Task.countDocuments({ ...filter, status: "completed" }),

      // Average completion time
      Task.aggregate([
        {
          $match: {
            ...filter,
            status: "completed",
            startDate: { $exists: true },
            completedAt: { $exists: true }
          }
        },
        {
          $project: {
            completionTime: {
              $divide: [
                { $subtract: ["$completedAt", "$startDate"] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgCompletionTime: { $avg: "$completionTime" },
            minCompletionTime: { $min: "$completionTime" },
            maxCompletionTime: { $max: "$completionTime" }
          }
        }
      ]),

      // Completion trends (last 30 days)
      Task.aggregate([
        {
          $match: {
            ...filter,
            status: "completed",
            completedAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$completedAt"
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ]),

      // Tasks by complexity
      Task.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$complexity",
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
            },
            avgEstimatedHours: { $avg: "$estimatedHours" },
            avgActualHours: { $avg: "$actualHours" }
          }
        }
      ]),

      // Bottlenecks (tasks stuck in status for too long)
      Task.aggregate([
        {
          $match: {
            ...filter,
            status: { $in: ["in_progress", "under_review", "blocked"] },
            updatedAt: { $lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } // 7 days ago
          }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgDaysStuck: {
              $avg: {
                $divide: [
                  { $subtract: [now, "$updatedAt"] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          }
        }
      ]),

      // Completion rate by priority
      Task.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$priority",
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            _id: 1,
            total: 1,
            completed: 1,
            completionRate: {
              $multiply: [
                { $divide: ["$completed", "$total"] },
                100
              ]
            }
          }
        }
      ])
    ]);

    // Calculate overall completion rate
    const overallCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

    // Format average completion time
    const avgTime = averageCompletionTime[0] || { avgCompletionTime: 0, minCompletionTime: 0, maxCompletionTime: 0 };

    res.status(200).json({
      success: true,
      message: "Task completion analytics retrieved successfully",
      data: {
        summary: {
          totalTasks,
          completedTasks,
          completionRate: parseFloat(overallCompletionRate),
          averageCompletionDays: Math.round(avgTime.avgCompletionTime || 0),
          fastestCompletionDays: Math.round(avgTime.minCompletionTime || 0),
          slowestCompletionDays: Math.round(avgTime.maxCompletionTime || 0)
        },
        trends: {
          dailyCompletions: completionTrends
        },
        analysis: {
          byComplexity: tasksByComplexity,
          byPriority: completionRateByPriority,
          bottlenecks: bottlenecks
        }
      }
    });
  } catch (error) {
    console.error("Get task completion analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get workload distribution analytics
 * @route   GET /api/analytics/workload/distribution
 * @access  Private (Admin only)
 */
exports.getWorkloadDistribution = async (req, res) => {
  try {
    // Build filter based on user organization
    let filter = {};

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Parallel queries for workload analytics
    const [
      teamMembers,
      taskWorkload,
      capacityAnalysis,
      workloadByRole,
      upcomingDeadlines
    ] = await Promise.all([
      // Team member basic info
      TeamMember.find(filter).select("name email role capacity status"),

      // Current task workload per team member
      Task.aggregate([
        {
          $match: {
            ...filter,
            assignedTo: { $exists: true },
            status: { $not: { $in: ["completed", "cancelled"] } }
          }
        },
        {
          $group: {
            _id: "$assignedTo",
            activeTasks: { $sum: 1 },
            totalEstimatedHours: { $sum: "$estimatedHours" },
            urgentTasks: {
              $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] }
            },
            highPriorityTasks: {
              $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] }
            },
            overdueTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$dueDate", new Date()] },
                      { $not: { $in: ["$status", ["completed", "cancelled"]] } }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Capacity vs workload analysis
      TeamMember.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "tasks",
            let: { memberId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$assignedTo", "$$memberId"] },
                      { $not: { $in: ["$status", ["completed", "cancelled"]] } }
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  totalHours: { $sum: "$estimatedHours" }
                }
              }
            ],
            as: "workload"
          }
        },
        {
          $project: {
            name: 1,
            role: 1,
            capacity: "$capacity.hoursPerWeek",
            currentWorkload: { $ifNull: [{ $arrayElemAt: ["$workload.totalHours", 0] }, 0] },
            utilizationRate: {
              $multiply: [
                {
                  $divide: [
                    { $ifNull: [{ $arrayElemAt: ["$workload.totalHours", 0] }, 0] },
                    { $ifNull: ["$capacity.hoursPerWeek", 40] }
                  ]
                },
                100
              ]
            }
          }
        }
      ]),

      // Workload distribution by role
      TeamMember.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "tasks",
            let: { memberId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$assignedTo", "$$memberId"] },
                      { $not: { $in: ["$status", ["completed", "cancelled"]] } }
                    ]
                  }
                }
              }
            ],
            as: "activeTasks"
          }
        },
        {
          $group: {
            _id: "$role",
            memberCount: { $sum: 1 },
            totalCapacity: { $sum: "$capacity.hoursPerWeek" },
            totalActiveTasks: { $sum: { $size: "$activeTasks" } },
            avgTasksPerMember: { $avg: { $size: "$activeTasks" } }
          }
        }
      ]),

      // Upcoming deadlines (next 7 days)
      Task.aggregate([
        {
          $match: {
            ...filter,
            assignedTo: { $exists: true },
            dueDate: {
              $gte: new Date(),
              $lte: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
            },
            status: { $not: { $in: ["completed", "cancelled"] } }
          }
        },
        {
          $group: {
            _id: "$assignedTo",
            upcomingTasks: { $sum: 1 },
            urgentDeadlines: {
              $sum: {
                $cond: [
                  { $lte: ["$dueDate", new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000)] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    // Combine data for comprehensive workload view
    const workloadAnalysis = teamMembers.map(member => {
      const workload = taskWorkload.find(w => w._id.toString() === member._id.toString()) || {};
      const capacity = capacityAnalysis.find(c => c._id.toString() === member._id.toString()) || {};
      const deadlines = upcomingDeadlines.find(d => d._id.toString() === member._id.toString()) || {};

      return {
        id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        status: member.status,
        capacity: {
          hoursPerWeek: member.capacity?.hoursPerWeek || 40,
          availability: member.capacity?.availability || "full_time"
        },
        currentWorkload: {
          activeTasks: workload.activeTasks || 0,
          totalEstimatedHours: workload.totalEstimatedHours || 0,
          urgentTasks: workload.urgentTasks || 0,
          highPriorityTasks: workload.highPriorityTasks || 0,
          overdueTasks: workload.overdueTasks || 0,
          upcomingDeadlines: deadlines.upcomingTasks || 0,
          urgentDeadlines: deadlines.urgentDeadlines || 0
        },
        utilization: {
          rate: capacity.utilizationRate || 0,
          status: capacity.utilizationRate > 100 ? "overloaded" :
                  capacity.utilizationRate > 80 ? "high" :
                  capacity.utilizationRate > 50 ? "moderate" : "low"
        }
      };
    });

    res.status(200).json({
      success: true,
      message: "Workload distribution analytics retrieved successfully",
      data: {
        summary: {
          totalTeamMembers: teamMembers.length,
          averageUtilization: workloadAnalysis.reduce((sum, member) => sum + member.utilization.rate, 0) / workloadAnalysis.length,
          overloadedMembers: workloadAnalysis.filter(member => member.utilization.rate > 100).length,
          underutilizedMembers: workloadAnalysis.filter(member => member.utilization.rate < 50).length
        },
        members: workloadAnalysis,
        roleDistribution: workloadByRole
      }
    });
  } catch (error) {
    console.error("Get workload distribution error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get timeline and progress analytics
 * @route   GET /api/analytics/timeline/progress
 * @access  Private (Organization/Client scoped)
 */
exports.getTimelineProgress = async (req, res) => {
  try {
    // Build filter based on user role and organization
    let filter = {};

    // Organization scoping
    if (req.user.organization) {
      filter.organization = req.user.organization;
    }

    // Client scoping
    if (req.user.role === "client" && req.user.client) {
      filter.client = req.user.client;
    }

    const now = new Date();

    // Parallel queries for timeline analytics
    const [
      projectTimelines,
      milestoneProgress,
      delayAnalysis,
      progressTrends,
      criticalPath
    ] = await Promise.all([
      // Project timeline analysis
      Project.aggregate([
        { $match: filter },
        {
          $project: {
            name: 1,
            status: 1,
            startDate: 1,
            dueDate: 1,
            progress: 1,
            plannedDuration: {
              $divide: [
                { $subtract: ["$dueDate", "$startDate"] },
                1000 * 60 * 60 * 24
              ]
            },
            daysRemaining: {
              $divide: [
                { $subtract: ["$dueDate", now] },
                1000 * 60 * 60 * 24
              ]
            },
            isOverdue: {
              $and: [
                { $lt: ["$dueDate", now] },
                { $not: { $in: ["$status", ["completed", "cancelled"]] } }
              ]
            },
            completionRate: "$progress.completionPercentage"
          }
        }
      ]),

      // Milestone progress
      Project.aggregate([
        { $match: filter },
        { $unwind: { path: "$milestones", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$_id",
            projectName: { $first: "$name" },
            totalMilestones: { $sum: 1 },
            completedMilestones: {
              $sum: { $cond: [{ $eq: ["$milestones.status", "completed"] }, 1, 0] }
            },
            overdueMilestones: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$milestones.dueDate", now] },
                      { $ne: ["$milestones.status", "completed"] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Delay analysis
      Project.aggregate([
        {
          $match: {
            ...filter,
            dueDate: { $lt: now },
            status: { $not: { $in: ["completed", "cancelled"] } }
          }
        },
        {
          $project: {
            name: 1,
            status: 1,
            dueDate: 1,
            delayDays: {
              $divide: [
                { $subtract: [now, "$dueDate"] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        { $sort: { delayDays: -1 } }
      ]),

      // Progress trends (last 30 days)
      Project.aggregate([
        { $match: filter },
        {
          $project: {
            name: 1,
            progressHistory: {
              $map: {
                input: { $range: [0, 30] },
                as: "day",
                in: {
                  date: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: {
                        $subtract: [
                          now,
                          { $multiply: ["$$day", 24 * 60 * 60 * 1000] }
                        ]
                      }
                    }
                  },
                  progress: "$progress.completionPercentage"
                }
              }
            }
          }
        }
      ]),

      // Critical path analysis (tasks blocking other tasks)
      Task.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "tasks",
            localField: "_id",
            foreignField: "dependsOn",
            as: "dependentTasks"
          }
        },
        {
          $match: {
            dependentTasks: { $ne: [] }
          }
        },
        {
          $project: {
            name: 1,
            status: 1,
            priority: 1,
            dueDate: 1,
            assignedTo: 1,
            dependentTasksCount: { $size: "$dependentTasks" },
            isCritical: {
              $and: [
                { $gt: [{ $size: "$dependentTasks" }, 2] },
                { $in: ["$status", ["not_started", "in_progress", "blocked"]] }
              ]
            }
          }
        },
        { $sort: { dependentTasksCount: -1 } }
      ])
    ]);

    // Calculate summary metrics
    const totalProjects = projectTimelines.length;
    const overdueProjects = projectTimelines.filter(p => p.isOverdue).length;
    const onTrackProjects = projectTimelines.filter(p =>
      !p.isOverdue && p.completionRate >= (100 - (p.daysRemaining / p.plannedDuration * 100))
    ).length;
    const atRiskProjects = totalProjects - overdueProjects - onTrackProjects;

    // Calculate average progress
    const avgProgress = projectTimelines.reduce((sum, p) => sum + (p.completionRate || 0), 0) / totalProjects;

    res.status(200).json({
      success: true,
      message: "Timeline and progress analytics retrieved successfully",
      data: {
        summary: {
          totalProjects,
          overdueProjects,
          onTrackProjects,
          atRiskProjects,
          averageProgress: Math.round(avgProgress || 0)
        },
        projects: projectTimelines.map(project => ({
          id: project._id,
          name: project.name,
          status: project.status,
          startDate: project.startDate,
          dueDate: project.dueDate,
          progress: project.completionRate || 0,
          plannedDurationDays: Math.round(project.plannedDuration || 0),
          daysRemaining: Math.round(project.daysRemaining || 0),
          isOverdue: project.isOverdue,
          healthStatus: project.isOverdue ? "overdue" :
                      project.daysRemaining < 7 ? "urgent" :
                      project.completionRate < 50 && project.daysRemaining < project.plannedDuration * 0.3 ? "at_risk" :
                      "on_track"
        })),
        milestones: milestoneProgress,
        delays: delayAnalysis,
        criticalPath: criticalPath.filter(task => task.isCritical),
        trends: {
          progressOverTime: progressTrends
        }
      }
    });
  } catch (error) {
    console.error("Get timeline progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
