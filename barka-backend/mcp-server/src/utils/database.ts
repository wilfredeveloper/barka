import mongoose from 'mongoose';

// Import existing models from the main backend
// We'll use createRequire for CommonJS modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const Project = require('../../../models/Project.js');
const Task = require('../../../models/Task.js');
const TeamMember = require('../../../models/TeamMember.js');
const Client = require('../../../models/Client.js');
const Organization = require('../../../models/Organization.js');
const User = require('../../../models/User.js');

export interface DatabaseConfig {
  mongoUri: string;
  options?: mongoose.ConnectOptions;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(config: DatabaseConfig): Promise<void> {
    if (this.isConnected) {
      console.log('Database already connected');
      return;
    }

    try {
      const defaultOptions: mongoose.ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      };

      const options = { ...defaultOptions, ...config.options };

      await mongoose.connect(config.mongoUri, options);

      this.isConnected = true;
      console.log('Connected to MongoDB successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public getModels() {
    return {
      Project,
      Task,
      TeamMember,
      Client,
      Organization,
      User
    };
  }
}

// Utility function to get database connection
export const getDatabase = () => DatabaseConnection.getInstance();

// Utility function to get models
export const getModels = () => getDatabase().getModels();

// Environment configuration helper
export const getDatabaseConfig = (): DatabaseConfig => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/orka_pro';
  
  return {
    mongoUri,
    options: {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10'),
      serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT || '5000'),
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000'),
    }
  };
};
