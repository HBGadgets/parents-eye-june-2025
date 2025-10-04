"use client";

import dynamic from "next/dynamic";

const GeofenceClient = dynamic(() => import("./GeofenceClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export default function Geofence() {
  return <GeofenceClient />;
}
