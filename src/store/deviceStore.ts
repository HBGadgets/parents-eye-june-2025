import { create } from "zustand";
import { devtools } from "zustand/middleware";
import DeviceService, {
  SingleDeviceData,
} from "@/services/livetrack/DeviceService";
import { AllDeviceResponse } from "@/types/socket";

export interface DeviceFilters {
  page: number;
  limit: number;
  filter:
    | "all"
    | "running"
    | "overspeed"
    | "idle"
    | "stopped"
    | "inactive"
    | "new";
  searchTerm: string;
}

// Enhanced auth data interface
interface AuthData {
  role: string;
  message: string;
}

// Streaming modes
type StreamingMode = "all" | "single" | null;

interface DeviceState {
  // Data
  deviceData: AllDeviceResponse | null;
  singleDeviceData: Map<string, SingleDeviceData>;
  filters: DeviceFilters;

  // Connection status
  isConnected: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userRole: string | null;

  // Streaming state
  streamingMode: StreamingMode;
  activeDeviceId: string | null;
  activeSingleDevices: Set<string>;
  singleDeviceLoading: Set<string>;

  // Pagination helpers
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  updateFilters: (newFilters: Partial<DeviceFilters>) => void;
  setPage: (page: number) => void;
  clearError: () => void;
  refreshData: () => void;

  // Single device actions
  startSingleDeviceStream: (uniqueId: string) => void;
  stopSingleDeviceStream: (uniqueId: string) => void;
  stopAllSingleDeviceStreams: () => void;
  switchToAllDevices: () => void; // Added this method
  getSingleDeviceData: (uniqueId: string) => SingleDeviceData | null;
  clearSingleDeviceData: (uniqueId: string) => void;
  clearAllSingleDeviceData: () => void;

  // Stream state checks
  isDeviceStreamActive: (uniqueId: string) => boolean;
  isDeviceLoading: (uniqueId: string) => boolean;
  isAllDeviceStreamingActive: () => boolean;
  isSingleDeviceStreamingActive: () => boolean;

  // Utility methods
  getConnectionStatus: () => {
    connected: boolean;
    authenticated: boolean;
    streamingMode: StreamingMode;
    activeDeviceId: string | null;
    activeSingleDevices: string[];
    userRole: string | null;
  };
}

const initialFilters: DeviceFilters = {
  page: 1,
  limit: 10,
  filter: "all",
  searchTerm: "",
};

