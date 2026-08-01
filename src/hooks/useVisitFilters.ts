import { useState, useEffect, useMemo, useCallback } from "react";

export interface VisitFilters {
  selectedYears: string[];
  selectedMonths: string[];
  filterClient: string;
  filterVendor: string;
  filterAddress: string;
  filterManagers: string[];
}

export interface UseVisitFiltersOptions<T> {
  visits: T[];
  getVisitDate: (visit: T) => string;
  getClientCode: (visit: T) => string;
  getVendor: (visit: T) => string;
  getAddress: (visit: T) => string | null;
  getManager: (visit: T) => string;
}

export function useVisitFilters<T>({
  visits,
  getVisitDate,
  getClientCode,
  getVendor,
  getAddress,
  getManager,
}: UseVisitFiltersOptions<T>) {
  // Filter states
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedYears, setSelectedYears] = useState<string[]>([currentYear]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([currentMonth]);
  const [filterClient, setFilterClient] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [filterAddress, setFilterAddress] = useState("");
  const [filterManagers, setFilterManagers] = useState<string[]>([]);

  // Available options extracted from visits
  const availableOptions = useMemo(() => {
    const clients = [...new Set(visits.map(getClientCode))].filter(Boolean).sort();
    const vendors = [...new Set(visits.map(getVendor))].filter(Boolean).sort();
    const managers = [...new Set(visits.map(getManager))].filter(Boolean).sort();
    const dates = visits.map(getVisitDate);
    
    return {
      clients,
      vendors,
      managers,
      dates,
    };
  }, [visits, getClientCode, getVendor, getManager, getVisitDate]);

  // Apply all filters
  const filteredVisits = useMemo(() => {
    let filtered = visits;

    // Date filter (tree selection - months have priority)
    if (selectedMonths.length > 0) {
      filtered = filtered.filter(v => {
        const visitYearMonth = getVisitDate(v).substring(0, 7);
        return selectedMonths.includes(visitYearMonth);
      });
    } else if (selectedYears.length > 0) {
      filtered = filtered.filter(v => {
        const visitYear = getVisitDate(v).split('-')[0];
        return selectedYears.includes(visitYear);
      });
    }

    // Client filter
    if (filterClient) {
      filtered = filtered.filter(v => getClientCode(v) === filterClient);
    }

    // Vendor filter
    if (filterVendor) {
      filtered = filtered.filter(v => getVendor(v) === filterVendor);
    }

    // Address filter (partial match)
    if (filterAddress) {
      filtered = filtered.filter(v => 
        getAddress(v)?.toLowerCase().includes(filterAddress.toLowerCase())
      );
    }

    // Manager filter (multi)
    if (filterManagers.length > 0) {
      filtered = filtered.filter(v => filterManagers.includes(getManager(v)));
    }

    return filtered;
  }, [
    visits,
    selectedYears,
    selectedMonths,
    filterClient,
    filterVendor,
    filterAddress,
    filterManagers,
    getVisitDate,
    getClientCode,
    getVendor,
    getAddress,
    getManager,
  ]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedYears([]);
    setSelectedMonths([]);
    setFilterClient("");
    setFilterVendor("");
    setFilterAddress("");
    setFilterManagers([]);
  }, []);

  // Handle date selection from tree filter
  const handleDateSelectionChange = useCallback((years: string[], months: string[]) => {
    setSelectedYears(years);
    setSelectedMonths(months);
  }, []);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      selectedYears.length > 0 ||
      selectedMonths.length > 0 ||
      filterClient !== "" ||
      filterVendor !== "" ||
      filterAddress !== "" ||
      filterManagers.length > 0
    );
  }, [selectedYears, selectedMonths, filterClient, filterVendor, filterAddress, filterManagers]);

  // Get period days based on filtered visits
  const getPeriodDays = useCallback(() => {
    if (selectedMonths.length > 0 || selectedYears.length > 0) {
      return [...new Set(filteredVisits.map(getVisitDate))].length;
    }
    const dates = filteredVisits.map(v => new Date(getVisitDate(v)));
    if (dates.length === 0) return 0;
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    return Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [filteredVisits, selectedMonths, selectedYears, getVisitDate]);

  return {
    // Filter states
    filters: {
      selectedYears,
      selectedMonths,
      filterClient,
      filterVendor,
      filterAddress,
      filterManagers,
    },
    // Setters
    setSelectedYears,
    setSelectedMonths,
    setFilterClient,
    setFilterVendor,
    setFilterAddress,
    setFilterManagers,
    handleDateSelectionChange,
    // Actions
    clearFilters,
    // Computed values
    filteredVisits,
    availableOptions,
    hasActiveFilters,
    getPeriodDays,
  };
}
