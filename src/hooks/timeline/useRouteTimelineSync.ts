import { useEffect, useRef } from "react";
// import { useRouteTimelineStore } from "@/store/routeTimelineStore";
import { Geofence } from "@/interface/modal";
import { useRouteTimelineStore } from "@/store/timeline/routeTimelineStore";
// import type { Geofence } from "@/types/route";

export function useRouteTimelineSync(
  geofences: Geofence[] = [],
  timelineEvents: {
    geofenceId: string;
    eventType: "ENTER" | "EXIT";
    createdAt: string;
  }[] = []
) {
  const setStops = useRouteTimelineStore((s) => s.setStops);

  // 🔒 Track last computed signature
  const lastSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!geofences.length) return;

    const enterMap = new Map<string, string>();

    timelineEvents.forEach((e) => {
      if (e.eventType === "ENTER") {
        enterMap.set(e.geofenceId, e.createdAt);
      }
    });

    let lastArrivedIndex = -1;

    const stops = geofences.map((geo, index) => {
      const arrivedAt = enterMap.get(geo._id);
      if (arrivedAt) lastArrivedIndex = index;

      return {
        ...geo,
        hasArrived: !!arrivedAt,
        arrivedAt,
        isCurrent: false,
      };
    });

    if (lastArrivedIndex >= 0) {
      stops[lastArrivedIndex].isCurrent = true;
    }

    // 🔑 Create a stable signature
    const signature = JSON.stringify(
      stops.map((s) => ({
        id: s._id,
        arrivedAt: s.arrivedAt,
        isCurrent: s.isCurrent,
      }))
    );

    // ⛔ Prevent infinite loop
    if (signature === lastSignatureRef.current) return;

    lastSignatureRef.current = signature;
    setStops(stops);
  }, [geofences, timelineEvents, setStops]);
}
