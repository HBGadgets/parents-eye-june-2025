"use client";
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
  schoolName?: string;
  branchName?: string;
  geofenceName?: string;
  routeNumber?: string;
}

// I don't know if this is the best way to handle the API response structure, Par Mujhe kya Senior aake dekhega.
// For the pagination and sorting parameters, we use the same structure as in the custom table component
// This allows us to pass the same parameters directly to the API without needing to transform them
const fetchDevices = async ({
  pagination,
  sorting,
  name,
  schoolName,
  branchName,
  geofenceName,
  routeNumber,
}: UseGeofenceParams): Promise<GeofenceResponse> => {
  const params = new URLSearchParams({
    page: (pagination.pageIndex + 1).toString(),
    limit: pagination.pageSize.toString(),
  });

  if (name?.trim()) params.append("name", name);
  if (schoolName?.trim()) params.append("schoolName", schoolName);
  if (branchName?.trim()) params.append("branchName", branchName);
  if (geofenceName?.trim()) params.append("geofenceName", geofenceName);
  if (routeNumber?.trim()) params.append("routeNumber", routeNumber);

  if (sorting.length > 0) {
    const sort = sorting[0];
    params.append("sortBy", sort.id);
    params.append("sortOrder", sort.desc ? "desc" : "asc");
  }

  try {
    const response = await api.get(`/geofence?${params.toString()}`);

    let data;
    if (response?.data?.data) {
      data = response.data;
    } else if (response?.data) {
      data = response;
    } else {
      throw new Error("Unexpected API response format");
    }
    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to fetch geofences: ${error.message}`
        : "Failed to fetch geofences"
    );
  }
};

export const useGeofences = ({
  pagination,
  sorting,
  name,
  schoolName,
  branchName,
  geofenceName,
  routeNumber,
}: UseGeofenceParams) =>
  useQuery({
    queryKey: [
      "geofences",
      pagination.pageIndex,
      pagination.pageSize,
      sorting.map((s) => `${s.id}-${s.desc ? "desc" : "asc"}`).join(","),
      name || "",
      schoolName || "",
      branchName || "",
      geofenceName || "",
      routeNumber || "",
    ],
    queryFn: () =>
      fetchDevices({
        pagination,
        sorting,
        name,
        schoolName,
        branchName,
        geofenceName,
        routeNumber,
      }),
    keepPreviousData: true,
  });
