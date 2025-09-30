// hooks/useLiveDeviceData.ts
import { useCallback, useEffect, useRef } from "react";
import { useDeviceStore } from "@/store/deviceStore";
import Cookies from "js-cookie";

// Hook for all device data streaming
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

// Hook for single device data streaming
export const useSingleDeviceData = (uniqueId?: string) => {
  const store = useDeviceStore();
  const activeStreamRef = useRef<string | null>(null);

  // Get single device data
  const deviceData = uniqueId ? store.getSingleDeviceData(uniqueId) : null;
  const isActive = uniqueId ? store.isDeviceStreamActive(uniqueId) : false;
  const isLoading = uniqueId ? store.isDeviceLoading(uniqueId) : false;

  // Start streaming for a specific device
  const startStream = useCallback(
    (deviceId: string) => {
      if (!deviceId) {
        console.warn("[useSingleDeviceData] No device ID provided");
        return;
      }

      console.log("[useSingleDeviceData] Starting stream for:", deviceId);
      store.startSingleDeviceStream(deviceId);
      activeStreamRef.current = deviceId;
    },
    [store]
  );

  // Stop streaming for a specific device
  const stopStream = useCallback(
    (deviceId: string) => {
      if (!deviceId) {
        console.warn("[useSingleDeviceData] No device ID provided");
        return;
      }

      console.log("[useSingleDeviceData] Stopping stream for:", deviceId);
      store.stopSingleDeviceStream(deviceId);

      if (activeStreamRef.current === deviceId) {
        activeStreamRef.current = null;
      }
    },
    [store]
  );

  // Clear data for a specific device
  const clearDeviceData = useCallback(
    (deviceId: string) => {
      if (!deviceId) {
        console.warn("[useSingleDeviceData] No device ID provided");
        return;
      }

      console.log("[useSingleDeviceData] Clearing data for:", deviceId);
      store.clearSingleDeviceData(deviceId);

      if (activeStreamRef.current === deviceId) {
        activeStreamRef.current = null;
      }
    },
    [store]
  );

  // Switch back to all devices
  const switchToAllDevices = useCallback(() => {
    console.log("[useSingleDeviceData] Switching to all devices");
    store.switchToAllDevices();
    activeStreamRef.current = null;
  }, [store]);

  // Stop all single device streams
  const stopAllStreams = useCallback(() => {
    console.log("[useSingleDeviceData] Stopping all streams");
    store.stopAllSingleDeviceStreams();
    activeStreamRef.current = null;
  }, [store]);

  // Auto-start stream if uniqueId is provided
  useEffect(() => {
    if (uniqueId && store.isConnected && store.isAuthenticated) {
      // Only start if not already streaming
      if (!store.isDeviceStreamActive(uniqueId)) {
        startStream(uniqueId);
      }
    }

    // Cleanup on unmount or when uniqueId changes
    return () => {
      if (activeStreamRef.current) {
        console.log(
          "[useSingleDeviceData] Cleaning up stream:",
          activeStreamRef.current
        );
        // Don't stop the stream on unmount, just clear the ref
        // The component using this hook should explicitly call stopStream or switchToAllDevices
        activeStreamRef.current = null;
      }
    };
  }, [uniqueId, store.isConnected, store.isAuthenticated]); // Intentionally excluding startStream to avoid re-triggering

  return {
    // Single Device Data
    deviceData,
    isActive,
    isLoading,

    // Connection Status
    isConnected: store.isConnected,
    isAuthenticated: store.isAuthenticated,
    error: store.error,

    // Streaming Status
    streamingMode: store.streamingMode,
    activeDeviceId: store.activeDeviceId,
    activeSingleDevices: Array.from(store.activeSingleDevices),

    // Actions
    startStream,
    stopStream,
    clearDeviceData,
    switchToAllDevices,
    stopAllStreams,
    clearError: store.clearError,

    // Check methods
    isDeviceStreamActive: store.isDeviceStreamActive,
    isDeviceLoading: store.isDeviceLoading,
    isAllDeviceStreamingActive: store.isAllDeviceStreamingActive,
    isSingleDeviceStreamingActive: store.isSingleDeviceStreamingActive,

    // Connection status
    getConnectionStatus: store.getConnectionStatus,
  };
};
