"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
// import { studentService } from "@/services/api/studentService";
import { geofenceService } from "@/services/api/geofenceSerevice";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";

export const useGeofence = (
  pagination: PaginationState,
  sorting: SortingState,
  filters: Record<string, any>
) => {
  const queryClient = useQueryClient();

  const getGeofenceQuery = useQuery({
    queryKey: [
      "geofence",
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
      filters.search,
      filters.schoolId,
      filters.branchId,
    ],
    queryFn: () =>
      geofenceService.getGeofence({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: filters.search,
        branchId: filters.branchId,
        schoolId: filters.schoolId,
      }),
    placeholderData: keepPreviousData,
  });

  const getGeofenceByRouteQuery = useQuery({
    queryKey: ["geofence-by-route", filters.routeId],
    queryFn: () => geofenceService.getGeofenceByRouteObjId(filters.routeId),
    placeholderData: keepPreviousData,
    enabled: !!filters.routeId,
  });

  const createGeofenceMutation = useMutation({
    mutationFn: geofenceService.createGeofence,
    onSuccess: () => {
      toast.success("Geofence created successfully");
      queryClient.invalidateQueries({
        queryKey: ["geofence"],
      });
      queryClient.invalidateQueries({
        queryKey: ["geofence-by-route"],
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create geofence");
    },
  });

  const updateGeofenceMutation = useMutation({
    mutationFn: ({ id, payload }: any) =>
      geofenceService.updateGeofence(id, payload),
    onSuccess: () => {
      toast.success("Geofence updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["geofence"],
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update geofence");
    },
  });

  const deleteGeofenceMutation = useMutation({
    mutationFn: geofenceService.deleteGeofence,
    onSuccess: () => {
      toast.success("Geofence deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["geofence"],
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete geofence");
    },
  });

  return {
    geofence: getGeofenceQuery.data?.data || [],
    geofenceByRoute: getGeofenceByRouteQuery.data?.data || [],
    isLoadingByRoute: getGeofenceByRouteQuery.isLoading,
    isLoading: getGeofenceQuery.isLoading,
    total: getGeofenceQuery.data?.total || 0,

    createGeofence: createGeofenceMutation.mutate,
    updateGeofence: updateGeofenceMutation.mutate,
    deleteGeofence: deleteGeofenceMutation.mutate,

    isCreateLoading: createGeofenceMutation.isPending,
    isUpdateLoading: updateGeofenceMutation.isPending,
    isDeleteLoading: deleteGeofenceMutation.isPending,
  };
};
