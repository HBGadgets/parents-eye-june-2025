import { reportService } from "@/services/api/reportService";
import { useQuery } from "@tanstack/react-query";

export const useHistoryReport = (
  filters: { uniqueId?: number; from?: string; to?: string },
  enabled: boolean
) => {
  return useQuery({
    queryKey: ["history-report", filters],
    queryFn: () =>
      reportService.getHistoryReport({
        uniqueId: filters.uniqueId,
        from: filters.from,
        to: filters.to,
        period: "Custom",
      }),
    enabled: enabled,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
};
