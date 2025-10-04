// for server-side pagination

import { useQuery } from "@tanstack/react-query";
import {
  PaginationState,
  SortingState,
} from "@/components/ui/customTable(serverSidePagination)";
import { Device } from "@/interface/modal";
import { api } from "@/services/apiService";

interface DevicesResponse {
  devices: Device[];
  total: number;
  page: number;
  limit: number;
}

interface UseDevicesParams {
  pagination: PaginationState;
  sorting: SortingState;
  deviceName?: string;
}

// I don't know if this is the best way to handle the API response structure, Par Mujhe kya Senior aake dekhega.
// For the pagination and sorting parameters, we use the same structure as in the custom table component
// This allows us to pass the same parameters directly to the API without needing to transform them
const fetchDevices = async ({
  pagination,
  sorting,
  deviceName,
}: UseDevicesParams): Promise<DevicesResponse> => {
  const params = new URLSearchParams({
    page: (pagination.pageIndex + 1).toString(),
    limit: pagination.pageSize.toString(),
  });

  if (deviceName?.trim()) {
    params.append("deviceName", deviceName);
  }

  if (sorting.length > 0) {
    const sort = sorting[0];
    params.append("sortBy", sort.id);
    params.append("sortOrder", sort.desc ? "desc" : "asc");
  }

  try {
    const response = await api.get(`/device?${params.toString()}`);

    if (response?.devices) {
      return response;
    }

    // If response has .data like Axios
    if (response?.data?.devices) {
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

export const useDevices = ({
  pagination,
  sorting,
  deviceName,
}: UseDevicesParams) => {
  return useQuery({
    queryKey: [
      "devices",
      pagination.pageIndex,
      pagination.pageSize,
      sorting.map((s) => `${s.id}-${s.desc ? "desc" : "asc"}`).join(","),
      deviceName || "",
    ],
    queryFn: () => fetchDevices({ pagination, sorting, deviceName }),
    keepPreviousData: true,
  });
};
