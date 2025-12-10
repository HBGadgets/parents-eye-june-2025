"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { parentService } from "@/services/api/parentService";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";
import { GetParentsResponse } from "@/interface/modal";

export const useParent = (
  pagination: PaginationState,
  sorting: SortingState,
  filters: Record<string, any>
) => {
  const queryClient = useQueryClient();

  const sortField = sorting[0]?.id;
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  /* -------------------- GET PARENTS -------------------- */
  const getParentsQuery = useQuery<GetParentsResponse>({
    queryKey: [
      "parents",
      pagination.pageIndex,
      pagination.pageSize,
      sortField,
      sortOrder,
      filters.search,
      filters.schoolId,
      filters.branchId,
      filters.isActive,
    ],
    queryFn: () =>
      parentService.getParents({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortField,
        sortOrder: sortOrder,
        search: filters.search,
        schoolId: filters.schoolId,
        branchId: filters.branchId,
        isActive: filters.isActive,
      }),
    placeholderData: keepPreviousData,
  });

  /* -------------------- CREATE -------------------- */
  const createParentMutation = useMutation({
    mutationFn: parentService.createParent,
    onSuccess: () => {
      toast.success("Parent created successfully");
      queryClient.invalidateQueries({ queryKey: ["parents"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Create failed");
    },
  });

  /* -------------------- UPDATE -------------------- */
  const updateParentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      parentService.updateParent(id, payload),
    onSuccess: () => {
      toast.success("Parent updated successfully");
      queryClient.invalidateQueries({ queryKey: ["parents"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Update failed");
    },
  });

  /* -------------------- DELETE -------------------- */
  const deleteParentMutation = useMutation({
    mutationFn: parentService.deleteParent,
    onSuccess: () => {
      toast.success("Parent deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["parents"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Delete failed");
    },
  });

  /* -------------------- RETURN -------------------- */
  return {
    parents: getParentsQuery.data?.data || [],
    total: getParentsQuery.data?.total || 0,
    page: getParentsQuery.data?.page || 1,
    totalPages: getParentsQuery.data?.totalPages || 0,

    isLoading: getParentsQuery.isLoading,

    createParent: createParentMutation.mutate,
    createParentAsync: createParentMutation.mutateAsync,
    updateParent: updateParentMutation.mutate,
    deleteParent: deleteParentMutation.mutate,

    isCreateLoading: createParentMutation.isPending,
    isUpdateLoading: updateParentMutation.isPending,
    isDeleteLoading: deleteParentMutation.isPending,
  };
};
