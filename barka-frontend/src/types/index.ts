/**
 * Type definitions for the Barka application
 * This file contains interfaces for all entities in the project
 */

// User related types
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  organization?: string | Organization;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'super_admin' | 'org_admin' | 'org_client';

// Organization related types
export interface Organization {
  _id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  industry?: string;
  size?: string;
  address?: Address;
  subscription?: Subscription;
  settings?: OrganizationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface Subscription {
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'trial' | 'expired';
  startDate: string;
  endDate?: string;
  paymentMethod?: string;
}

export interface OrganizationSettings {
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
  };
  notifications?: {
    email: boolean;
    inApp: boolean;
  };
  features?: {
    [key: string]: boolean;
  };
}

// Client related types
export interface Client {
  _id: string;
  user: User | string;
  organization: Organization | string;
  projectType: ProjectType;
  projectTypeOther?: string;
  budget?: number;
  timeline?: Timeline;
  status: ClientStatus;
  requirements?: string[];
  notes?: string;
  onboardingProgress: number;
  onboardingCompletedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientResponse {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  organization: {
    _id: string;
    name: string;
    id: string;
  };
  projectType: ProjectType;
  projectTypeOther: string | null;
  budget: number | null;
  status: ClientStatus;
  requirements: string[];
  notes: string | null;
  onboardingProgress: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export type ProjectType = 'web_development' | 'mobile_app' | 'design' | 'marketing' | 'other';

export type ClientStatus = 'onboarding' | 'active' | 'paused' | 'completed';

export interface Timeline {
  startDate?: string;
  endDate?: string;
  estimatedDuration?: EstimatedDuration;
}

export type EstimatedDuration = '1-4_weeks' | '1-3_months' | '3-6_months' | '6+_months';

// Conversation related types
export interface Conversation {
  _id: string;
  title: string;
  titleGenerated?: boolean;
  client: Client | string;
  organization: Organization | string;
  status: ConversationStatus;
  messages: Message[];
  lastMessageAt?: string;
  messageCount: number;
  metadata?: Record<string, any>;
  adkSessionId?: string;
  adkUserId?: string;
  adkAppName?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConversationStatus = 'active' | 'completed' | 'archived';

export interface Message {
  _id: string;
  conversation: string;
  sender: MessageSender;
  content: string;
  attachments?: Attachment[];
  metadata?: Record<string, any>;
  createdAt: string;
}

export type MessageSender = 'user' | 'agent' | 'system';

// Document related types
export interface Document {
  _id: string;
  name: string;
  client: Client | string;
  organization: Organization | string;
  type: string;
  size: number;
  url: string;
  path: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  _id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  path: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
}

// Form types
export interface ClientFormValues {
  firstName?: string;
  lastName?: string;
  email?: string;
  userId?: string;
  projectType: ProjectType;
  projectTypeOther?: string | null;
  budget?: number | null;
  timeline?: Timeline | null;
  requirements?: string[];
  notes?: string | null;
  status: ClientStatus;
  onboardingProgress?: number;
}

// UI types
export interface TableColumn<T> {
  key: string;
  title: string;
  render?: (item: T) => React.ReactNode;
}

// For dashboard display
export interface ClientListItem {
  id: string;
  name: string;
  email?: string;
  projectType: string;
  status: ClientStatus;
  onboardingProgress: number;
  lastActivity: string;
}

export interface ConversationListItem {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  lastMessageAt: string;
  status: ConversationStatus;
  messageCount: number;
  lastMessage?: string;
}

export interface DocumentType {
  type: string;
  count: number;
  size: number;
}

// Auth types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationName?: string;
}
