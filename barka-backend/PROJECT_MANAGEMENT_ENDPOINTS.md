# Project Management API Endpoints Checklist

This document serves as a comprehensive checklist for implementing project management endpoints in barka-backend. Each endpoint should be checked off (✅) when implemented and tested.

## Implementation Priority

- 🔴 **Phase 1**: Core CRUD Operations (Essential)
- 🟡 **Phase 2**: Management Operations (Important) 
- 🟢 **Phase 3**: Search and Analytics (Nice to have)
- 🔵 **Phase 4**: Advanced Features (Future)

---

## 1. Team Member Endpoints

### Core CRUD Operations 🔴

- [x] `GET /api/team-members` - Get all team members (org-scoped)
  - **Auth**: `protect`, org-scoped
  - **Returns**: List of team members in user's organization
  - **Filters**: status, role, availability

- [x] `POST /api/team-members` - Create new team member
  - **Auth**: `protect`, `isAdmin`
  - **Body**: name, email, role, capacity, skills
  - **Returns**: Created team member object

- [x] `GET /api/team-members/:id` - Get single team member
  - **Auth**: `protect`, org-scoped
  - **Returns**: Full team member details with tasks and projects

- [x] `PUT /api/team-members/:id` - Update team member
  - **Auth**: `protect`, `isAdmin` or self-update
  - **Body**: Partial team member data
  - **Returns**: Updated team member object

- [x] `DELETE /api/team-members/:id` - Delete team member
  - **Auth**: `protect`, `isAdmin`
  - **Returns**: Success confirmation

### Team Member Specific Operations 🟡

- [x] `GET /api/team-members/stats` - Get team statistics for organization
  - **Auth**: `protect`, `isAdmin`
  - **Returns**: Role distribution, utilization, performance metrics

- [x] `PUT /api/team-members/:id/workload` - Update team member workload
  - **Auth**: `protect`, `isAdmin`
  - **Body**: currentTasks, totalHoursAllocated
  - **Returns**: Updated workload data

- [x] `PUT /api/team-members/:id/status` - Update team member status
  - **Auth**: `protect`, `isAdmin`
  - **Body**: status (active/inactive/on_leave)
  - **Returns**: Updated team member

- [x] `GET /api/team-members/:id/tasks` - Get tasks assigned to team member
  - **Auth**: `protect`, org-scoped
  - **Returns**: List of assigned tasks with status

- [x] `GET /api/team-members/:id/projects` - Get projects assigned to team member
  - **Auth**: `protect`, org-scoped
  - **Returns**: List of projects team member is part of

- [x] `PUT /api/team-members/:id/skills` - Update team member skills
  - **Auth**: `protect`, `isAdmin` or self-update
  - **Body**: skills[], expertise[], certifications[]
  - **Returns**: Updated team member

### Team Member Search and Filtering 🟢

- [x] `GET /api/team-members/available` - Get available team members for assignment
  - **Auth**: `protect`
  - **Query**: hoursNeeded, skills, role
  - **Returns**: Available team members with capacity

- [x] `GET /api/team-members/by-role/:role` - Get team members by role
  - **Auth**: `protect`, org-scoped
  - **Returns**: Team members filtered by role

---

## 2. Project Endpoints

### Core CRUD Operations 🔴

- [x] `GET /api/projects` - Get all projects (client/org-scoped)
  - **Auth**: `protect`, client/org-scoped
  - **Query**: status, priority, limit, offset
  - **Returns**: List of projects with basic info

- [x] `POST /api/projects` - Create new project
  - **Auth**: `protect`, `isAdmin`
  - **Body**: name, description, startDate, dueDate, budget, teamMembers
  - **Returns**: Created project object

- [x] `GET /api/projects/:id` - Get single project with full details
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Full project details with tasks, team, progress

- [x] `PUT /api/projects/:id` - Update project
  - **Auth**: `protect`, `isAdmin`
  - **Body**: Partial project data
  - **Returns**: Updated project object

- [x] `DELETE /api/projects/:id` - Delete project
  - **Auth**: `protect`, `isAdmin`
  - **Returns**: Success confirmation

### Project Management Operations 🟡

- [x] `GET /api/projects/stats` - Get project statistics
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Status distribution, completion rates, budget analysis

- [x] `PUT /api/projects/:id/status` - Update project status
  - **Auth**: `protect`, `isAdmin`
  - **Body**: status, reason
  - **Returns**: Updated project with status history

- [x] `PUT /api/projects/:id/progress` - Update project progress
  - **Auth**: `protect`, `isAdmin`
  - **Triggers**: Auto-calculation from tasks
  - **Returns**: Updated progress metrics

- [x] `GET /api/projects/:id/tasks` - Get all tasks for project
  - **Auth**: `protect`, client/org-scoped
  - **Query**: status, assignee, priority
  - **Returns**: List of project tasks

- [x] `POST /api/projects/:id/tasks` - Create task within project
  - **Auth**: `protect`, `isAdmin`
  - **Body**: name, description, assignedTo, dueDate
  - **Returns**: Created task object

