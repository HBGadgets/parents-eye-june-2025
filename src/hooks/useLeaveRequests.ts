import { useQuery } from "@tanstack/react-query";
import {
  PaginationState,
  SortingState,
} from "@/components/ui/customTable(serverSidePagination)";
import { api } from "@/services/apiService";
import { LeaveRequest } from "@/interface/modal";



interface LeaveRequestResponse {
  message: string;
  leaveRequests: LeaveRequest[];
  total: number;
  page: number;
  limit: number;
}

interface UseLeaveRequestParams {
  pagination: PaginationState;
  sorting: SortingState;
  reason?: string; // optional search filter
}

// Fetch Leave Requests
const fetchLeaveRequests = async ({
  pagination,
  sorting,
  reason,
}: UseLeaveRequestParams): Promise<LeaveRequestResponse> => {
  const params = new URLSearchParams({
    page: (pagination.pageIndex + 1).toString(),
    limit: pagination.pageSize.toString(),
  });

  if (reason?.trim()) {
    params.append("reason", reason);
  }

  if (sorting.length > 0) {
    const sort = sorting[0];
    params.append("sortBy", sort.id);
    params.append("sortOrder", sort.desc ? "desc" : "asc");
  }

  try {
    const response = await api.get(`/leave-request?${params.toString()}`);

    if (response?.leaveRequests) {
      return response;
    }

    throw new Error("Unexpected API response format");
  } catch (error) {
    console.error("API Error:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to fetch leave requests: ${error.message}`
        : "Failed to fetch leave requests"
    );
  }
};

// Hook
export const useLeaveRequests = ({
  pagination,
  sorting,
  reason,
}: UseLeaveRequestParams) => {
  return useQuery({
    queryKey: [
      "leaveRequests",
      pagination.pageIndex,
      pagination.pageSize,
      sorting.map((s) => `${s.id}-${s.desc ? "desc" : "asc"}`).join(","),
      reason || "",
    ],
    queryFn: () => fetchLeaveRequests({ pagination, sorting, reason }),
  });
};
