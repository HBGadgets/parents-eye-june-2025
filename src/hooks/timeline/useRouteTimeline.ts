import { useTimelineQuery } from "./useTimelineQuery";
import { useRouteTimelineSync } from "./useRouteTimelineSync";
import { useRouteTimelineStore } from "@/store/timeline/routeTimelineStore";
import { useGeofenceByUniqueId } from "../useGeofence";

export function useRouteTimeline(uniqueId: string) {
  const geofencesQuery = useGeofenceByUniqueId(uniqueId);
  const timelineQuery = useTimelineQuery({ uniqueId });
  useRouteTimelineSync(
    geofencesQuery.geofenceByUniqueId,
    timelineQuery.data?.timeline ?? []
  );

  const stops = useRouteTimelineStore((s) => s.stops);
  const currentStopIndex = useRouteTimelineStore((s) => s.currentStopIndex);

  return {
    stops,
    currentStopIndex,
    isLoading: geofencesQuery.isLoadingByUniqueId || timelineQuery.isLoading,
    isError: geofencesQuery.isError || timelineQuery.isError,
    error: geofencesQuery.error || timelineQuery.error,
    routeInfo: timelineQuery.data?.route,
  };
}