- [x] `GET /api/projects/:id/team` - Get project team members
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: List of team members with roles and workload

- [x] `PUT /api/projects/:id/team` - Update project team assignments
  - **Auth**: `protect`, `isAdmin`
  - **Body**: teamMembers[] with roles
  - **Returns**: Updated project team

- [x] `GET /api/projects/:id/timeline` - Get project timeline and milestones
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Timeline with milestones and critical path

- [x] `PUT /api/projects/:id/milestones` - Update project milestones
  - **Auth**: `protect`, `isAdmin`
  - **Body**: milestones[] with dates and status
  - **Returns**: Updated milestones

- [x] `GET /api/projects/:id/documents` - Get linked documents
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: List of linked SRS, contracts, proposals

- [x] `PUT /api/projects/:id/documents` - Link documents to project
  - **Auth**: `protect`, `isAdmin`
  - **Body**: documentIds[], documentTypes[]
  - **Returns**: Updated document links

### Project Search and Filtering 🟢

- [x] `GET /api/projects/search?q=query` - Search projects by name/description
  - **Auth**: `protect`, client/org-scoped
  - **Query**: q, status, priority
  - **Returns**: Matching projects

- [x] `GET /api/projects/by-status/:status` - Get projects by status
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Projects filtered by status

- [x] `GET /api/projects/by-priority/:priority` - Get projects by priority
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Projects filtered by priority

- [x] `GET /api/projects/overdue` - Get overdue projects
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Projects past due date

- [x] `GET /api/projects/due-soon` - Get projects due soon
  - **Auth**: `protect`, client/org-scoped
  - **Query**: days (default: 7)
  - **Returns**: Projects due within specified days

- [x] `GET /api/projects/active` - Get active projects
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Projects with status 'active'

---

## 3. Task Endpoints

### Core CRUD Operations 🔴

- [x] `GET /api/tasks` - Get all tasks (project/client-scoped)
  - **Auth**: `protect`, client/org-scoped
  - **Query**: project, assignee, status, priority
  - **Returns**: List of tasks with basic info

- [x] `POST /api/tasks` - Create new task
  - **Auth**: `protect`, `isAdmin`
  - **Body**: name, description, project, assignedTo, dueDate
  - **Returns**: Created task object

- [x] `GET /api/tasks/:id` - Get single task with full details
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Full task details with comments and history

- [x] `PUT /api/tasks/:id` - Update task
  - **Auth**: `protect`, `isAdmin` or assignee
  - **Body**: Partial task data
  - **Returns**: Updated task object

- [x] `DELETE /api/tasks/:id` - Delete task
  - **Auth**: `protect`, `isAdmin`
  - **Returns**: Success confirmation

### Task Management Operations 🟡

- [x] `PUT /api/tasks/:id/status` - Update task status
  - **Auth**: `protect`, `isAdmin` or assignee
  - **Body**: status, comment
  - **Returns**: Updated task with status history

- [x] `PUT /api/tasks/:id/assign` - Assign task to team member
  - **Auth**: `protect`, `isAdmin`
  - **Body**: assignedTo, assignedToName
  - **Returns**: Updated task assignment

- [x] `PUT /api/tasks/:id/progress` - Update task progress
  - **Auth**: `protect`, assignee or `isAdmin`
  - **Body**: completionPercentage, timeSpent
  - **Returns**: Updated progress data

- [x] `POST /api/tasks/:id/comments` - Add comment to task
  - **Auth**: `protect`, team member or client
  - **Body**: content
  - **Returns**: Added comment object

- [x] `GET /api/tasks/:id/comments` - Get task comments
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: List of task comments with authors

- [x] `PUT /api/tasks/:id/time` - Log time spent on task
  - **Auth**: `protect`, assignee or `isAdmin`
  - **Body**: hours, description, date
  - **Returns**: Updated time tracking data

- [x] `GET /api/tasks/:id/history` - Get task status history
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Complete status change history

- [x] `PUT /api/tasks/:id/dependencies` - Update task dependencies
  - **Auth**: `protect`, `isAdmin`
  - **Body**: dependsOn[], blockedBy[]
  - **Returns**: Updated task dependencies

### Task Search and Filtering 🟢

- [x] `GET /api/tasks/search?q=query` - Search tasks by name/description
  - **Auth**: `protect`, client/org-scoped
  - **Query**: q, project, status, priority, assignee, complexity, category, tags, dueDateFrom, dueDateTo, createdFrom, createdTo
  - **Returns**: Matching tasks with advanced filtering and pagination

- [x] `GET /api/tasks/by-status/:status` - Get tasks by status
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Tasks filtered by status

- [x] `GET /api/tasks/by-priority/:priority` - Get tasks by priority
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Tasks filtered by priority

- [x] `GET /api/tasks/by-assignee/:memberId` - Get tasks by assignee
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Tasks assigned to specific team member

- [x] `GET /api/tasks/overdue` - Get overdue tasks
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Tasks past due date

- [x] `GET /api/tasks/due-today` - Get tasks due today
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Tasks due today

