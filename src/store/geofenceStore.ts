import { Geofence } from "@/interface/modal";
import { create } from "zustand";

interface GeofenceState {
  rowData: Geofence;
  setRowData: (value: Geofence) => void;
}

export const useGeofenceStore = create<GeofenceState>((set) => ({
  rowData: {} as Geofence,
  setRowData: (value) => set({ rowData: value }),
}));
