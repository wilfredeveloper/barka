// Export all API services and types
export * from './projects';
export * from './tasks';
export * from './team';
export * from './analytics';
export * from './organizations';

// Re-export the base API instance
export { default as api } from '../api';

// Common error handling utility
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Common response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

// Pagination interface
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Common filter interface
export interface BaseFilters {
  limit?: number;
  offset?: number;
  page?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Date range filter
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

// Status filter options
export type StatusFilter = 'active' | 'inactive' | 'completed' | 'pending' | 'cancelled';

// Priority filter options
export type PriorityFilter = 'low' | 'medium' | 'high' | 'urgent';

// Utility function to handle API errors
export function handleApiError(error: any): ApiError {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    return new ApiError(
      data.message || 'An error occurred',
      status,
      data.code,
      data.details
    );
  } else if (error.request) {
    // Request was made but no response received
    return new ApiError('Network error - please check your connection');
  } else {
    // Something else happened
    return new ApiError(error.message || 'An unexpected error occurred');
  }
}

// Utility function to build query parameters
export function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item.toString()));
      } else {
        searchParams.append(key, value.toString());
      }
    }
  });
  
  return searchParams.toString();
}

// Utility function for optimistic updates
export function createOptimisticUpdate<T>(
  currentData: T[],
  newItem: Partial<T> & { _id?: string },
  operation: 'create' | 'update' | 'delete'
): T[] {
  switch (operation) {
    case 'create':
      return [...currentData, { ...newItem, _id: `temp-${Date.now()}` } as T];
    case 'update':
      return currentData.map(item => 
        (item as any)._id === newItem._id ? { ...item, ...newItem } : item
      );
    case 'delete':
      return currentData.filter(item => (item as any)._id !== newItem._id);
    default:
      return currentData;
  }
}

// Utility function for cache invalidation
export function createCacheKey(endpoint: string, params?: Record<string, any>): string {
  const baseKey = endpoint.replace(/^\//, '').replace(/\//g, '_');
  if (!params) return baseKey;
  
  const paramString = buildQueryParams(params);
  return paramString ? `${baseKey}_${paramString}` : baseKey;
}

// Debounce utility for search
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Retry utility for failed requests
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw lastError!;
}

// Export all API modules
export * from './projects';
export * from './tasks';
export * from './team';
export * from './clients';
export * from './analytics';
export * from './organizations';
