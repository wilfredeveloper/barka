import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'org_admin' | 'org_client';
  organizationId?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    organization?: string;
  };
}

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', credentials);

  // Store token in localStorage
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }

  return response.data;
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', data);

  // Store token in localStorage
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }

  return response.data;
};

export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = (): any => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const user = localStorage.getItem('user');
    if (!user) return null;

    const parsedUser = JSON.parse(user);
    // Validate that the parsed user has the expected properties
    if (!parsedUser || typeof parsedUser !== 'object' || !parsedUser.id || !parsedUser.role) {
      // If user data is invalid, clear it and return null
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }

    return parsedUser;
  } catch (error) {
    // If there's an error parsing the user, clear localStorage and return null
    console.error('Error parsing user from localStorage:', error);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Check if both token and user exist
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      return false;
    }

    // Validate that the user data is valid
    const parsedUser = JSON.parse(user);
    return !!(parsedUser && typeof parsedUser === 'object' && parsedUser.id && parsedUser.role);
  } catch (error) {
    // If there's an error, clear localStorage and return false
    console.error('Error checking authentication status:', error);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return false;
  }
};
