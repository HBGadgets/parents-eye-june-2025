// for server-side pagination

import { useQuery } from "@tanstack/react-query";
import {
  PaginationState,
  SortingState,
} from "@/components/ui/customTable(serverSidePagination)";
import { Student } from "@/interface/modal";
import { api } from "@/services/apiService";

interface StudentResponse {
  students: Student[];
  total: number;
  page: number;
  limit: number;
}

interface UseStudentsParams {
  pagination: PaginationState;
  sorting: SortingState;
  childName?: string;
}

// I don't know if this is the best way to handle the API response structure, Par Mujhe kya Senior aake dekhega.
// For the pagination and sorting parameters, we use the same structure as in the custom table component
// This allows us to pass the same parameters directly to the API without needing to transform them
const fetchStudents = async ({
  pagination,
  sorting,
  childName,
}: UseStudentsParams): Promise<StudentResponse> => {
  const params = new URLSearchParams({
    page: (pagination.pageIndex + 1).toString(),
    limit: pagination.pageSize.toString(),
  });

  if (childName?.trim()) {
    params.append("childName", childName);
  }

  if (sorting.length > 0) {
    const sort = sorting[0];
    params.append("sortBy", sort.id);
    params.append("sortOrder", sort.desc ? "desc" : "asc");
  }

  try {
    const response = await api.get(`/child?${params.toString()}`);

    if (response?.children) {
      return response;
    }

    // If response has .data like Axios
    if (response?.data?.children) {
      return response.data;
    }

    throw new Error("Unexpected API response format");
  } catch (error) {
    console.error("API Error:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to fetch devices: ${error.message}`
        : "Failed to fetch devices"
    );
  }
};

export const useStudents = ({
  pagination,
  sorting,
  childName,
}: UseStudentsParams) => {
  return useQuery({
    queryKey: [
      "students",
      pagination.pageIndex,
      pagination.pageSize,
      sorting.map((s) => `${s.id}-${s.desc ? "desc" : "asc"}`).join(","),
      childName || "",
    ],
    queryFn: () => fetchStudents({ pagination, sorting, childName }),
    keepPreviousData: true,
  });
};
