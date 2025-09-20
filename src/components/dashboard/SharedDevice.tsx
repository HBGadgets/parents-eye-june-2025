// components/SharedDevice.tsx
import React, { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";

interface SharedDeviceProps {
  token: string;
}

const SharedDevice: React.FC<SharedDeviceProps> = ({ token }) => {
  const { socket, connected, error } = useSocket("http://localhost:9090");
  const [deviceData, setDeviceData] = useState<any>(null);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !connected) return;

    // Send token to get shared device data
    socket.emit("shared device token", token);

    // Listen for shared device data
    socket.on("shared device data", (data) => {
      setDeviceData(data);
      setSocketError(null);
    });

    // Listen for errors
    socket.on("error", (errorData: { message: string }) => {
      setSocketError(errorData.message);
      setDeviceData(null);
    });

    return () => {
      socket.off("shared device data");
      socket.off("error");
    };
  }, [socket, connected, token]);

  if (!connected) {
    return <div>Connecting to server...</div>;
  }

  if (error || socketError) {
    return <div>Error: {error || socketError}</div>;
  }

  if (!deviceData) {
    return <div>Loading device data...</div>;
  }

  return (
    <div className="shared-device">
      <h2>Shared Device: {deviceData.name || deviceData.uniqueId}</h2>
      <div className="device-info">
        <p>Speed: {deviceData.speed} km/h</p>
        <p>Ignition: {deviceData.attributes?.ignition ? "On" : "Off"}</p>
        <p>Running Duration: {deviceData.runningDuration}</p>
        <p>Trip Distance: {deviceData.tripDistance?.toFixed(2)} km</p>
        <p>Last Update: {new Date(deviceData.lastUpdate).toLocaleString()}</p>
      </div>
    </div>
  );
};

export default SharedDevice;
