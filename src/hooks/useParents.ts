import { useQuery } from "@tanstack/react-query";
import {
  PaginationState,
  SortingState,
} from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";

interface School {
  _id: string;
  schoolName: string;
}

interface Branch {
  _id: string;
  branchName: string;
}

interface Parent {
  _id: string;
  parentName: string;
  username: string;
  password: string;
  email: string;
  schoolMobile: string;
  fullAccess: boolean;
  schoolId: School;
  branchId: Branch;
  mobileNo: string;
  role: string;
}

interface ParentResponse {
  data: Parent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseParentsParams {
  pagination: PaginationState;
  sorting: SortingState;
  search?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
}

const fetchParents = async ({
  pagination,
  sorting,
  search,
  startDate,
  endDate,
}: UseParentsParams): Promise<ParentResponse> => {
  const params = new URLSearchParams({
    page: (pagination.pageIndex + 1).toString(),
    limit: pagination.pageSize.toString(),
  });

  if (search?.trim()) {
    params.append("search", search);
  }

  if (startDate) {
    params.append("startDate", startDate);
  }

  if (endDate) {
    params.append("endDate", endDate);
  }

  if (sorting.length > 0) {
    const sort = sorting[0];
    params.append("sortBy", sort.id);
    params.append("sortOrder", sort.desc ? "desc" : "asc");
  }

  try {
    const response = await api.get(`/parent?${params.toString()}`);

    if (response?.data) {
      return response;
    }

    // If response has .data like Axios
    if (response?.data?.data) {
      return response.data;
    }
    throw new Error("Unexpected API response format");
  } catch (error) {
    console.error("API Error:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to fetch geofences: ${error.message}`
        : "Failed to fetch geofences"
    );
  }

  // Fallback for unexpected structures
};

export const useParents = ({ pagination, sorting, name }: UseParentsParams) => {
  return useQuery({
    queryKey: [
      "parents",
      pagination.pageIndex,
      pagination.pageSize,
      name || "",
    ],
    queryFn: async () => fetchParents({ pagination, sorting, name }),
    keepPreviousData: true,
  });
};
