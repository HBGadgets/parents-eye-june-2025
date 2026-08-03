"use client";

import { reportService } from "@/services/api/reportService";
import { parseUniqueIds } from "@/util/parseUniqueIds";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginationState, SortingState } from "@tanstack/react-table";

interface Props {
  pagination: PaginationState;
  sorting?: SortingState;
  filters: Record<string, any>;
  hasGenerated?: boolean;
}

export const useStoppageSummaryReport = ({
  pagination,
  sorting,
  filters,
  hasGenerated,
}: Props) => {
  const uniqueIds = Array.isArray(filters?.uniqueId)
    ? filters.uniqueId.map(Number).filter((id: number) => !Number.isNaN(id))
    : parseUniqueIds(filters?.uniqueId);

  return useQuery({
    queryKey: [
      "stoppage-summary-report",
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
    ],

    queryFn: () =>
      reportService.getStoppageSummaryReport({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sorting?.[0]?.id,
        sortOrder: sorting?.[0]?.desc ? "desc" : "asc",
        uniqueIds,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
      }),

    enabled:
      !!hasGenerated && uniqueIds.length > 0 && !!filters?.from && !!filters?.to,

    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });
};
