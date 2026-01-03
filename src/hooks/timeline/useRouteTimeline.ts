import { useTimelineQuery } from "./useTimelineQuery";
import { useRouteTimelineSync } from "./useRouteTimelineSync";
import { useRouteTimelineStore } from "@/store/timeline/routeTimelineStore";
import { useGeofenceByUniqueId } from "../useGeofence";
import { useMemo } from "react";

export function useRouteTimeline(uniqueId: string) {
  const geofencesQuery = useGeofenceByUniqueId(uniqueId);
  const timelineQuery = useTimelineQuery({ uniqueId });
  useRouteTimelineSync(
    geofencesQuery.geofenceByUniqueId,
    timelineQuery.data?.timeline ?? [],
    uniqueId,
    geofencesQuery.startPoint,
    geofencesQuery.endPoint
  );

  const stops = useRouteTimelineStore((s) => s.stops);
  const currentStopIndex = useRouteTimelineStore((s) => s.currentStopIndex);

   const resolvedStartPoint = useMemo(() => {
     if (!geofencesQuery.startPoint) return null;
     return stops.find((s) => s._id === geofencesQuery.startPoint?._id) ?? null;
   }, [stops, geofencesQuery.startPoint]);

   const resolvedEndPoint = useMemo(() => {
     if (!geofencesQuery.endPoint) return null;
     return stops.find((s) => s._id === geofencesQuery.endPoint?._id) ?? null;
   }, [stops, geofencesQuery.endPoint]);


  return {
    stops,
    currentStopIndex,
    startPoint: resolvedStartPoint,
    endPoint: resolvedEndPoint,
    isLoading: geofencesQuery.isLoadingByUniqueId || timelineQuery.isLoading,
    isError: geofencesQuery.isError || timelineQuery.isError,
    error: geofencesQuery.error || timelineQuery.error,
    routeInfo: timelineQuery.data?.route,
  };
}
