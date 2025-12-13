"use client";

import { driverService } from "@/services/api/driverService";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { is } from "date-fns/locale";
import { get } from "lodash";
import { toast } from "sonner";

export const useDriver = (
  pagination: PaginationState,
  sorting: SortingState,
  filters: Record<string, any>
) => {
  const queryClient = useQueryClient();

  const sortField = sorting[0]?.id;
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  const getDriverQuery = useQuery({
    queryKey: [
      "driver",
      pagination?.pageIndex,
      pagination?.pageSize,
      sortField,
      sortOrder,
      filters?.search,
      filters?.schoolId,
      filters?.branchId,
    ],

    queryFn: () =>
      driverService.getDriver({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortField,
        sortOrder: sortOrder,
        search: filters.search,
        branchId: filters.branchId,
        schoolId: filters.schoolId,
      }),
    placeholderData: keepPreviousData,
  });

  const createDriverMutation = useMutation({
    mutationFn: driverService.createDriver,
    onSuccess: () => {
      toast.success("Driver created");
      queryClient.invalidateQueries({ queryKey: ["driver"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Create failed");
    }
  });

  const updateDriverMutation = useMutation({
    mutationFn: ({id, payload}: any) => driverService.updateDriver(id, payload),
    onSuccess: () => {
      toast.success("Driver updated");
      queryClient.invalidateQueries({ queryKey: ["driver"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Update failed");
    }
  });

  const deleteDriverMutation = useMutation({
    mutationFn: driverService.deleteDriverById,
    onSuccess: () => {
      toast.success("Driver deleted");
      queryClient.invalidateQueries({ queryKey: ["driver"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Delete failed");
    }
  });

  return {
    driver: getDriverQuery.data?.data || [],
    total: getDriverQuery.data?.totalCount || 0,
    isLoading: getDriverQuery.isLoading,
    useIsFetching: getDriverQuery.isFetching,
    isPlaceholderData: getDriverQuery.isPlaceholderData,

    createDriver: createDriverMutation.mutate,
    updateDriver: updateDriverMutation.mutate,
    deleteDriver: deleteDriverMutation.mutate,

    isCreateDriver: createDriverMutation.isPending,
    isUpdateDriver: updateDriverMutation.isPending,
    isDeleteDriver: deleteDriverMutation.isPending,
  };
};
