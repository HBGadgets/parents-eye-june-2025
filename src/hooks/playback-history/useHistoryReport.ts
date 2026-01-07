import { reportService } from "@/services/api/reportService";
import { useQuery } from "@tanstack/react-query";

export const useHistoryReport = (
  filters: { uniqueId?: number; from?: string; to?: string },
  enabled: boolean
) => {
  return useQuery({
    queryKey: ["history-report", filters.uniqueId, filters.from, filters.to],
    queryFn: () =>
      reportService.getHistoryReport({
        ...filters,
        period: "Custom",
      }),
    enabled: enabled && !!filters.uniqueId && !!filters.from && !!filters.to,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

