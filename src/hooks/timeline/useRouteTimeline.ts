import { useTimelineQuery } from "./useTimelineQuery";
import { useRouteTimelineSync } from "./useRouteTimelineSync";
import { useRouteTimelineStore } from "@/store/timeline/routeTimelineStore";
import { useGeofenceByUniqueId } from "../useGeofence";
import { useMemo } from "react";

export function useRouteTimeline(uniqueId: string, enabled: boolean) {
  const geofencesQuery = useGeofenceByUniqueId(uniqueId);
  const timelineQuery = useTimelineQuery({ uniqueId, enabled });
  useRouteTimelineSync(
    geofencesQuery.geofenceByUniqueId,
    timelineQuery.data?.timeline ?? [],
    uniqueId,
    geofencesQuery.startPoint as any,
    geofencesQuery.endPoint as any
  );

  const stops = useRouteTimelineStore((s) => s.stops);
  const currentStopIndex = useRouteTimelineStore((s) => s.currentStopIndex);

   const resolvedStartPoint = useMemo(() => {
     const startId =
       geofencesQuery.startPoint?._id ?? (geofencesQuery.startPoint as any)?.id;
     if (!startId || startId === "null") return null;
     return stops.find((s) => s._id === startId) ?? null;
   }, [stops, geofencesQuery.startPoint]);

   const resolvedEndPoint = useMemo(() => {
     const endId =
       geofencesQuery.endPoint?._id ?? (geofencesQuery.endPoint as any)?.id;
     if (!endId || endId === "null") return null;
     return stops.find((s) => s._id === endId) ?? null;
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
