import { timelineService } from "@/services/api/timelineService";
import { useQuery } from "@tanstack/react-query";

interface UseRouteTimelineOptions {
  uniqueId?: string;
  enabled?: boolean;
}

export const useTimelineQuery = ({
  uniqueId,
  enabled = true,
}: UseRouteTimelineOptions) =>
  useQuery({
    queryKey: ["timeline-by-uniqueId", uniqueId],
    queryFn: () => timelineService.getTimeline({ uniqueId }),
    enabled: enabled && !!uniqueId,
    // refetchInterval: 30000,
  });
