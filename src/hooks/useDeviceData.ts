"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Device, DeviceResponse } from "@/interface/modal";

interface UseDeviceDataOptions {
  searchTerm?: string;
}

export const useDeviceData = (options: UseDeviceDataOptions = {}) => {
  const { searchTerm } = options;
  
  return useInfiniteQuery({
    queryKey: ["deviceData", searchTerm],
    queryFn: async ({ pageParam = 1 }) => {
      const searchQuery = searchTerm ? `&deviceName=${encodeURIComponent(searchTerm)}` : '';
      const response = await api.get<DeviceResponse[]>(`/device?page=${pageParam}&limit=50${searchQuery}`);
      return response.devices;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 50) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
  });
};