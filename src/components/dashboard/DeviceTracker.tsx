// components/DeviceTracker.tsx
import React, { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { AllDeviceResponse } from "@/types/socket";
import Cookies from "js-cookie";

interface DeviceFilters {
  page: number;
  limit: number;
  filter: "all" | "running" | "idle" | "stopped" | "inactive" | "new";
  searchTerm: string;
}

const DeviceTracker: React.FC = () => {
  const { socket, connected, error } = useSocket("http://localhost:9090");
  const [deviceData, setDeviceData] = useState<AllDeviceResponse | null>(null);
  const [filters, setFilters] = useState<DeviceFilters>({
    page: 1,
    limit: 10,
    filter: "all",
    searchTerm: "",
  });

  const token = Cookies.get("token");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !connected) return;

    console.log("Setting up socket listeners...");

    // Listen for device data
    socket.on("all-device-data", (data: AllDeviceResponse) => {
      console.log("Received device data:", data);
      setDeviceData(data);
    });

    // Listen for authentication success
    socket.on("auth-success", () => {
      console.log("Authentication successful");
      setIsAuthenticated(true);
      setAuthError(null);
      // Request initial data after authentication
      socket.emit("request-all-device-data", filters);
    });

    // Listen for errors
    socket.on("error", (errorData: { message: string; details?: string }) => {
      console.error("Server error:", errorData);
      setAuthError(errorData.message);
      setIsAuthenticated(false);
    });

    return () => {
      socket.off("all-device-data");
      socket.off("auth-success");
      socket.off("error");
    };
  }, [socket, connected]);

  // Auto-authenticate when socket connects and token exists
  useEffect(() => {
    if (socket && connected && token && !isAuthenticated) {
      console.log("Sending credentials...");
      socket.emit("credentials", token);
    }
  }, [socket, connected, token, isAuthenticated]);

  // Request data when filters change (only if already authenticated)
  useEffect(() => {
    if (socket && isAuthenticated) {
      console.log("Requesting device data with filters:", filters);
      socket.emit("request-all-device-data", filters);
    }
  }, [socket, isAuthenticated, filters]);

  const handleFilterChange = (newFilters: Partial<DeviceFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
  };

  if (!connected) {
    return <div>Connecting to server...</div>;
  }

  if (error) {
    return <div>Connection Error: {error}</div>;
  }

  if (!token) {
    return <div>No authentication token found. Please login first.</div>;
  }

  if (authError) {
    return <div>Authentication Error: {authError}</div>;
  }

  if (!isAuthenticated) {
    return <div>Authenticating...</div>;
  }

  return (
    <div>
      <h2>Vehicle Tracking Dashboard</h2>

      {/* Debug Info */}
      <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
        Connected: {connected ? "Yes" : "No"} | Authenticated:{" "}
        {isAuthenticated ? "Yes" : "No"} | Data Count:{" "}
        {deviceData?.filteredData?.length || 0}
      </div>

      {/* Filter Controls */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search devices..."
          value={filters.searchTerm}
          onChange={(e) =>
            handleFilterChange({ searchTerm: e.target.value, page: 1 })
          }
        />

        <select
          value={filters.filter}
          onChange={(e) =>
            handleFilterChange({
              filter: e.target.value as DeviceFilters["filter"],
              page: 1,
            })
          }
        >
          <option value="all">All</option>
          <option value="running">Running</option>
          <option value="idle">Idle</option>
          <option value="stopped">Stopped</option>
          <option value="inactive">Inactive</option>
          <option value="new">New</option>
        </select>
      </div>

      {/* Device Counts */}
      {deviceData && (
        <div className="device-counts">
          <span>Total: {deviceData.total}</span>
          <span>Running: {deviceData.runningCount}</span>
          <span>Idle: {deviceData.idleCount}</span>
          <span>Stopped: {deviceData.stoppedCount}</span>
          <span>Inactive: {deviceData.inactiveCount}</span>
          <span>New: {deviceData.newCount}</span>
        </div>
      )}

      {/* Device List */}
      <div className="device-list">
        {deviceData?.filteredData?.length > 0 ? (
          deviceData.filteredData.map((device, index) => (
            <div key={device.deviceId || index} className="device-card">
              <h3>{device.name || device.uniqueId || `Device ${index + 1}`}</h3>
              <p>Speed: {device.speed} km/h</p>
              <p>Ignition: {device.attributes?.ignition ? "On" : "Off"}</p>
              <p>Last Update: {new Date(device.lastUpdate).toLocaleString()}</p>
              {device.runningDuration && (
                <p>Running Duration: {device.runningDuration}</p>
              )}
              {device.tripDistance && (
                <p>Trip Distance: {device.tripDistance.toFixed(2)} km</p>
              )}
            </div>
          ))
        ) : (
          <div>No devices found</div>
        )}
      </div>

      {/* Pagination */}
      {deviceData && deviceData.pageCount > 1 && (
        <div className="pagination">
          <button
            disabled={filters.page === 1}
            onClick={() => handleFilterChange({ page: filters.page - 1 })}
          >
            Previous
          </button>
          <span>
            Page {filters.page} of {deviceData.pageCount}
          </span>
          <button
            disabled={filters.page === deviceData.pageCount}
            onClick={() => handleFilterChange({ page: filters.page + 1 })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default DeviceTracker;