- [x] `GET /api/tasks/unassigned` - Get unassigned tasks
  - **Auth**: `protect`, `isAdmin`
  - **Returns**: Tasks without assignee

- [x] `GET /api/tasks/blocked` - Get blocked tasks
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Tasks with blocked status or dependencies

---

## 4. Cross-Model Analytics Endpoints

### Dashboard and Reporting 🟢

- [x] `GET /api/analytics/dashboard` - Get comprehensive dashboard data
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Projects, tasks, team overview with key metrics

- [x] `GET /api/analytics/projects/overview` - Project overview statistics
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Status distribution, completion rates, budget analysis

- [x] `GET /api/analytics/team/performance` - Team performance metrics
  - **Auth**: `protect`, `isAdmin`
  - **Returns**: Utilization, completion rates, performance scores

- [x] `GET /api/analytics/tasks/completion` - Task completion analytics
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Completion trends, average time, bottlenecks

- [x] `GET /api/analytics/workload/distribution` - Workload distribution
  - **Auth**: `protect`, `isAdmin`
  - **Returns**: Team member workload balance and capacity

- [x] `GET /api/analytics/timeline/progress` - Timeline and progress analytics
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Project timelines, milestone progress, delays

### Integration Endpoints 🔵

- [ ] `GET /api/integration/calendar/events` - Get calendar integration data
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Project/task events for calendar sync

- [ ] `POST /api/integration/documents/link` - Link documents to projects/tasks
  - **Auth**: `protect`, `isAdmin`
  - **Body**: documentId, targetType, targetId
  - **Returns**: Created document link

- [ ] `GET /api/integration/client/:clientId/overview` - Get client project overview
  - **Auth**: `protect`, client/org-scoped
  - **Returns**: Complete client project portfolio

---

## 5. Bulk Operations Endpoints

### Bulk Operations 🔵

- [ ] `POST /api/bulk/tasks/create` - Create multiple tasks
  - **Auth**: `protect`, `isAdmin`
  - **Body**: tasks[] array
  - **Returns**: Created tasks with success/error status

- [ ] `PUT /api/bulk/tasks/update` - Update multiple tasks
  - **Auth**: `protect`, `isAdmin`
  - **Body**: updates[] with taskId and changes
  - **Returns**: Update results

- [ ] `PUT /api/bulk/tasks/assign` - Bulk assign tasks
  - **Auth**: `protect`, `isAdmin`
  - **Body**: taskIds[], assignedTo
  - **Returns**: Assignment results

- [ ] `POST /api/bulk/team-members/import` - Import team members from CSV
  - **Auth**: `protect`, `isAdmin`
  - **Body**: CSV file or data array
  - **Returns**: Import results with success/error details

- [ ] `PUT /api/bulk/projects/status` - Bulk update project status
  - **Auth**: `protect`, `isAdmin`
  - **Body**: projectIds[], status, reason
  - **Returns**: Update results

---

## 6. Implementation Checklist

### File Structure Setup
- [x] Create `routes/teamMembers.js`
- [x] Create `routes/projects.js`
- [x] Create `routes/tasks.js`
- [ ] Create `routes/analytics.js`
- [ ] Create `routes/bulk.js`
- [x] Create `controllers/teamMemberController.js`
- [x] Create `controllers/projectController.js`
- [x] Create `controllers/taskController.js`
- [ ] Create `controllers/analyticsController.js`
- [ ] Create `controllers/bulkController.js`
- [x] Create `middleware/projectValidators.js`
- [x] Create `middleware/taskValidators.js`
- [x] Create `middleware/teamMemberValidators.js`
- [x] Create `tests/test_task_management_phase2.py`
- [x] Create `tests/test_task_search_phase3.py`
- [x] Create `tests/test_analytics_phase4.py`

### Integration Setup
- [x] Add routes to main `server.js` (team-members, projects, and tasks)
- [ ] Update authentication middleware for new endpoints
- [ ] Create database indexes for performance
- [ ] Add input validation for all endpoints
- [ ] Create API documentation
- [ ] Write unit tests for controllers
- [ ] Write integration tests for endpoints
- [ ] Set up error handling and logging

### Testing Checklist
- [x] Test all CRUD operations
- [x] Test authentication and authorization
- [x] Test organization scoping
- [x] Test data validation
- [x] Test error handling
- [x] Test Phase 2 Task Management Operations
- [x] Test Phase 3 Task Search and Filtering Operations
- [x] Test Phase 4 Analytics and Reporting Operations
- [ ] Test performance with large datasets
- [ ] Test integration with existing models

---

## Notes

- All endpoints follow existing barka-backend authentication patterns
- Organization scoping is enforced at middleware level
- Client users can only access their own data
- Admin users can manage their organization's data
- Super admin users have full access
- All endpoints return consistent JSON response format
- Error handling follows existing patterns
- Input validation uses express-validator
- Database operations use Mongoose with proper error handling

**Total Endpoints**: 67 endpoints across 4 phases
**Estimated Implementation Time**: 4-6 weeks for full implementation
