import { useEffect, useRef } from "react";
import { Geofence } from "@/interface/modal";
import { useRouteTimelineStore } from "@/store/timeline/routeTimelineStore";

type TimelineEvent = {
  geofenceId: string;
  eventType: "ENTER" | "EXIT";
  createdAt: string;
};

export function useRouteTimelineSync(
  geofences: Geofence[] = [],
  timelineEvents: TimelineEvent[] = []
) {
  const setStops = useRouteTimelineStore((s) => s.setStops);
  const lastSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!geofences.length) return;

    // Build maps
    const enterMap = new Map<string, string>();
    const exitMap = new Map<string, string>();

    for (const e of timelineEvents) {
      if (e.eventType === "ENTER") {
        enterMap.set(e.geofenceId, e.createdAt);
      }
      if (e.eventType === "EXIT") {
        exitMap.set(e.geofenceId, e.createdAt);
      }
    }

    let currentStopIndex = -1;

    const stops = geofences.map((geo, index) => {
      const enteredAt = enterMap.get(geo._id);
      const exitedAt = exitMap.get(geo._id);

      const hasExited = Boolean(exitedAt);
      const isInside = Boolean(enteredAt && !exitedAt);

      if (isInside) currentStopIndex = index;

      return {
        ...geo,
        enteredAt,
        exitedAt,
        hasArrived: hasExited, // ✅ completed (green)
        isCurrent: isInside, // ✅ inside stop (orange)
      };
    });

    // Stable signature to avoid loops
    const signature = JSON.stringify(
      stops.map((s) => ({
        id: s._id,
        enteredAt: s.enteredAt,
        exitedAt: s.exitedAt,
        isCurrent: s.isCurrent,
      }))
    );

    if (signature === lastSignatureRef.current) return;

    lastSignatureRef.current = signature;
    setStops(stops);
  }, [geofences, timelineEvents, setStops]);
}
