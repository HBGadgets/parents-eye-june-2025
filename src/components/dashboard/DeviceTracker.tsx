// components/DeviceTracker.tsx
import React, { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { AllDeviceResponse } from "@/types/socket";
import Cookies from "js-cookie";
import { metadata } from "@/app/layout";

interface DeviceFilters {
  page: number;
  limit: number;
  filter: "all" | "running" | "idle" | "stopped" | "inactive" | "new";
  searchTerm: string;
}

const DeviceTracker = () => {
  const { socket, connected, error } = useSocket(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}`
  );
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
};

export default DeviceTracker;
