import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { AllDeviceResponse, DeviceFilters } from "@/types/socket";

// Add interface for single device data
export interface SingleDeviceData {
  imei: string;
  uniqueId: string;
  attributes: {
    ignition: boolean;
    totalDistance: number;
    [key: string]: unknown;
  };
  runningDuration: string;
  tripDistance: number;
  latitude: number;
  longitude: number;
  createdAt: string;
  [key: string]: unknown;
}

export interface DeviceServiceEvents {
  onDataReceived: (data: AllDeviceResponse) => void;
  onSingleDeviceDataReceived: (data: SingleDeviceData) => void;
  onAuthSuccess: (authData?: { role: string; message: string }) => void;
  onError: (error: string) => void;
  onConnectionChange: (connected: boolean) => void;
}

// Streaming modes
type StreamingMode = "all" | "single" | null;

class DeviceService {
  private static instance: DeviceService;
  private socket: Socket | null = null;
  private isConnected = false;
  private isAuthenticated = false;
  private baseUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private activeSingleDeviceStreams = new Set<string>();
  private streamingMode: StreamingMode = null;
  private activeDeviceId: string | null = null;
  private callbacks: DeviceServiceEvents | null = null;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  }

  public static getInstance(): DeviceService {
    if (!DeviceService.instance) {
      DeviceService.instance = new DeviceService();
    }
    return DeviceService.instance;
  }

  public async connect(callbacks: DeviceServiceEvents): Promise<void> {
    this.callbacks = callbacks;

    if (this.socket) {
      console.log("[DeviceService] Socket instance already exists");
      return;
    }

    try {
      this.socket = io(this.baseUrl, {
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 20000,
        forceNew: false,
        transports: ["websocket", "polling"],
      });

      this.setupEventListeners(callbacks);
      this.socket.connect();
    } catch (error) {
      console.error("[DeviceService] Failed to connect to socket:", error);
      callbacks.onError("Failed to connect to server");
    }
  }

  private setupEventListeners(callbacks: DeviceServiceEvents): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("[DeviceService] Socket connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      callbacks.onConnectionChange(true);
      this.authenticateIfTokenExists();
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[DeviceService] Socket disconnected:", reason);
      this.isConnected = false;
      this.isAuthenticated = false;
      this.streamingMode = null;
      this.activeDeviceId = null;
      callbacks.onConnectionChange(false);
      // Clear tracking since backend cleans up automatically on disconnect
      this.activeSingleDeviceStreams.clear();
    });

    this.socket.on("connect_error", (error) => {
      console.error("[DeviceService] Socket connection error:", error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        callbacks.onError("Failed to connect after multiple attempts");
        this.cleanup();
      }
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(
        "[DeviceService] Socket reconnected after",
        attemptNumber,
        "attempts"
      );
      this.restoreActiveStreams();
    });

    // Authentication events
    this.socket.on("auth-success", (authData) => {
      console.log(
        "[DeviceService] Authentication successful:",
        authData?.role || "Unknown role"
      );
      this.isAuthenticated = true;
      callbacks.onAuthSuccess(authData);
    });

    // All device data events
    this.socket.on("all-device-data", (data: AllDeviceResponse) => {
      if (this.streamingMode !== "all") {
        this.streamingMode = "all";
        console.log("[DeviceService] Switched to all device streaming mode");
      }
      callbacks.onDataReceived(data);
    });

    // Single device data events
    this.socket.on("single-device-data", (data: SingleDeviceData) => {
      console.log(
        "[DeviceService] Received single device data:",
        data.uniqueId || data.imei
      );
      if (this.streamingMode !== "single") {
        this.streamingMode = "single";
        this.activeDeviceId = data.uniqueId || data.imei;
        console.log("[DeviceService] Switched to single device streaming mode");
      }
      callbacks.onSingleDeviceDataReceived(data);
    });

    // Error events
    this.socket.on(
      "error",
      (errorData: { message: string; details?: string }) => {
        console.error("[DeviceService] Server error:", errorData);
        callbacks.onError(errorData.message);

        // Handle authentication errors
        if (
          errorData.message.includes("token") ||
          errorData.message.includes("auth")
        ) {
          this.isAuthenticated = false;
          this.cleanup();
        }
      }
    );
  }

  private authenticateIfTokenExists(): void {
    const token = Cookies.get("token");
    if (token && this.isConnected && !this.isAuthenticated) {
      this.authenticate(token);
    }
  }

  private restoreActiveStreams(): void {
    if (!this.isAuthenticated) {
      // Wait for authentication before restoring
      const authHandler = () => {
        this.socket?.off("auth-success", authHandler);
        this.performStreamRestore();
      };
      this.socket?.on("auth-success", authHandler);
      return;
    }

    this.performStreamRestore();
  }

  private performStreamRestore(): void {
    // Restore single device streams after reconnection
    if (this.activeSingleDeviceStreams.size > 0) {
      console.log(
        "[DeviceService] Restoring single device streams:",
        Array.from(this.activeSingleDeviceStreams)
      );
      for (const uniqueId of this.activeSingleDeviceStreams) {
        this.requestSingleDeviceData(uniqueId, false); // Don't add to set again
      }
    }
  }

  private cleanup(): void {
    this.streamingMode = null;
    this.activeDeviceId = null;
    this.activeSingleDeviceStreams.clear();
  }

  public authenticate(token: string): void {
    if (!this.socket?.connected) {
      console.warn("[DeviceService] Cannot authenticate: Socket not connected");
      return;
    }

    console.log("[DeviceService] Sending authentication credentials");
    this.socket.emit("credentials", token);
  }

  public requestDeviceData(filters: DeviceFilters): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      console.warn(
        "[DeviceService] Cannot request data: Not connected or authenticated"
      );
      return;
    }

    // Stop single device streaming if active
    if (this.streamingMode === "single") {
      this.stopAllSingleDeviceStreams();
    }

    console.log(
      "[DeviceService] Requesting all device data with filters:",
      filters
    );
    this.socket.emit("request-all-device-data", filters);
  }

  public requestSingleDeviceData(
    uniqueId: string,
    addToActiveSet: boolean = true
  ): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      console.warn(
        "[DeviceService] Cannot request single device data: Not connected or authenticated"
      );
      return;
    }

    if (!uniqueId?.trim()) {
      console.error("[DeviceService] Invalid uniqueId provided");
      this.callbacks?.onError("Device ID is required");
      return;
    }

    // Stop all device streaming if active
    if (this.streamingMode === "all") {
      this.stopAllDeviceData();
    }

    console.log("[DeviceService] Requesting single device data for:", uniqueId);
    this.socket.emit("request-single-device-data", uniqueId);

    if (addToActiveSet) {
      this.activeSingleDeviceStreams.add(uniqueId);
    }
  }

  public stopAllDeviceData(): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      console.warn(
        "[DeviceService] Cannot stop all device data: Not connected or authenticated"
      );
      return;
    }

    console.log("[DeviceService] Stopping all device data streaming");
    this.socket.emit("stop-all-device-data");
    this.streamingMode = null;
  }

  public stopSingleDeviceStream(uniqueId: string): void {
    if (this.activeSingleDeviceStreams.has(uniqueId)) {
      this.activeSingleDeviceStreams.delete(uniqueId);
      console.log("[DeviceService] Removed single device stream:", uniqueId);

      // If no more active streams, reset mode
      if (this.activeSingleDeviceStreams.size === 0) {
        this.streamingMode = null;
        this.activeDeviceId = null;
      }
    }
  }

  public stopAllSingleDeviceStreams(): void {
    console.log("[DeviceService] Stopping all single device streams");
    this.activeSingleDeviceStreams.clear();
    this.streamingMode = null;
    this.activeDeviceId = null;
  }

  public disconnect(): void {
    console.log("[DeviceService] Disconnecting socket");

    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }

    this.isConnected = false;
    this.isAuthenticated = false;
    this.cleanup();
    this.callbacks = null;
  }

  // Getters
  public get connected(): boolean {
    return this.isConnected;
  }

  public get authenticated(): boolean {
    return this.isAuthenticated;
  }

  public get activeSingleDeviceIds(): string[] {
    return Array.from(this.activeSingleDeviceStreams);
  }

  public get currentStreamingMode(): StreamingMode {
    return this.streamingMode;
  }

  public get currentActiveDeviceId(): string | null {
    return this.activeDeviceId;
  }

  public isSingleDeviceActive(uniqueId: string): boolean {
    return this.activeSingleDeviceStreams.has(uniqueId);
  }

  public isAllDeviceStreamingActive(): boolean {
    return this.streamingMode === "all";
  }

  public isSingleDeviceStreamingActive(): boolean {
    return this.streamingMode === "single";
  }

  // Utility methods
  public getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    streamingMode: StreamingMode;
    activeDeviceId: string | null;
    activeSingleDevices: string[];
  } {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      streamingMode: this.streamingMode,
      activeDeviceId: this.activeDeviceId,
      activeSingleDevices: this.activeSingleDeviceIds,
    };
  }
}

export default DeviceService;
