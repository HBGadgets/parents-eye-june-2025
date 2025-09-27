import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { AllDeviceResponse, DeviceFilters } from "@/types/socket";

export interface DeviceServiceEvents {
  onDataReceived: (data: AllDeviceResponse) => void;
  onAuthSuccess: () => void;
  onError: (error: string) => void;
  onConnectionChange: (connected: boolean) => void;
}

// NOTE: Rona Mat This is a Good Service Class for managing socket connection and events

class DeviceService {
  private static instance: DeviceService;
  private socket: Socket | null = null;
  private isConnected = false;
  private isAuthenticated = false;
  private baseUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

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
    if (this.socket?.connected) {
      // console.log("Already connected to socket");
      return;
    }

    try {
      this.socket = io(this.baseUrl, {
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventListeners(callbacks);
      this.socket.connect();
    } catch (error) {
      console.error("Failed to connect to socket:", error);
      callbacks.onError("Failed to connect to server");
    }
  }

  private setupEventListeners(callbacks: DeviceServiceEvents): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      // console.log("Socket connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      callbacks.onConnectionChange(true);
      this.authenticateIfTokenExists();
    });

    this.socket.on("disconnect", () => {
      // console.log("Socket disconnected");
      this.isConnected = false;
      this.isAuthenticated = false;
      callbacks.onConnectionChange(false);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        callbacks.onError("Failed to connect after multiple attempts");
      }
    });

    // Authentication events
    this.socket.on("auth-success", () => {
      //   // console.log("Authentication successful");
      this.isAuthenticated = true;
      callbacks.onAuthSuccess();
    });

    // Data events
    this.socket.on("all-device-data", (data: AllDeviceResponse) => {
      callbacks.onDataReceived(data);
    });

    // Error events
    this.socket.on(
      "error",
      (errorData: { message: string; details?: string }) => {
        // console.error("Server error:", errorData);
        callbacks.onError(errorData.message);
        this.isAuthenticated = false;
      }
    );
  }

  private authenticateIfTokenExists(): void {
    const token = Cookies.get("token");
    if (token && this.isConnected && !this.isAuthenticated) {
      this.authenticate(token);
    }
  }

  public authenticate(token: string): void {
    if (!this.socket?.connected) {
      //   console.warn("Cannot authenticate: Socket not connected");
      return;
    }

    // console.log("Sending authentication credentials");
    this.socket.emit("credentials", token);
  }

  public requestDeviceData(filters: DeviceFilters): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      //   console.warn("Cannot request data: Not connected or authenticated");
      return;
    }

    // // console.log("Requesting device data with filters:", filters);
    this.socket.emit("request-all-device-data", filters);
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }
    this.isConnected = false;
    this.isAuthenticated = false;
  }

  public get connected(): boolean {
    return this.isConnected;
  }

  public get authenticated(): boolean {
    return this.isAuthenticated;
  }
}

export default DeviceService;
