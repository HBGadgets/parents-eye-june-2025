// useStudents.ts - Fixed version with proper search and filters support

import { useQuery } from "@tanstack/react-query";
import {
  PaginationState,
  SortingState,
} from "@/components/ui/customTable(serverSidePagination)";
import { Student } from "@/interface/modal";
import { api } from "@/services/apiService";

interface StudentResponse {
  students?: Student[];
  children?: Student[];
  total?: number;
  totalCount?: number;
  page: number;
  limit: number;
  pagination?: {
    total: number;
  };
}

interface StudentFilters {
  search?: string;
  schoolId?: string;
  branchId?: string;
  routeObjId?: string;
  pickupGeoId?: string;
  dropGeoId?: string;
}

interface UseStudentsParams {
  pagination: PaginationState;
  sorting: SortingState;
  filters?: StudentFilters;
}

const fetchStudents = async ({
  pagination,
  sorting,
  filters,
}: UseStudentsParams): Promise<StudentResponse> => {
  const params = new URLSearchParams({
    page: (pagination.pageIndex + 1).toString(),
    limit: pagination.pageSize.toString(),
  });

  // Add search parameter (supports student name, age, class, section)
  if (filters?.search?.trim()) {
    params.append("search", filters.search.trim());
  }

  // Add filter parameters
  if (filters?.schoolId) {
    params.append("schoolId", filters.schoolId);
  }

  if (filters?.branchId) {
    params.append("branchId", filters.branchId);
  }

  if (filters?.routeObjId) {
    params.append("routeObjId", filters.routeObjId);
  }

  if (filters?.pickupGeoId) {
    params.append("pickupGeoId", filters.pickupGeoId);
  }

  if (filters?.dropGeoId) {
    params.append("dropGeoId", filters.dropGeoId);
  }

  // Add sorting parameters
  if (sorting.length > 0) {
    const sort = sorting[0];
    params.append("sortBy", sort.id);
    params.append("sortOrder", sort.desc ? "desc" : "asc");
  }

  try {
    const response = await api.get(`/child?${params.toString()}`);

    // Handle different response structures
    if (response?.children || response?.students) {
      return response;
    }

    // If response has .data like Axios
    if (response?.data?.children || response?.data?.students) {
      return response.data;
    }

    throw new Error("Unexpected API response format");
  } catch (error) {
    console.error("API Error:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to fetch students: ${error.message}`
        : "Failed to fetch students"
    );
  }
};

export const useStudents = ({
  pagination,
  sorting,
  filters = {},
}: UseStudentsParams) => {
  return useQuery({
    queryKey: [
      "students",
      pagination.pageIndex,
      pagination.pageSize,
      sorting.map((s) => `${s.id}-${s.desc ? "desc" : "asc"}`).join(","),
      JSON.stringify(filters),
    ],
    queryFn: () => fetchStudents({ pagination, sorting, filters }),
    keepPreviousData: true,
    staleTime: 30000, 
  });
};

// Export types for use in components
export type { StudentFilters, UseStudentsParams, StudentResponse };