"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
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
    queryKey: [
      "routes",
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
      filters.search,
      filters.schoolId,
      filters.branchId,
    ],
    queryFn: () =>
      routeService.getRoutes({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: filters.search,
        branchId: filters.branchId,
        schoolId: filters.schoolId,
      }),
    placeholderData: keepPreviousData,
  });

  const exportExcelMutation = useMutation({
    mutationFn: (params: Record<string, any>) =>
      routeService.exportExcel(params),
    onSuccess: (blob: Blob) => {
      try {
        // Create a temporary URL for the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Routes_${new Date().toISOString().split("T")[0]}.xlsx`;

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

  const exportPdfMutation = useMutation({
    mutationFn: (params: Record<string, any>) => routeService.exportPdf(params),
    onSuccess: (blob: Blob) => {
      try {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Routes_${new Date().toISOString().split("T")[0]}.xlsx`;

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("PDF file downloaded successfully.");
      } catch (error) {
        toast.error("Failed to download PDF.");
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "PDF failed");
    },
  });

  const createRouteMutation = useMutation({
    mutationFn: routeService.createRoute,
    onSuccess: () => {
      toast.success("Route created");
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to create route");
    },
  });

  const updateRouteMutation = useMutation({
    mutationFn: ({ id, payload }: any) => routeService.updateRoute(id, payload),
    onSuccess: () => {
      toast.success("Route updated");
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update route");
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
    isFetching: getRoutesQuery.isFetching,
    isPlaceholderData: getRoutesQuery.isPlaceholderData,

    createRoute: createRouteMutation.mutate,
    updateRoute: updateRouteMutation.mutate,
    deleteRoute: deleteRouteMutation.mutate,
    exportExcel: exportExcelMutation.mutate,
    exportPdf: exportPdfMutation.mutate,

    isCreating: createRouteMutation.isPending,
    isUpdating: updateRouteMutation.isPending,
    isDeleting: deleteRouteMutation.isPending,
    isExcelExporting: exportExcelMutation.isPending,
    isPdfExporting: exportPdfMutation.isPending,
  };
};
