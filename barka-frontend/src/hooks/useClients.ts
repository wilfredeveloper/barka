"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { clientsApi, Client, ClientFilters } from '@/lib/api/clients';
import { handleApiError } from '@/lib/api/index';

interface UseClientsState {
  clients: Client[];
  loading: boolean;
  error: string | null;
  total: number;
}

interface UseClientsActions {
  fetchClients: (filters?: ClientFilters) => Promise<void>;
  fetchClient: (id: string) => Promise<Client | null>;
  createClient: (data: any) => Promise<Client | null>;
  updateClient: (id: string, data: any) => Promise<Client | null>;
  deleteClient: (id: string) => Promise<boolean>;
  refreshClients: () => Promise<void>;
  clearError: () => void;
}

export function useClients(initialFilters?: ClientFilters) {
  const [state, setState] = useState<UseClientsState>({
    clients: [],
    loading: false,
    error: null,
    total: 0,
  });

  // Memoized filters to prevent unnecessary re-renders
  const filters = useMemo(() => initialFilters || {}, [initialFilters]);

  // Fetch clients
  const fetchClients = useCallback(async (newFilters?: ClientFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await clientsApi.getClients(newFilters || filters);
      setState(prev => ({
        ...prev,
        clients: response.clients,
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

  // Fetch single client
  const fetchClient = useCallback(async (id: string): Promise<Client | null> => {
    try {
      const client = await clientsApi.getClient(id);
      
      // Update the client in the list if it exists
      setState(prev => ({
        ...prev,
        clients: prev.clients.map(c => c._id === id ? client : c),
      }));
      
      return client;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Create client with optimistic update
  const createClient = useCallback(async (data: any): Promise<Client | null> => {
    try {
      const newClient = await clientsApi.createClient(data);
      
      setState(prev => ({
        ...prev,
        clients: [newClient, ...prev.clients],
        total: prev.total + 1,
      }));
      
      return newClient;
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, []);

  // Update client with optimistic update
  const updateClient = useCallback(async (id: string, data: any): Promise<Client | null> => {
    const clientToUpdate = state.clients.find(c => c._id === id);
    
    if (clientToUpdate) {
      // Optimistic update
      const optimisticClient = { ...clientToUpdate, ...data };
      setState(prev => ({
        ...prev,
        clients: prev.clients.map(c => c._id === id ? optimisticClient : c),
      }));
    }

    try {
      const updatedClient = await clientsApi.updateClient(id, data);
      
      setState(prev => ({
        ...prev,
        clients: prev.clients.map(c => c._id === id ? updatedClient : c),
      }));
      
      return updatedClient;
    } catch (error) {
      // Revert optimistic update
      if (clientToUpdate) {
        setState(prev => ({
          ...prev,
          clients: prev.clients.map(c => c._id === id ? clientToUpdate : c),
        }));
      }
      
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return null;
    }
  }, [state.clients]);

  // Delete client with optimistic update
  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    const clientToDelete = state.clients.find(c => c._id === id);
    
    // Optimistic update
    setState(prev => ({
      ...prev,
      clients: prev.clients.filter(c => c._id !== id),
      total: prev.total - 1,
    }));

    try {
      await clientsApi.deleteClient(id);
      return true;
    } catch (error) {
      // Revert optimistic update
      if (clientToDelete) {
        setState(prev => ({
          ...prev,
          clients: [...prev.clients, clientToDelete],
          total: prev.total + 1,
        }));
      }
      
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, error: apiError.message }));
      return false;
    }
  }, [state.clients]);

  // Refresh clients
  const refreshClients = useCallback(async () => {
    await fetchClients();
  }, [fetchClients]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo<UseClientsActions>(() => ({
    fetchClients,
    fetchClient,
    createClient,
    updateClient,
    deleteClient,
    refreshClients,
    clearError,
  }), [
    fetchClients,
    fetchClient,
    createClient,
    updateClient,
    deleteClient,
    refreshClients,
    clearError,
  ]);

  return {
    ...state,
    ...actions,
  };
}
