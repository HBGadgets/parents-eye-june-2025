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

  const exportDevicesMutation = useMutation({
    mutationFn: (params: Record<string, any>) =>
      deviceApiService.exportExcel(params),
    onSuccess: (blob: Blob) => {
      try {
        // Create a temporary URL for the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `devices_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("Excel file downloaded successfully.");
      } catch (error) {
        toast.error("Failed to download file.");
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Export failed");
    },
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
    exportExcel: exportDevicesMutation.mutate,

    isCreateDeviceLoading: createDeviceMutation.isPending,
    isUpdateDeviceLoading: updateDeviceMutation.isPending,
    isDeleteDeviceLoading: deleteDeviceMutation.isPending,
    isExcelExporting: exportDevicesMutation.isPending,
  };
};
