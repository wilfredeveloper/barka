"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { organizationsApi, Organization, OrganizationFilters } from '@/lib/api/organizations';
import { handleApiError } from '@/lib/api/index';

interface UseOrganizationsState {
  organizations: Organization[];
  loading: boolean;
  error: string | null;
  total: number;
  currentUserOrganization: Organization | null;
}

interface UseOrganizationsActions {
  fetchOrganizations: (filters?: OrganizationFilters) => Promise<void>;
  fetchOrganization: (id: string) => Promise<Organization | null>;
  fetchCurrentUserOrganization: () => Promise<void>;
  createOrganization: (data: any) => Promise<Organization | null>;
  updateOrganization: (id: string, data: any) => Promise<Organization | null>;
  deleteOrganization: (id: string) => Promise<boolean>;
  refreshOrganizations: () => Promise<void>;
  clearError: () => void;
}

export function useOrganizations(initialFilters?: OrganizationFilters) {
  const [state, setState] = useState<UseOrganizationsState>({
    organizations: [],
    loading: false,
    error: null,
    total: 0,
    currentUserOrganization: null,
  });

  // Memoized filters to prevent unnecessary re-renders
  const filters = useMemo(() => initialFilters || {}, [initialFilters]);

  // Fetch organizations
  const fetchOrganizations = useCallback(async (newFilters?: OrganizationFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await organizationsApi.getOrganizations(newFilters || filters);
      setState(prev => ({
        ...prev,
        organizations: response.organizations,
        total: response.total,
        loading: false,
      }));
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({
        ...prev,
        error: apiError.message,
        loading: false,
      }));
    }
  }, [filters]);

  // Fetch single organization
  const fetchOrganization = useCallback(async (id: string): Promise<Organization | null> => {
    try {
      const organization = await organizationsApi.getOrganization(id);
      return organization;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Fetch current user's organization
  const fetchCurrentUserOrganization = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const organization = await organizationsApi.getCurrentUserOrganization();
      setState(prev => ({
        ...prev,
        currentUserOrganization: organization,
        loading: false,
      }));
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({
        ...prev,
        error: apiError.message,
        loading: false,
      }));
    }
  }, []);

  // Create organization
  const createOrganization = useCallback(async (data: any): Promise<Organization | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const organization = await organizationsApi.createOrganization(data);
      setState(prev => ({
        ...prev,
        organizations: [...prev.organizations, organization],
        total: prev.total + 1,
        loading: false,
      }));
      return organization;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({
        ...prev,
        error: apiError.message,
        loading: false,
      }));
      return null;
    }
  }, []);

  // Update organization
  const updateOrganization = useCallback(async (id: string, data: any): Promise<Organization | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const updatedOrganization = await organizationsApi.updateOrganization(id, data);
      setState(prev => ({
        ...prev,
        organizations: prev.organizations.map(org => 
          org._id === id ? updatedOrganization : org
        ),
        currentUserOrganization: prev.currentUserOrganization?._id === id 
          ? updatedOrganization 
          : prev.currentUserOrganization,
        loading: false,
      }));
      return updatedOrganization;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({
        ...prev,
        error: apiError.message,
        loading: false,
      }));
      return null;
    }
  }, []);

  // Delete organization
  const deleteOrganization = useCallback(async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await organizationsApi.deleteOrganization(id);
      setState(prev => ({
        ...prev,
        organizations: prev.organizations.filter(org => org._id !== id),
        total: prev.total - 1,
        currentUserOrganization: prev.currentUserOrganization?._id === id 
          ? null 
          : prev.currentUserOrganization,
        loading: false,
      }));
      return true;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({
        ...prev,
        error: apiError.message,
        loading: false,
      }));
      return false;
    }
  }, []);

  // Refresh organizations
  const refreshOrganizations = useCallback(async () => {
    await fetchOrganizations();
  }, [fetchOrganizations]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo<UseOrganizationsActions>(() => ({
    fetchOrganizations,
    fetchOrganization,
    fetchCurrentUserOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    refreshOrganizations,
    clearError,
  }), [
    fetchOrganizations,
    fetchOrganization,
    fetchCurrentUserOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    refreshOrganizations,
    clearError,
  ]);

  return {
    ...state,
    ...actions,
  };
}
