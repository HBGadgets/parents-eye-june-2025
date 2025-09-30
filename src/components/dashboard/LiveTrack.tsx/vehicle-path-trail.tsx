import { useMemo } from "react";
import { Polyline } from "react-leaflet";

// Vehicle Path Trail Component
export const VehiclePathTrail = ({
  path,
  vehicleStatus,
}: {
  path: [number, number][];
  vehicleStatus: string;
}) => {
  // Color based on vehicle status
  const pathColor = useMemo(() => {
    const colors = {
      running: "#28a745",
      idle: "#ffc107",
      stopped: "#dc3545",
      inactive: "#6c757d",
      overspeeding: "#fd7e14",
      noData: "#007bff",
    };
    return colors[vehicleStatus as keyof typeof colors] || "#007bff";
  }, [vehicleStatus]);

  if (path.length < 2) return null;

  return (
    <Polyline
      positions={path}
      pathOptions={{
        color: "#28a745",
        weight: 4,
        opacity: 0.7,
        lineCap: "round",
        lineJoin: "round",
      }}
    />
  );
};
