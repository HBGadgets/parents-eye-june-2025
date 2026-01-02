import { BusStopWithStatus } from "@/interface/modal";
import { create } from "zustand";
// import type { BusStopWithStatus, Geofence } from "@/types/route";

interface RouteTimelineState {
  stops: BusStopWithStatus[];
  currentStopIndex: number;

  setStops: (stops: BusStopWithStatus[]) => void;
  reset: () => void;
}

export const useRouteTimelineStore = create<RouteTimelineState>((set) => ({
  stops: [],
  currentStopIndex: -1,

  setStops: (stops) =>
    set({
      stops,
      currentStopIndex: stops.reduce(
        (last, stop, index) => (stop.hasArrived ? index : last),
        -1
      ),
    }),

  reset: () => set({ stops: [], currentStopIndex: -1 }),
}));