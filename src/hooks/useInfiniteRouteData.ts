"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Route } from "@/interface/modal";

interface RouteParams {
  search?: string;
  limit?: number;
  from?: string;
  to?: string;
  schoolId?: string;
  branchId?: string;
  role?: "admin" | "user" | "superAdmin" | "school" | "branch";
}

interface RouteResponse {
  success: boolean;
  message: string;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  data: Route[];
}

export const useInfiniteRouteData = (params?: RouteParams) => {
  const {
    search = "",
    limit = 20,
    from,
    to,
    schoolId,
    branchId,
    role,
  } = params || {};

  // Determine if query should be enabled based on role
  const shouldFetch = (() => {
    if (role === "superAdmin") {
      // For superAdmin: need both school AND branch
      return !!schoolId && !!branchId;
    } else if (role === "school") {
      // For school: need branch to be selected
      return !!branchId;
    } else if (role === "branch") {
      // For branch: can fetch immediately (branch is already known)
      return true;
    }
    // Default case for other roles
    return !!schoolId && !!branchId;
  })();

  return useInfiniteQuery<RouteResponse>({
    queryKey: [
      "infiniteRouteData",
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

      const response = await api.get<RouteResponse>(
        `/route?${queryParams.toString()}`
      );
      return response;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.currentPage < lastPage.totalPages
        ? lastPage.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
    enabled: shouldFetch,
  });
};
