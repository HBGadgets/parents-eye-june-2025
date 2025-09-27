// hooks/useLiveDeviceData.ts
import { useEffect, useRef } from "react";
import { useDeviceStore } from "@/store/deviceStore";
import Cookies from "js-cookie";

export const useLiveDeviceData = () => {
  const store = useDeviceStore();
  const hasInitialized = useRef(false);

  // Auto-connect on mount if token exists
  useEffect(() => {
    const token = Cookies.get("token");

    if (token && !hasInitialized.current) {
      hasInitialized.current = true;

      // Always connect regardless of current connection state
      store.connect();
    }

    // Cleanup on unmount - ALWAYS disconnect
    return () => {
      store.disconnect();
      hasInitialized.current = false;
    };
  }, []); // Keep empty dependency array

  return {
    // Data
    devices: store.deviceData?.filteredData || [],
    counts: [
      { total: store.deviceData?.total || 0 },
      { running: store.deviceData?.runningCount || 0 },
      { idle: store.deviceData?.idleCount || 0 },
      { stopped: store.deviceData?.stoppedCount || 0 },
      { inactive: store.deviceData?.inactiveCount || 0 },
      { new: store.deviceData?.newCount || 0 },
    ],

    // Pagination
    currentPage: store.filters.page,
    totalPages: store.totalPages,
    hasNextPage: store.hasNextPage,
    hasPrevPage: store.hasPrevPage,
    limit: store.filters.limit,

    // Filters
    filters: store.filters,

    // Status
    isLoading: store.isLoading,
    isConnected: store.isConnected,
    isAuthenticated: store.isAuthenticated,
    error: store.error,

    // Actions
    updateFilters: store.updateFilters,
    setPage: store.setPage,
    nextPage: () => store.hasNextPage && store.setPage(store.filters.page + 1),
    prevPage: () => store.hasPrevPage && store.setPage(store.filters.page - 1),
    clearError: store.clearError,
    refreshData: store.refreshData,
  };
};
