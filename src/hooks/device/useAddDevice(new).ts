"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";
import { deviceApiService } from "@/services/api/deviceApiService";

export const useAddDeviceNew = (
  pagination: PaginationState,
  sorting: SortingState,
  filters: Record<string, any>
) => {
  const queryClient = useQueryClient();

  // Extract sort field and direction
  const sortField = sorting[0]?.id;
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  const getDevicesQuery = useQuery({
    queryKey: [
      "devices",
      pagination.pageIndex,
      pagination.pageSize,
      sortField,
      sortOrder,
      filters.search,
      filters.schoolId,
      filters.branchId,
      filters.routeObjId,
    ],
    queryFn: () =>
      deviceApiService.getDevices({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortField,
        sortOrder: sortOrder,
        search: filters.search,
        branchId: filters.branchId,
        schoolId: filters.schoolId,
        routeObjId: filters.routeObjId,
      }),
    placeholderData: keepPreviousData,
  });

  const createDeviceMutation = useMutation({
    mutationFn: deviceApiService.createDevice,
    onSuccess: () => {
      toast.success("Device added successfully.");
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Create failed");
    },
  });

  const updateDeviceMutation = useMutation({
    mutationFn: ({ id, payload }: any) =>
      deviceApiService.updateDevice(id, payload),
    onSuccess: () => {
      toast.success("Device updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Update failed");
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: deviceApiService.deleteDeviceById,
    onSuccess: () => {
      toast.success("Device deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Delete failed");
    },
  });

  return {
    devices: getDevicesQuery.data?.devices || [],
    total: getDevicesQuery.data?.total || 0,
    isLoading: getDevicesQuery.isLoading,
    isFetching: getDevicesQuery.isFetching,
    isPlaceholderData: getDevicesQuery.isPlaceholderData,

    createDevice: createDeviceMutation.mutate,
    updateDevice: updateDeviceMutation.mutate,
    deleteDevice: deleteDeviceMutation.mutate,

    isCreateDeviceLoading: createDeviceMutation.isPending,
    isUpdateDeviceLoading: updateDeviceMutation.isPending,
    isDeleteDeviceLoading: deleteDeviceMutation.isPending,
  };
};
