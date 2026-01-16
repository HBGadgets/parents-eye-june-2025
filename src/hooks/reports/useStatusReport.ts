"use client";

import { reportService } from "@/services/api/reportService";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginationState, SortingState } from "@tanstack/react-table";

interface Props {
  pagination: PaginationState;
  sorting?: SortingState;
  filters: Record<string, any>;
  hasGenerated?: boolean;
}

export const useStatusReport = ({
  pagination,
  sorting,
  filters,
  hasGenerated,
}: Props) => {
  return useQuery({
    queryKey: [
      "status-report",
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
    ],

    queryFn: () =>
      reportService.getStatusReport({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sorting?.[0]?.id,
        sortOrder: sorting?.[0]?.desc ? "desc" : "asc",
        uniqueId: filters?.uniqueId,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
      }),

    enabled:
      !!hasGenerated && !!filters?.uniqueId && !!filters?.from && !!filters?.to,

    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });
};
