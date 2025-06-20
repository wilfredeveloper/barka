# Client Tools Implementation

## Overview

This document describes the client-related tools available in the MCP server, specifically designed to help the project manager agent resolve client information when `client_id` is missing from session state (e.g., for admin users).

## Available Client Tools

### 1. `list_clients` (Enhanced Existing Tool)

**Purpose**: Browse all clients in an organization with comprehensive information.

**Function Signature**:
```python
def list_clients(organization_id: str) -> Dict
```

**Parameters**:
- `organization_id` (required): Organization ID to scope the client list

**Returns**: Paginated list of clients with user information, organization details, and metadata.

**Usage Examples**:
```python
# List all clients in organization
result = list_clients("org_123")

# Response includes comprehensive client data
{
  "status": "success",
  "data": {
    "clients": [
      {
        "_id": "client_id",
        "userInfo": {
          "firstName": "John",
          "lastName": "Doe", 
          "email": "john@example.com"
        },
        "organizationInfo": {
          "name": "Tech Solutions Inc"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

### 2. `get_client` (New Tool)

**Purpose**: Flexible single client lookup by ID, name, email, or project association.

**Function Signature**:
```python
def get_client(organization_id: str, client_id: Optional[str] = None, 
               client_name: Optional[str] = None, project_id: Optional[str] = None) -> Dict
```

**Parameters**:
- `organization_id` (required): Organization ID to scope the search
- `client_id` (optional): Direct client ID lookup
- `client_name` (optional): Client name search (searches firstName, lastName, email)
- `project_id` (optional): Project ID to find associated client

**Validation Rules**:
- Exactly ONE of `client_id`, `client_name`, or `project_id` must be provided
- Multiple search parameters will return an error
- No search parameters will return an error

**Returns**: Comprehensive client information including user details, organization info, associated projects, and search metadata.

## Search Methods

### Method 1: Direct ID Lookup
```python
result = get_client(organization_id="org_123", client_id="client_456")
```
- Fastest and most precise method
- Used when you already have the client ID

### Method 2: Name-Based Search
```python
result = get_client(organization_id="org_123", client_name="John Doe")
result = get_client(organization_id="org_123", client_name="john@example.com")
result = get_client(organization_id="org_123", client_name="John")  # Partial match
```

**Name matching logic**:
- Searches `firstName`, `lastName`, `email` fields
- Case-insensitive matching
- Supports partial matches (e.g., "John" matches "John Doe")
- Supports full name matching (e.g., "John Doe")
- Supports email exact matching

### Method 3: Project Association
```python
result = get_client(organization_id="org_123", project_id="project_789")
```
- Finds the client associated with a specific project
- Useful when user mentions project context
- Returns error if project has no associated client

## Response Structure

### Successful Response
```json
{
  "status": "success",
  "data": {
    "_id": "client_id",
    "id": "client_id",
    "userInfo": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "organizationInfo": {
      "_id": "org_id",
      "name": "Tech Solutions Inc",
      "contactEmail": "contact@techsolutions.com",
      "website": "https://techsolutions.com"
    },
    "associatedProjects": [
      {
        "_id": "project_id",
        "name": "Website Redesign",
        "status": "active",
        "priority": "high",
        "budget": 15000,
        "currency": "USD"
      }
    ],
    "projectCount": 3,
    "searchMetadata": {
      "searchMethod": "client_name",
      "searchTerm": "John Doe",
      "foundAt": "2024-01-20T10:30:00Z"
    }
  }
}
```

### Error Response
```json
{
  "status": "error",
  "error_message": "No client found matching name 'NonExistent'"
}
```

## Project Manager Agent Integration

### Admin User Workflow

When admin users need `client_id` but don't have it in session state:

#### Scenario 1: User Mentions Client by Name
```
User: "Show me tasks for client named Mbugua"

Agent Workflow:
1. Call get_client(organization_id, client_name="Mbugua")
2. Extract client_id from response
3. Call list_tasks(organization_id, client_id=resolved_id)
4. Present results: "I found tasks for Victor Mbugua: ..."
```

#### Scenario 2: User Mentions Project Context
```
User: "Who is the client for the hackathon project?"

Agent Workflow:
1. Call get_client(organization_id, project_id="hackathon_project_id")
2. Present client information
3. Response: "The client for the hackathon project is Victor Mbugua from Tech Solutions Inc."
```

#### Scenario 3: User Wants to Browse Clients
```
User: "Show me all our clients"

Agent Workflow:
1. Call list_clients(organization_id)
2. Present organized results
3. Response: "Here are your 5 clients: • Victor Mbugua - 3 active projects ..."
```

#### Scenario 4: Task Creation with Auto-Resolution
```
User: "Create a task for the website project"

Agent Workflow:
1. Call get_project(project_id) to get project details
2. Call create_task(title="...", project_id="...") 
3. client_id automatically resolved from project
```

## Error Handling

### Common Error Scenarios

1. **No Search Parameters**:
   ```json
   {"status": "error", "error_message": "At least one of client_id, client_name, or project_id must be provided"}
   ```

2. **Multiple Search Parameters**:
   ```json
   {"status": "error", "error_message": "Please provide only one search parameter: client_id, client_name, or project_id"}
   ```

3. **Client Not Found**:
   ```json
   {"status": "error", "error_message": "No client found matching name 'NonExistent'"}
   ```

4. **Project Has No Client**:
   ```json
   {"status": "error", "error_message": "Project has no associated client"}
   ```

5. **Invalid Object ID**:
   ```json
   {"status": "error", "error_message": "Invalid client_id format"}
   ```

## Best Practices

### For Project Manager Agent

1. **Always Use One Search Parameter**: Don't combine multiple search methods
2. **Handle Partial Matches**: The name search is flexible and supports partial matching
3. **Confirm Matches**: When resolving by name, confirm the match with the user
4. **Use Project Context**: When possible, use project association for client resolution
5. **Cache Results**: Store resolved client_id for subsequent operations in the same conversation

### For Error Recovery

1. **Graceful Degradation**: If client resolution fails, offer alternatives
2. **User Guidance**: Suggest available clients when search fails
3. **Context Preservation**: Maintain conversation context even when resolution fails

## Performance Considerations

- **Direct ID lookup**: Fastest method (single database query)
- **Name search**: Moderate performance (searches through organization clients)
- **Project association**: Fast (single project lookup + client fetch)
- **List clients**: Moderate performance (paginated results, 20 per page)

## Security Features

- **Organization Scoping**: All searches are scoped to the user's organization
- **Data Sanitization**: Sensitive fields (passwords, tokens) are excluded
- **Access Control**: Respects organization-level permissions
- **Audit Trail**: Search metadata tracks resolution method and timing

## Testing

Use the test script at `tests/test_client_tools.py` to verify:
- Both `list_clients` and `get_client` functionality
- All search methods (ID, name, email, project)
- Error handling for invalid inputs
- Admin user workflow scenarios

This implementation provides the project manager agent with powerful, flexible client resolution capabilities that eliminate the need to prompt users for client_id while maintaining security and performance.