export const useDeviceStore = create<DeviceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      deviceData: null,
      singleDeviceData: new Map(),
      filters: initialFilters,
      isConnected: false,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userRole: null,
      streamingMode: null,
      activeDeviceId: null,
      activeSingleDevices: new Set(),
      singleDeviceLoading: new Set(),
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,

      // Actions
      connect: async () => {
        const deviceService = DeviceService.getInstance();
        set({ isLoading: true, error: null });

        try {
          await deviceService.connect({
            onDataReceived: (data: AllDeviceResponse) => {
              const state = get();
              const totalPages = Math.ceil(data.total / state.filters.limit);

              set({
                deviceData: data,
                isLoading: false,
                streamingMode: "all",
                totalPages,
                hasNextPage: state.filters.page < totalPages,
                hasPrevPage: state.filters.page > 1,
              });
            },

            onSingleDeviceDataReceived: (data: SingleDeviceData) => {
              // console.log(
              //   "[DeviceStore] Received single device data:",
              //   data.uniqueId || data.imei
              // );

              set((state) => {
                const newSingleDeviceData = new Map(state.singleDeviceData);
                const newSingleDeviceLoading = new Set(
                  state.singleDeviceLoading
                );

                const deviceKey = data.uniqueId || data.imei;

                // Update the device data
                newSingleDeviceData.set(deviceKey, data);

                // Remove from loading set if it was loading
                newSingleDeviceLoading.delete(deviceKey);

                return {
                  singleDeviceData: newSingleDeviceData,
                  singleDeviceLoading: newSingleDeviceLoading,
                  streamingMode: "single" as StreamingMode,
                  activeDeviceId: deviceKey,
                };
              });
            },

            onAuthSuccess: (authData?: AuthData) => {
              // console.log(
              //   "[DeviceStore] Authentication successful:",
              //   authData?.role || "Unknown role"
              // );

              set({
                isAuthenticated: true,
                userRole: authData?.role || null,
                error: null,
              });

              // Request initial data after authentication
              const state = get();
              if (state.streamingMode !== "single") {
                deviceService.requestDeviceData(state.filters);
              }

              // Restore any active single device streams
              if (state.activeSingleDevices.size > 0) {
                state.activeSingleDevices.forEach((uniqueId) => {
                  deviceService.requestSingleDeviceData(uniqueId, false);
                });
              }
            },

            onError: (error: string) => {
              console.error("[DeviceStore] Error:", error);

              set({
                error,
                isLoading: false,
              });

              // Handle authentication errors
              if (
                error.includes("token") ||
                error.includes("auth") ||
                error.includes("Invalid") ||
                error.includes("expired")
              ) {
                set({
                  isAuthenticated: false,
                  userRole: null,
                  streamingMode: null,
                  activeDeviceId: null,
                });
              }
            },

            onConnectionChange: (connected: boolean) => {
              // console.log(
              //   "[DeviceStore] Connection status changed:",
              //   connected
              // );

              set({ isConnected: connected });

              if (!connected) {
                set({
                  isAuthenticated: false,
                  userRole: null,
                  streamingMode: null,
                  activeDeviceId: null,
                  singleDeviceLoading: new Set(),
                  error: connected === false ? "Connection lost" : null,
                });
              } else {
                // Clear connection error when reconnected
                const currentState = get();
                if (currentState.error === "Connection lost") {
                  set({ error: null });
                }
              }
            },
          });
        } catch (error) {
          console.error("[DeviceStore] Connection failed:", error);
          set({
            error: "Failed to initialize connection",
            isLoading: false,
          });
        }
      },

      disconnect: () => {
        // console.log("[DeviceStore] Disconnecting");

        const deviceService = DeviceService.getInstance();
        deviceService.disconnect();

        set({
          isConnected: false,
          isAuthenticated: false,
          userRole: null,
          deviceData: null,
          singleDeviceData: new Map(),
          streamingMode: null,
          activeDeviceId: null,
          activeSingleDevices: new Set(),
          singleDeviceLoading: new Set(),
          error: null,
        });
      },

      updateFilters: (newFilters: Partial<DeviceFilters>) => {
        const state = get();
        const updatedFilters = { ...state.filters, ...newFilters };

        // Reset to page 1 if filter/search changes
        if (newFilters.filter || newFilters.searchTerm !== undefined) {
          updatedFilters.page = 1;
        }

        set({ filters: updatedFilters, isLoading: true });

        const deviceService = DeviceService.getInstance();
        if (deviceService.authenticated) {
          deviceService.requestDeviceData(updatedFilters);
        }
      },

      setPage: (page: number) => {
        const state = get();
        if (page < 1 || page > state.totalPages) return;

        const updatedFilters = { ...state.filters, page };
        set({ filters: updatedFilters, isLoading: true });

        const deviceService = DeviceService.getInstance();
        if (deviceService.authenticated) {
          deviceService.requestDeviceData(updatedFilters);
        }
      },

      clearError: () => {
        set({ error: null });
      },

      refreshData: () => {
        const state = get();
        set({ isLoading: true });

        const deviceService = DeviceService.getInstance();
        if (deviceService.authenticated) {
          if (state.streamingMode === "all") {
            deviceService.requestDeviceData(state.filters);
          } else if (state.streamingMode === "single" && state.activeDeviceId) {
            deviceService.requestSingleDeviceData(state.activeDeviceId, false);
          }
        }
      },

      // Enhanced single device actions
      startSingleDeviceStream: (uniqueId: string) => {
        const deviceService = DeviceService.getInstance();

        if (!deviceService.authenticated || !deviceService.connected) {
          set({
            error: "Cannot start device stream: Not connected or authenticated",
          });
          return;
        }

        if (!uniqueId?.trim()) {
          set({ error: "Device ID is required" });
          return;
        }

        // console.log("[DeviceStore] Starting single device stream:", uniqueId);

        set((state) => {
          const newActiveSingleDevices = new Set(state.activeSingleDevices);
          const newSingleDeviceLoading = new Set(state.singleDeviceLoading);

          newActiveSingleDevices.add(uniqueId);
          newSingleDeviceLoading.add(uniqueId);

          return {
            activeSingleDevices: newActiveSingleDevices,
            singleDeviceLoading: newSingleDeviceLoading,
            streamingMode: "single" as StreamingMode,
            activeDeviceId: uniqueId,
            error: null,
          };
        });

        deviceService.requestSingleDeviceData(uniqueId);
      },

      stopSingleDeviceStream: (uniqueId: string) => {
        // console.log("[DeviceStore] Stopping single device stream:", uniqueId);

        const deviceService = DeviceService.getInstance();
        deviceService.stopSingleDeviceStream(uniqueId);

        set((state) => {
          const newActiveSingleDevices = new Set(state.activeSingleDevices);
          const newSingleDeviceLoading = new Set(state.singleDeviceLoading);
          const newSingleDeviceData = new Map(state.singleDeviceData);

          newActiveSingleDevices.delete(uniqueId);
          newSingleDeviceLoading.delete(uniqueId);
          newSingleDeviceData.delete(uniqueId);

          const hasActiveStreams = newActiveSingleDevices.size > 0;

          return {
            activeSingleDevices: newActiveSingleDevices,
            singleDeviceLoading: newSingleDeviceLoading,
            singleDeviceData: newSingleDeviceData,
            streamingMode: hasActiveStreams ? "single" : null,
            activeDeviceId: hasActiveStreams ? state.activeDeviceId : null,
          };
        });

        // If no more single device streams, switch back to all devices
        const updatedState = get();
        if (updatedState.activeSingleDevices.size === 0) {
          // console.log(
          //   "[DeviceStore] No more single device streams, switching to all devices"
          // );
          updatedState.switchToAllDevices();
        }
      },

      stopAllSingleDeviceStreams: () => {
        // console.log("[DeviceStore] Stopping all single device streams");

        const deviceService = DeviceService.getInstance();
        deviceService.stopAllSingleDeviceStreams();

        set({
          singleDeviceData: new Map(),
          activeSingleDevices: new Set(),
          singleDeviceLoading: new Set(),
          streamingMode: null,
          activeDeviceId: null,
        });

        // Switch back to all devices
        const state = get();
        state.switchToAllDevices();
      },

      // NEW: Switch to all devices method
      switchToAllDevices: () => {
        // console.log("[DeviceStore] Switching to all devices mode");

        const state = get();
        const deviceService = DeviceService.getInstance();

        // Only proceed if authenticated and connected
        if (!deviceService.authenticated || !deviceService.connected) {
          // console.warn(
          //   "[DeviceStore] Cannot switch to all devices: Not connected or authenticated"
          // );
          return;
        }

        // Stop all single device streams first
        deviceService.stopAllSingleDeviceStreams();

        // Clear single device state
        set({
          singleDeviceData: new Map(),
          activeSingleDevices: new Set(),
          singleDeviceLoading: new Set(),
          streamingMode: null,
          activeDeviceId: null,
          isLoading: true,
        });

        // Request all device data
        // console.log(
        //   "[DeviceStore] Requesting all device data with filters:",
        //   state.filters
        // );
        deviceService.requestDeviceData(state.filters);
      },

      getSingleDeviceData: (uniqueId: string) => {
        const state = get();
        return state.singleDeviceData.get(uniqueId) || null;
      },

      clearSingleDeviceData: (uniqueId: string) => {
        // console.log("[DeviceStore] Clearing single device data:", uniqueId);

        const deviceService = DeviceService.getInstance();
        deviceService.stopSingleDeviceStream(uniqueId);

        set((state) => {
          const newSingleDeviceData = new Map(state.singleDeviceData);
          const newActiveSingleDevices = new Set(state.activeSingleDevices);
          const newSingleDeviceLoading = new Set(state.singleDeviceLoading);

          newSingleDeviceData.delete(uniqueId);
          newActiveSingleDevices.delete(uniqueId);
          newSingleDeviceLoading.delete(uniqueId);

          const hasActiveStreams = newActiveSingleDevices.size > 0;

          return {
            singleDeviceData: newSingleDeviceData,
            activeSingleDevices: newActiveSingleDevices,
            singleDeviceLoading: newSingleDeviceLoading,
            streamingMode: hasActiveStreams ? "single" : null,
            activeDeviceId: hasActiveStreams ? state.activeDeviceId : null,
          };
        });

        // If no more single device streams, switch back to all devices
        const updatedState = get();
        if (updatedState.activeSingleDevices.size === 0) {
          // console.log(
          //   "[DeviceStore] No more single device streams, switching to all devices"
          // );
          updatedState.switchToAllDevices();
        }
      },

      clearAllSingleDeviceData: () => {
        // console.log("[DeviceStore] Clearing all single device data");

        const deviceService = DeviceService.getInstance();
        deviceService.stopAllSingleDeviceStreams();

        set({
          singleDeviceData: new Map(),
          activeSingleDevices: new Set(),
          singleDeviceLoading: new Set(),
          streamingMode: null,
          activeDeviceId: null,
        });

        // Switch back to all devices
        const state = get();
        state.switchToAllDevices();
      },

      // Stream state checks
      isDeviceStreamActive: (uniqueId: string) => {
        const state = get();
        return state.activeSingleDevices.has(uniqueId);
      },

      isDeviceLoading: (uniqueId: string) => {
        const state = get();
        return state.singleDeviceLoading.has(uniqueId);
      },

      isAllDeviceStreamingActive: () => {
        const state = get();
        return state.streamingMode === "all";
      },

      isSingleDeviceStreamingActive: () => {
        const state = get();
        return state.streamingMode === "single";
      },

      // Utility methods
      getConnectionStatus: () => {
        const state = get();
        return {
          connected: state.isConnected,
          authenticated: state.isAuthenticated,
          streamingMode: state.streamingMode,
          activeDeviceId: state.activeDeviceId,
          activeSingleDevices: Array.from(state.activeSingleDevices),
          userRole: state.userRole,
        };
      },
    }),
    {
      name: "device-store",
      partialize: (state) => ({
        // Only persist filters and non-sensitive data
        filters: state.filters,
      }),
    }
  )
);

// Export selectors for performance optimization
export const useDeviceData = () => useDeviceStore((state) => state.deviceData);
export const useConnectionStatus = () =>
  useDeviceStore((state) => ({
    isConnected: state.isConnected,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    userRole: state.userRole,
  }));
export const useStreamingStatus = () =>
  useDeviceStore((state) => ({
    streamingMode: state.streamingMode,
    activeDeviceId: state.activeDeviceId,
    activeSingleDevices: Array.from(state.activeSingleDevices),
  }));
