"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Device } from "@/interface/modal";

interface DeviceParams {
  search?: string;
  limit?: number;
  from?: string;
  to?: string;
  schoolId?: string;
  branchId?: string;
  role?: "admin" | "user" | "superAdmin" | "school" | "branch";
}

interface DeviceResponse {
  success: boolean;
  message: string;
  currentPage?: number;
  totalPages?: number;
  totalRecords?: number;
  data?: Device[];
  devices?: Device[]; // Sometimes APIs return 'devices' instead of 'data'
  // Add any other fields your API actually returns
}

export const useInfiniteDeviceData = (params?: DeviceParams) => {
  const {
    search = "",
    limit = 20,
    from,
    to,
    schoolId,
    branchId,
    role,
  } = params || {};

  const shouldFetch = (() => {
    if (role === "branch") return true;
    if (role === "superAdmin" || role === "school") return !!branchId;
    return !!(branchId || schoolId);
  })();

  return useInfiniteQuery({
    queryKey: [
      "infiniteDevices",
      { search, limit, from, to, schoolId, branchId, role },
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      queryParams.append("page", pageParam.toString());
      queryParams.append("limit", limit.toString());
      if (from) queryParams.append("from", from);
      if (to) queryParams.append("to", to);
      if (schoolId) queryParams.append("schoolId", schoolId);
      if (branchId) queryParams.append("branchId", branchId);

      const response: DeviceResponse = await api.get(
        `/device?${queryParams.toString()}`
      );

      // Normalize the response
      const devices = response.data || response.devices || [];
      const currentPage = response.currentPage || pageParam;
      const totalPages = response.totalPages;
      const totalRecords = response.totalRecords;

      console.log("📡 API Response:", {
        page: pageParam,
        currentPage,
        totalPages,
        totalRecords,
        dataLength: devices.length,
        rawResponse: response, // Log full response to see actual structure
      });

      // Return normalized structure
      return {
        ...response,
        devices, // Normalize to 'devices'
        data: devices, // Keep both for compatibility
        currentPage,
        totalPages,
        totalRecords,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = lastPage.currentPage || allPages.length;
      const totalPages = lastPage.totalPages;

      console.log("🔍 getNextPageParam:", {
        currentPage,
        totalPages,
        allPagesLength: allPages.length,
        lastPageDataLength: (lastPage.data || lastPage.devices || []).length,
        limit,
      });

      // If totalPages is available, use it
      if (totalPages && currentPage < totalPages) {
        return currentPage + 1;
      }

      // Fallback: if we got a full page of results, assume there might be more
      const lastPageData = lastPage.data || lastPage.devices || [];
      if (lastPageData.length === limit) {
        return currentPage + 1;
      }

      // No more pages
      return undefined;
    },
    enabled: shouldFetch,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
