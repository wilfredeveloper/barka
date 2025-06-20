# Phase 3: Project Search and Filtering API Documentation

This document describes the Phase 3 Project Search and Filtering endpoints implemented in the barka-backend project management system.

## Overview

Phase 3 introduces advanced search and filtering capabilities for projects, allowing users to:
- Search projects by name, description, and tags
- Filter projects by status and priority
- Find overdue projects
- Get projects due soon
- Retrieve active projects

All endpoints follow the existing authentication and authorization patterns with organization and client scoping.

## Endpoints

### 1. Search Projects

**Endpoint:** `GET /api/projects/search`

**Description:** Search projects by name, description, or tags with optional filters.

**Authentication:** Required (`protect` middleware)

**Authorization:** Organization/Client scoped

**Query Parameters:**
- `q` (required): Search query string (1-200 characters)
- `status` (optional): Filter by project status (`planning`, `active`, `on_hold`, `completed`, `cancelled`)
- `priority` (optional): Filter by priority (`low`, `medium`, `high`, `critical`)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (1-100, default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Project search completed successfully",
  "query": "ecommerce",
  "count": 2,
  "totalProjects": 2,
  "totalPages": 1,
  "currentPage": 1,
  "data": [
    {
      "_id": "project_id",
      "name": "E-commerce Website",
      "description": "Building modern e-commerce platform",
      "status": "active",
      "priority": "high",
      "client": { "firstName": "John", "lastName": "Doe" },
      "organization": { "name": "Tech Corp" },
      "projectManager": { "name": "Jane Smith" },
      "teamMembers": [...],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Filter Projects by Status

**Endpoint:** `GET /api/projects/by-status/:status`

**Description:** Get all projects with a specific status.

**Authentication:** Required (`protect` middleware)

**Authorization:** Organization/Client scoped

**Path Parameters:**
- `status` (required): Project status (`planning`, `active`, `on_hold`, `completed`, `cancelled`)

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (1-100, default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Projects with status 'active' retrieved successfully",
  "status": "active",
  "count": 5,
  "totalProjects": 5,
  "totalPages": 1,
  "currentPage": 1,
  "data": [...]
}
```

### 3. Filter Projects by Priority

**Endpoint:** `GET /api/projects/by-priority/:priority`

**Description:** Get all projects with a specific priority level.

**Authentication:** Required (`protect` middleware)

**Authorization:** Organization/Client scoped

**Path Parameters:**
- `priority` (required): Project priority (`low`, `medium`, `high`, `critical`)

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (1-100, default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Projects with priority 'high' retrieved successfully",
  "priority": "high",
  "count": 3,
  "totalProjects": 3,
  "totalPages": 1,
  "currentPage": 1,
  "data": [...]
}
```

### 4. Get Overdue Projects

**Endpoint:** `GET /api/projects/overdue`

**Description:** Get all projects that are past their due date and not completed or cancelled.

**Authentication:** Required (`protect` middleware)

**Authorization:** Organization/Client scoped

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (1-100, default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Overdue projects retrieved successfully",
  "count": 2,
  "totalProjects": 2,
  "totalPages": 1,
  "currentPage": 1,
  "data": [
    {
      "_id": "project_id",
      "name": "Legacy System Migration",
      "dueDate": "2024-03-15T23:59:59.000Z",
      "status": "on_hold",
      "priority": "critical",
      "daysOverdue": 45,
      ...
    }
  ]
}
```

### 5. Get Projects Due Soon

**Endpoint:** `GET /api/projects/due-soon`

**Description:** Get projects that are due within a specified number of days.

**Authentication:** Required (`protect` middleware)

**Authorization:** Organization/Client scoped

**Query Parameters:**
- `days` (optional): Number of days to look ahead (1-365, default: 7)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (1-100, default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Projects due within 7 days retrieved successfully",
  "daysFilter": 7,
  "count": 1,
  "totalProjects": 1,
  "totalPages": 1,
  "currentPage": 1,
  "data": [
    {
      "_id": "project_id",
      "name": "API Documentation Update",
      "dueDate": "2024-05-20T23:59:59.000Z",
      "status": "active",
      "priority": "low",
      "daysUntilDue": 3,
      ...
    }
  ]
}
```

### 6. Get Active Projects

**Endpoint:** `GET /api/projects/active`

**Description:** Get all projects with status 'active'.

**Authentication:** Required (`protect` middleware)

**Authorization:** Organization/Client scoped

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (1-100, default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Active projects retrieved successfully",
  "count": 4,
  "totalProjects": 4,
  "totalPages": 1,
  "currentPage": 1,
  "data": [...]
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "q",
      "message": "Search query is required"
    }
  ]
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (invalid status/priority values)
- `500`: Internal Server Error

## Usage Examples

### Search for projects containing "mobile"
```bash
GET /api/projects/search?q=mobile&status=active&page=1&limit=5
```

### Get all high-priority projects
```bash
GET /api/projects/by-priority/high
```

### Find projects due in the next 14 days
```bash
GET /api/projects/due-soon?days=14
```

### Get overdue projects with pagination
```bash
GET /api/projects/overdue?page=1&limit=20
```

## Implementation Notes

1. **Search Algorithm**: The search endpoint uses MongoDB regex with case-insensitive matching across name, description, and tags fields.

2. **Organization Scoping**: All endpoints automatically filter results based on the user's organization.

3. **Client Scoping**: Client users can only see their own projects.

4. **Pagination**: All endpoints support pagination with consistent response format.

5. **Sorting**: 
   - Search results are sorted by creation date (newest first)
   - Status and priority filters are sorted by creation date
   - Overdue projects are sorted by due date (most overdue first)
   - Due soon projects are sorted by due date (soonest first)

6. **Performance**: Consider adding database indexes on frequently queried fields (status, priority, dueDate, organization, client).

## Testing

Use the provided test script to verify all endpoints:

```bash
cd barka-backend/tests
python3 test_project_search_phase3.py
```

The test script creates sample projects and tests all search and filtering functionality.
