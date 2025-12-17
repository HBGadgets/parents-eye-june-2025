"use client";

import { supervisorService } from "@/services/api/supervisorService";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { id } from "date-fns/locale";
import { toast } from "sonner";

export const useSupervisor = (
  pagination: PaginationState,
  sorting: SortingState,
  filters: Record<string, any>
) => {
  const queryClient = useQueryClient();

  const sortField = sorting[0]?.id;
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  const getSupervisorQuery = useQuery({
    queryKey: [
      "supervisor",
      pagination?.pageIndex,
      pagination?.pageSize,
      sortField,
      sortOrder,
      filters?.search,
      filters?.schoolId,
      filters?.branchId,
    ],
    queryFn: () =>
      supervisorService.getSupervisor({
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

  const createSupervisor = useMutation({
    mutationFn: supervisorService.createSupervisor,
    onSuccess: () => {
      toast.success("Supervisor created successfully");
      queryClient.invalidateQueries({ queryKey: ["supervisor"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Create failed");
    },
  });

  const updateSupervisor = useMutation({
    mutationFn: ({ id, payload }: any) =>
      supervisorService.updateSupervisor(id, payload),
    onSuccess: () => {
      toast.success("Supervisor updated successfully");
      queryClient.invalidateQueries({ queryKey: ["supervisor"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Update failed");
    },
  });

  const deleteSupervisorById = useMutation({
    mutationFn: supervisorService.deleteSupervisorById,
    onSuccess: () => {
      toast.success("Supervisor deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["supervisor"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Delete failed");
    },
  });

  const approveSupervisor = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      supervisorService.supervisorApprove(id, status),
    onSuccess: (variables) => {
      const { id, status } = variables;

      if (status === "Approved") {
        toast.success("Supervisor approved successfully");
      } else {
        toast.warning("Supervisor rejected successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["supervisor"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Delete failed");
    },
  });

  return {
    supervisor: getSupervisorQuery.data?.data || [],
    total: getSupervisorQuery.data?.totalCount || 0,
    isLoading: getSupervisorQuery.isLoading,
    isFetching: getSupervisorQuery.isFetching,

    createSupervisor: createSupervisor.mutate,
    updateSupervisor: updateSupervisor.mutate,
    deleteSupervisorById: deleteSupervisorById.mutate,
    approveSupervisor: approveSupervisor.mutate,

    isCreatingSupervisor: createSupervisor.isPending,
    isUpdatingSupervisor: updateSupervisor.isPending,
    isDeletingSupervisor: deleteSupervisorById.isPending,
    isApprovingSupervisor: approveSupervisor.isPending,
  };
};
