"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { routeService } from "@/services/api/routeService";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";

export const useRoutes = (
  pagination: PaginationState,
  sorting: SortingState,
  filters: Record<string, any>
) => {
  const queryClient = useQueryClient();

  const getRoutesQuery = useQuery({
    queryKey: ["routes", pagination, sorting, filters],
    queryFn: () =>
      routeService.getRoutes({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: filters.search,
        branchId: filters.branchId,
        schoolId: filters.schoolId,
      }),
    keepPreviousData: true,
  });

  const createRouteMutation = useMutation({
    mutationFn: routeService.createRoute,
    onSuccess: () => {
      toast.success("Route created");
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });

  const updateRouteMutation = useMutation({
    mutationFn: ({ id, payload }: any) => routeService.updateRoute(id, payload),
    onSuccess: () => {
      toast.success("Route updated");
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });

  const deleteRouteMutation = useMutation({
    mutationFn: routeService.deleteRoute,
    onSuccess: () => {
      toast.success("Route deleted");
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });

  return {
    routes: getRoutesQuery.data?.data || [],
    total: getRoutesQuery.data?.total || 0,
    isLoading: getRoutesQuery.isLoading,

    createRoute: createRouteMutation.mutate,
    updateRoute: updateRouteMutation.mutate,
    deleteRoute: deleteRouteMutation.mutate,

    isCreating: createRouteMutation.isPending,
    isUpdating: updateRouteMutation.isPending,
    isDeleting: deleteRouteMutation.isPending,
  };
};
