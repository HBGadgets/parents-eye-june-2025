"use client";

import { reportService } from "@/services/api/reportService";
import { parseUniqueIds } from "@/util/parseUniqueIds";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginationState } from "@tanstack/react-table";

interface Props {
  pagination: PaginationState;
  filters: Record<string, any>;
  hasGenerated?: boolean;
}

export const useDistanceReport = ({
  pagination,
  filters,
  hasGenerated,
}: Props) => {
  const uniqueIds = parseUniqueIds(filters?.uniqueId);

  return useQuery({
    queryKey: [
      "distance-report",
      pagination.pageIndex,
      pagination.pageSize,
      filters?.uniqueId,
      filters?.period,
      filters?.from,
      filters?.to,
    ],

    queryFn: () =>
      reportService.getDistanceReport({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        uniqueIds,
        period: filters?.period || "Custom",
        from: filters?.from,
        to: filters?.to,
      }),

    enabled:
      !!hasGenerated &&
      uniqueIds.length > 0 &&
      !!filters?.from &&
      !!filters?.to,

    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  });
};
