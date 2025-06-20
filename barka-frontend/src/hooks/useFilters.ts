"use client";

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface UseFiltersProps<T> {
  initialFilters?: T;
  syncWithUrl?: boolean;
}

interface UseFiltersReturn<T> {
  filters: T;
  setFilter: (key: keyof T, value: T[keyof T]) => void;
  setFilters: (newFilters: Partial<T>) => void;
  resetFilters: () => void;
  clearFilter: (key: keyof T) => void;
  hasActiveFilters: boolean;
  getFilterCount: () => number;
}

/**
 * Hook for managing filter state with optional URL synchronization
 * @param initialFilters - Initial filter values
 * @param syncWithUrl - Whether to sync filters with URL search params
 * @returns Filter state and actions
 */
export function useFilters<T extends Record<string, any>>({
  initialFilters = {} as T,
  syncWithUrl = false,
}: UseFiltersProps<T> = {}): UseFiltersReturn<T> {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filters from URL if syncing, otherwise use initial filters
  const [filters, setFiltersState] = useState<T>(() => {
    if (syncWithUrl && searchParams) {
      const urlFilters = {} as T;
      
      // Parse filters from URL search params
      Object.keys(initialFilters).forEach((key) => {
        const value = searchParams.get(key);
        if (value !== null) {
          // Try to parse as JSON for complex values, fallback to string
          try {
            urlFilters[key as keyof T] = JSON.parse(value);
          } catch {
            urlFilters[key as keyof T] = value as T[keyof T];
          }
        }
      });
      
      return { ...initialFilters, ...urlFilters };
    }
    
    return initialFilters;
  });

  // Update URL when filters change (if syncing is enabled)
  const updateUrl = useCallback((newFilters: T) => {
    if (!syncWithUrl) return;

    const params = new URLSearchParams();
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object') {
          params.set(key, JSON.stringify(value));
        } else {
          params.set(key, String(value));
        }
      }
    });

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    
    router.replace(newUrl, { scroll: false });
  }, [syncWithUrl, router]);

  // Set a single filter
  const setFilter = useCallback((key: keyof T, value: T[keyof T]) => {
    const newFilters = { ...filters, [key]: value };
    setFiltersState(newFilters);
    updateUrl(newFilters);
  }, [filters, updateUrl]);

  // Set multiple filters
  const setFilters = useCallback((newFilters: Partial<T>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFiltersState(updatedFilters);
    updateUrl(updatedFilters);
  }, [filters, updateUrl]);

  // Reset all filters to initial state
  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters);
    updateUrl(initialFilters);
  }, [initialFilters, updateUrl]);

  // Clear a specific filter
  const clearFilter = useCallback((key: keyof T) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFiltersState(newFilters);
    updateUrl(newFilters);
  }, [filters, updateUrl]);

  // Check if any filters are active (different from initial)
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => {
      const currentValue = filters[key as keyof T];
      const initialValue = initialFilters[key as keyof T];
      
      // Handle array comparison
      if (Array.isArray(currentValue) && Array.isArray(initialValue)) {
        return JSON.stringify(currentValue) !== JSON.stringify(initialValue);
      }
      
      // Handle object comparison
      if (typeof currentValue === 'object' && typeof initialValue === 'object') {
        return JSON.stringify(currentValue) !== JSON.stringify(initialValue);
      }
      
      return currentValue !== initialValue;
    });
  }, [filters, initialFilters]);

  // Get count of active filters
  const getFilterCount = useCallback(() => {
    return Object.keys(filters).filter(key => {
      const value = filters[key as keyof T];
      return value !== undefined && value !== null && value !== '';
    }).length;
  }, [filters]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    clearFilter,
    hasActiveFilters,
    getFilterCount,
  };
}
