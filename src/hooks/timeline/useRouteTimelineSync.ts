import { useEffect } from "react";
import { Geofence } from "@/interface/modal";
import { useRouteTimelineStore } from "@/store/timeline/routeTimelineStore";

type TimelineEvent = {
  geofenceId: string;
  eventType: "ENTER" | "EXIT";
  createdAt: string;
};

export function useRouteTimelineSync(
  geofences: Geofence[] = [],
  timelineEvents: TimelineEvent[] = [],
  uniqueId: string,
  startPoint?: Geofence,
  endPoint?: Geofence
) {
  const setStops = useRouteTimelineStore((s) => s.setStops);
  const currentStops = useRouteTimelineStore((s) => s.stops);

  useEffect(() => {
    // 🔹 Build ordered geofence list
    const orderedGeofences: Geofence[] = [];

    if (startPoint) {
      orderedGeofences.push({ ...startPoint, __type: "START" } as any);
    }

    for (const geo of geofences) {
      // avoid duplicate if startPoint is also in data
      if (startPoint && geo._id === startPoint._id) continue;
      if (endPoint && geo._id === endPoint._id) continue;

      orderedGeofences.push({ ...geo, __type: "NORMAL" } as any);
    }

    if (endPoint) {
      orderedGeofences.push({ ...endPoint, __type: "END" } as any);
    }

    // 🔹 No geofences at all → clear
    if (!orderedGeofences.length) {
      if (currentStops.length !== 0) setStops([]);
      return;
    }

    // 🔹 Build event maps
    const enterMap = new Map<string, string>();
    const exitMap = new Map<string, string>();

    for (const e of timelineEvents) {
      if (e.eventType === "ENTER") enterMap.set(e.geofenceId, e.createdAt);
      if (e.eventType === "EXIT") exitMap.set(e.geofenceId, e.createdAt);
    }

    const geofenceById = new Map(geofences.map((g) => [g._id, g]));

    // 🔹 Build stops
  const stops = orderedGeofences.map((geo) => {
    const enteredAt = enterMap.get(geo._id);
    const exitedAt = exitMap.get(geo._id);

    // 🔥 RESOLVE FULL GEOFENCE DATA
    const fullGeo = geofenceById.get(geo._id);

    return {
      _id: geo._id,
      geofenceName: geo.geofenceName,
      area: geo.area ?? fullGeo?.area,

      // ✅ resolved from canonical source
      pickupTime: fullGeo?.pickupTime ?? null,
      dropTime: fullGeo?.dropTime ?? null,

      enteredAt,
      exitedAt,
      hasArrived: Boolean(exitedAt),
      isCurrent: Boolean(enteredAt && !exitedAt),
      __type: (geo as any).__type,
    };
  });

    // 🔹 Prevent useless updates
    if (
      currentStops.length === stops.length &&
      currentStops.every(
        (s, i) =>
          s._id === stops[i]._id &&
          s.enteredAt === stops[i].enteredAt &&
          s.exitedAt === stops[i].exitedAt &&
          s.isCurrent === stops[i].isCurrent
      )
    ) {
      return;
    }

    setStops(stops);
  }, [
    geofences,
    timelineEvents,
    uniqueId,
    startPoint,
    endPoint,
    currentStops,
    setStops,
  ]);
}
