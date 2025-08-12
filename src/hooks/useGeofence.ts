import { useQuery } from "@tanstack/react-query";
import {
  PaginationState,
  SortingState,
} from "@/components/ui/customTable(serverSidePagination)";
import { Geofence } from "@/interface/modal";
import { api } from "@/services/apiService";

interface GeofenceResponse {
  data: Geofence[];
  total: number;
  page: number;
  limit: number;
}

interface UseGeofenceParams {
  pagination: PaginationState;
  sorting: SortingState;
  name?: string;
}

// I don't know if this is the best way to handle the API response structure, Par Mujhe kya Senior aake dekhega.
// For the pagination and sorting parameters, we use the same structure as in the custom table component
// This allows us to pass the same parameters directly to the API without needing to transform them
const fetchDevices = async ({
  pagination,
  sorting,
  name,
}: UseGeofenceParams): Promise<GeofenceResponse> => {
  const params = new URLSearchParams({
    page: (pagination.pageIndex + 1).toString(),
    limit: pagination.pageSize.toString(),
  });

  if (name?.trim()) {
    params.append("name", name);
  }

  if (sorting.length > 0) {
    const sort = sorting[0];
    params.append("sortBy", sort.id);
    params.append("sortOrder", sort.desc ? "desc" : "asc");
  }

  try {
    const response = await api.get(`/geofence?${params.toString()}`);

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
};

export const useGeofeneces = ({
  pagination,
  sorting,
  name,
}: UseGeofenceParams) => {
  return useQuery({
    queryKey: [
      "geofences",
      pagination.pageIndex,
      pagination.pageSize,
      sorting.map((s) => `${s.id}-${s.desc ? "desc" : "asc"}`).join(","),
      name || "",
    ],
    queryFn: () => fetchDevices({ pagination, sorting, name }),
    keepPreviousData: true,
  });
};
