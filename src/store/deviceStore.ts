import { create } from "zustand";
import { devtools } from "zustand/middleware";
import DeviceService from "@/services/livetrack/DeviceService";
import { AllDeviceResponse } from "@/types/socket";

export interface DeviceFilters {
  page: number;
  limit: number;
  filter: "all" | "running" | "idle" | "stopped" | "inactive" | "new";
  searchTerm: string;
}

interface DeviceState {
  // Data
  deviceData: AllDeviceResponse | null;
  filters: DeviceFilters;

  // Connection status
  isConnected: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

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
      filters: initialFilters,
      isConnected: false,
      isAuthenticated: false,
      isLoading: false,
      error: null,
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
                totalPages,
                hasNextPage: state.filters.page < totalPages,
                hasPrevPage: state.filters.page > 1,
              });
            },

            onAuthSuccess: () => {
              set({ isAuthenticated: true });
              // Request initial data after authentication
              const state = get();
              deviceService.requestDeviceData(state.filters);
            },

            onError: (error: string) => {
              set({
                error,
                isLoading: false,
                isAuthenticated: false,
              });
            },

            onConnectionChange: (connected: boolean) => {
              set({ isConnected: connected });
              if (!connected) {
                set({ isAuthenticated: false });
              }
            },
          });
        } catch (error) {
          set({
            error: "Failed to initialize connection",
            isLoading: false,
          });
        }
      },

      disconnect: () => {
        const deviceService = DeviceService.getInstance();
        deviceService.disconnect();
        set({
          isConnected: false,
          isAuthenticated: false,
          deviceData: null,
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
          deviceService.requestDeviceData(state.filters);
        }
      },
    }),
    {
      name: "device-store", // For Redux DevTools
    }
  )
);
