// MongoDB initialization script for Barka platform
// This script creates the database and initial collections

// Switch to the application database
db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || 'orka_pro');

// Create collections with validation schemas
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        password: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        role: {
          bsonType: 'string',
          enum: ['user', 'admin', 'superadmin'],
          description: 'must be a string and is required'
        }
      }
    }
  }
});

db.createCollection('organizations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'must be a string and is required'
        }
      }
    }
  }
});

db.createCollection('clients', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'organization'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        organization: {
          bsonType: 'objectId',
          description: 'must be an objectId and is required'
        }
      }
    }
  }
});

db.createCollection('projects', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'createdBy'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        createdBy: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        status: {
          bsonType: 'string',
          enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
          description: 'must be a valid status'
        }
      }
    }
  }
});

db.createCollection('tasks', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'createdBy', 'client', 'organization'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        createdBy: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        client: {
          bsonType: 'objectId',
          description: 'must be an objectId and is required'
        },
        organization: {
          bsonType: 'objectId',
          description: 'must be an objectId and is required'
        },
        status: {
          bsonType: 'string',
          enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
          description: 'must be a valid status'
        }
      }
    }
  }
});

db.createCollection('team_members', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'organization'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        email: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        organization: {
          bsonType: 'objectId',
          description: 'must be an objectId and is required'
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

db.organizations.createIndex({ name: 1 });

db.clients.createIndex({ organization: 1 });
db.clients.createIndex({ name: 1, organization: 1 }, { unique: true });

db.projects.createIndex({ organization: 1 });
db.projects.createIndex({ client: 1 });
db.projects.createIndex({ createdBy: 1 });
db.projects.createIndex({ status: 1 });
db.projects.createIndex({ createdAt: -1 });

db.tasks.createIndex({ project: 1 });
db.tasks.createIndex({ assignedTo: 1 });
db.tasks.createIndex({ client: 1 });
db.tasks.createIndex({ organization: 1 });
db.tasks.createIndex({ status: 1 });
db.tasks.createIndex({ createdAt: -1 });

db.team_members.createIndex({ organization: 1 });
db.team_members.createIndex({ email: 1, organization: 1 }, { unique: true });

print('Database initialization completed successfully');
print('Collections created with validation schemas and indexes');
