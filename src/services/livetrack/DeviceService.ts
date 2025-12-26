import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { AllDeviceResponse, DeviceFilters } from "@/types/socket";
import { useEffect } from "react";

// ============================================================
// Type Definitions
// ============================================================

/**
 * Represents data for a single GPS tracking device
 */
export interface SingleDeviceData {
  imei: string;
  uniqueId: number;
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

/**
 * Event callbacks for device service socket events
 */
export interface DeviceServiceEvents {
  onDataReceived: (data: AllDeviceResponse) => void;
  onSingleDeviceDataReceived: (data: SingleDeviceData) => void;
  onAuthSuccess: (authData?: { role: string; message: string }) => void;
  onError: (error: string) => void;
  onConnectionChange: (connected: boolean) => void;
  onChatListReceived?: (contacts: ChatContact[]) => void;
  onChatHistoryReceived?: (messages: ServerMessage[]) => void;
  onNewMessage?: (message: ServerMessage) => void;
  onChatJoined?: (data: {
    chatId: string;
    receiverId: string;
    receiverRole: string;
  }) => void;
  onUserTyping?: (data: {
    userId: string;
    userRole: string;
    isTyping: boolean;
  }) => void;
  onMessagesRead?: (data: {
    chatId: string;
    messageIds: string[];
    readBy: string;
  }) => void;
  onDeliveryUpdate?: (data: {
    messageId: string;
    deliveredTo: string[];
  }) => void;
}

/**
 * Chat contact information
 */
export interface ChatContact {
  _id: string;
  role: string;
  name: string;
  email?: string | null;
  mobileNo?: string | null;
  lastMessage?: string;
  lastMessageTime?: string | null;
  chatId?: string;
}

/**
 * Server message structure
 */
export interface ServerMessage {
  _id: string;
  chatId: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: string;
  sender: { userId: string; userModel: string };
  deliveredTo: string[];
  readBy: string[];
  createdAt: string;
}

/**
 * Chat conversation structure
 */
export interface Chat {
  _id: string;
  participants: Array<{
    userId: string;
    userModel: string;
  }>;
  lastMessage?: string;
  lastMessageTime?: Date;
  createdAt: string;
  updatedAt: string;
}

/**
 * Message structure (simplified)
 */
export interface Message {
  _id: string;
  chatId: string;
  text: string;
  sender: {
    userId: string;
    userModel: string;
  };
  createdAt: string;
  read: boolean;
}

type StreamingMode = "all" | "single" | null;

// ============================================================
// Device Service Singleton Class
// ============================================================

/**
 * Singleton service for managing WebSocket connections to handle:
 * - Real-time GPS device tracking data
 * - Chat messaging functionality
 * - Authentication and connection management
 *
 * @example
 * const deviceService = DeviceService.getInstance();
 * await deviceService.connect({
 *   onDataReceived: (data) => console.log(data),
 *   onError: (error) => console.error(error),
 *   // ... other callbacks
 * });
 */
class DeviceService {
  private static instance: DeviceService;

  // Connection properties
  private socket: Socket | null = null;
  private token = Cookies.get("token");
  private baseUrl: string;
  private isConnected = false;
  private isAuthenticated = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Device streaming state
  private streamingMode: StreamingMode = null;
  private activeDeviceId: string | null = null;
  private activeSingleDeviceStreams = new Set<string>();

  // Chat state
  private currentChatId: string | null = null;
  private activeContactInfo: { userId: string; userRole: string } | null = null;

  // Callbacks
  private callbacks: DeviceServiceEvents | null = null;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_SOCKET_BASE_URL || "";
  }

  /**
   * Get singleton instance of DeviceService
   */
  public static getInstance(): DeviceService {
    if (!DeviceService.instance) {
      DeviceService.instance = new DeviceService();
    }
    return DeviceService.instance;
  }

  // ============================================================
  // Connection Management
  // ============================================================

  /**
   * Initialize and connect to the WebSocket server
   * @param callbacks - Event callbacks for handling socket events
   */
  public async connect(callbacks: DeviceServiceEvents): Promise<void> {
    this.callbacks = callbacks;

    if (this.socket) {
      return;
    }
    try {

      console.log("Connecting to WebSocket server... [TOKEN]: ", this.token);
      this.socket = io(this.baseUrl, {
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 20000,
        forceNew: false,
        transports: ["websocket", "polling"],
        auth: {
          token: `Bearer ${this.token}`,
        },
      });

      this.setupEventListeners(callbacks);
      this.socket.connect();
    } catch (error) {
      callbacks.onError("Failed to connect to server");
    }
  }

  /**
   * Disconnect from the WebSocket server and cleanup resources
   */
  public disconnect(): void {
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

  /**
   * Authenticate with the server using a token
   * @param token - JWT authentication token
   */
  public authenticate(token: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit("credentials", token);
  }

  // ============================================================
  // Event Listeners Setup
  // ============================================================

  /**
   * Setup all socket event listeners
   */
  private setupEventListeners(callbacks: DeviceServiceEvents): void {
    if (!this.socket) return;

    // Connection event handlers
    this.setupConnectionListeners(callbacks);

    // Authentication event handlers
    this.setupAuthListeners(callbacks);

    // Device data event handlers
    this.setupDeviceDataListeners(callbacks);

    // Chat event handlers
    this.setupChatListeners();

    // Error event handlers
    this.setupErrorListeners(callbacks);
  }

  /**
   * Setup connection-related event listeners
   */
  private setupConnectionListeners(callbacks: DeviceServiceEvents): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      callbacks.onConnectionChange(true);
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      this.isAuthenticated = false;
      this.streamingMode = null;
      this.activeDeviceId = null;
      callbacks.onConnectionChange(false);
      this.activeSingleDeviceStreams.clear();
    });

    this.socket.on("connect_error", (error) => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        callbacks.onError("Failed to connect after multiple attempts");
        this.cleanup();
      }
    });

    this.socket.on("reconnect", (attemptNumber) => {
      this.restoreActiveStreams();
    });
  }

  /**
   * Setup authentication event listeners
   */
  private setupAuthListeners(callbacks: DeviceServiceEvents): void {
    if (!this.socket) return;

    this.socket.on("auth-success", (authData) => {
      this.isAuthenticated = true;
      callbacks.onAuthSuccess(authData);
    });
  }

  /**
   * Setup device data event listeners
   */
  private setupDeviceDataListeners(callbacks: DeviceServiceEvents): void {
    if (!this.socket) return;

    this.socket.on("all-device-data", (data: AllDeviceResponse) => {
      if (this.streamingMode !== "all") {
        this.streamingMode = "all";
      }
      callbacks.onDataReceived(data);
    });

    this.socket.on("single-device-data", (data: SingleDeviceData) => {
      const deviceKey = this.getDeviceKey(data);
      if (this.streamingMode !== "single") {
        this.streamingMode = "single";
        this.activeDeviceId = deviceKey;
      }
      callbacks.onSingleDeviceDataReceived(data);
    });
  }

  /**
   * Setup chat-related event listeners
   */
  private setupChatListeners(): void {
    if (!this.socket) return;

    this.socket.on("chatList", (contacts: ChatContact[]) => {
      this.callbacks?.onChatListReceived?.(contacts);
    });

    this.socket.on("chatHistory", (messages: ServerMessage[]) => {
      if (!this.currentChatId && messages[0]?.chatId) {
        this.currentChatId = messages[0].chatId;
      }
      this.callbacks?.onChatHistoryReceived?.(messages);
    });

    this.socket.on("newMessage", (message: ServerMessage) => {
      this.callbacks?.onNewMessage?.(message);
    });

    this.socket.on(
      "chatJoined",
      (data: { chatId: string; receiverId: string; receiverRole: string }) => {
        this.currentChatId = data.chatId;
        this.callbacks?.onChatJoined?.(data);
      }
    );

    this.socket.on(
      "userTyping",
      (data: { userId: string; userRole: string; isTyping: boolean }) => {
        this.callbacks?.onUserTyping?.(data);
      }
    );

    this.socket.on(
      "messagesRead",
      (data: { chatId: string; messageIds: string[]; readBy: string }) => {
        this.callbacks?.onMessagesRead?.(data);
      }
    );

    this.socket.on(
      "deliveryUpdate",
      (data: { messageId: string; deliveredTo: string[] }) => {
        this.callbacks?.onDeliveryUpdate?.(data);
      }
    );
  }

  /**
   * Setup error event listeners
   */
  private setupErrorListeners(callbacks: DeviceServiceEvents): void {
    if (!this.socket) return;

    this.socket.on(
      "error",
      (errorData: { message: string; details?: string }) => {
        callbacks.onError(errorData.message);

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

  // ============================================================
  // Device Data Streaming Methods
  // ============================================================

  /**
   * Request real-time data for all devices with filters
   * @param filters - Device filtering criteria
   */
  public requestDeviceData(filters: DeviceFilters): void {
    if (!this.socket?.connected) {
      return;
    }

    if (this.streamingMode === "single") {
      this.stopAllSingleDeviceStreams();
    }

    this.socket.emit("request-all-device-data", filters);
  }

  /**
   * Request real-time data for a single device
   * @param uniqueId - Device unique identifier
   * @param addToActiveSet - Whether to track this stream (default: true)
   */
  public requestSingleDeviceData(
    uniqueId: string | number,
    addToActiveSet: boolean = true
  ): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      return;
    }

    const deviceKey = String(uniqueId).trim();

    if (!deviceKey) {
      this.callbacks?.onError("Device ID is required");
      return;
    }

    if (this.streamingMode === "all") {
      this.stopAllDeviceData();
      this.socket.emit("request-single-device-data", deviceKey);
      return;
    }

    if (this.streamingMode === "single") {
      this.stopSingleDeviceData();
      this.socket.emit("request-single-device-data", deviceKey);
      return;
    }

    this.socket.emit("request-single-device-data", deviceKey);

    if (addToActiveSet) {
      this.activeSingleDeviceStreams.add(deviceKey);
    }
  }

  /**
   * Stop streaming all device data
   */
  public stopAllDeviceData(): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      return;
    }

    this.socket.emit("stop-all-device-data");
    this.streamingMode = null;
  }

  /**
   * Stop streaming single device data
   */
  public stopSingleDeviceData(): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      return;
    }

    this.socket.emit("stop-single-device-data");
    this.streamingMode = null;
  }

  /**
   * Stop streaming for a specific device
   * @param uniqueId - Device unique identifier
   */
  public stopSingleDeviceStream(uniqueId: string): void {
    if (this.activeSingleDeviceStreams.has(uniqueId)) {
      this.activeSingleDeviceStreams.delete(uniqueId);

      if (this.activeSingleDeviceStreams.size === 0) {
        this.streamingMode = null;
        this.activeDeviceId = null;
      }
    }
  }

  /**
   * Stop all single device streams
   */
  public stopAllSingleDeviceStreams(): void {
    this.activeSingleDeviceStreams.clear();
    this.streamingMode = null;
    this.activeDeviceId = null;
  }

  // ============================================================
  // Chat Methods
  // ============================================================

  /**
   * Fetch the list of chat contacts
   */
  public fetchChatList(): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      return;
    }

    this.socket.emit("fetchChatList");
  }

  /**
   * Join a chat with a specific contact
   * @param userId - Contact user ID
   * @param userRole - Contact user role
   */
  public joinChatWithContact(userId: string, userRole: string): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      return;
    }

    if (!userId?.trim() || !userRole?.trim()) {
      return;
    }

    this.socket.emit("joinChat", userId, userRole);
    this.activeContactInfo = { userId, userRole };
  }

  /**
   * Send a message to a contact
   * @param userId - Recipient user ID
   * @param userRole - Recipient user role
   * @param text - Message text content
   * @param media - Optional media attachment
   */
  public sendMessageToContact(
    userId: string,
    userRole: string,
    text: string,
    media?: { url?: string; type?: string }
  ): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      return;
    }

    if (!text?.trim()) {
      return;
    }

    this.socket.emit("sendMessage", {
      chatUserId: userId,
      chatUserRole: userRole,
      text: text.trim(),
      mediaUrl: media?.url || null,
      mediaType: media?.type || "none",
    });
  }

  /**
   * Leave the current active chat
   */
  public leaveChat(): void {
    this.currentChatId = null;
    this.activeContactInfo = null;
  }

  /**
   * Emit typing indicator to other participants
   * @param chatUserId - User ID in chat
   * @param chatUserRole - User role in chat
   * @param isTyping - Whether user is currently typing
   */
  public emitTyping(
    chatUserId: string,
    chatUserRole: string,
    isTyping: boolean
  ): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      return;
    }

    this.socket.emit("typing", {
      chatUserId,
      chatUserRole,
      isTyping,
    });
  }

  /**
   * Mark messages as read
   * @param chatId - Chat ID
   * @param messageIds - Array of message IDs to mark as read
   */
  public markMessagesAsRead(chatId: string, messageIds: string[]): void {
    if (!this.socket?.connected || !this.isAuthenticated) return;

    this.socket.emit("markAsRead", {
      chatId,
      messageIds,
    });
  }

  /**
   * Confirm message delivery
   * @param messageId - Message ID to confirm delivery
   */
  public confirmMessageDelivery(messageId: string): void {
    if (!this.socket?.connected || !this.isAuthenticated) return;

    this.socket.emit("messageDelivered", { messageId });
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Get unique device key from device data
   */
  private getDeviceKey(data: SingleDeviceData): string {
    return String(data.uniqueId || data.imei);
  }

  /**
   * Restore active streams after reconnection
   */
  private restoreActiveStreams(): void {
    if (!this.isAuthenticated) {
      const authHandler = () => {
        this.socket?.off("auth-success", authHandler);
        this.performStreamRestore();
      };
      this.socket?.on("auth-success", authHandler);
      return;
    }

    if (this.activeContactInfo) {
      this.joinChatWithContact(
        this.activeContactInfo.userId,
        this.activeContactInfo.userRole
      );
    }

    this.performStreamRestore();
  }

  /**
   * Perform actual stream restoration
   */
  private performStreamRestore(): void {
    if (this.activeSingleDeviceStreams.size > 0) {
      for (const uniqueId of this.activeSingleDeviceStreams) {
        this.requestSingleDeviceData(uniqueId, false);
      }
    }
  }

  /**
   * Cleanup service state
   */
  private cleanup(): void {
    this.streamingMode = null;
    this.activeDeviceId = null;
    this.activeSingleDeviceStreams.clear();
    this.currentChatId = null;
    this.activeContactInfo = null;
  }

  // ============================================================
  // Getters
  // ============================================================

  public get connected(): boolean {
    return this.isConnected;
  }

  public get authenticated(): boolean {
    return this.isAuthenticated;
  }

  public get activeChatId(): string | null {
    return this.currentChatId;
  }

  public get activeContact(): { userId: string; userRole: string } | null {
    return this.activeContactInfo;
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

  /**
   * Check if a specific device stream is active
   */
  public isSingleDeviceActive(uniqueId: string): boolean {
    return this.activeSingleDeviceStreams.has(uniqueId);
  }

  /**
   * Check if all device streaming is active
   */
  public isAllDeviceStreamingActive(): boolean {
    return this.streamingMode === "all";
  }

  /**
   * Check if single device streaming is active
   */
  public isSingleDeviceStreamingActive(): boolean {
    return this.streamingMode === "single";
  }

  /**
   * Get complete connection status
   */
  public getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    streamingMode: StreamingMode;
    activeDeviceId: string | null;
    activeSingleDevices: string[];
    activeChatId: string | null;
    activeContact: { userId: string; userRole: string } | null;
  } {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      streamingMode: this.streamingMode,
      activeDeviceId: this.activeDeviceId,
      activeSingleDevices: this.activeSingleDeviceIds,
      activeChatId: this.currentChatId,
      activeContact: this.activeContactInfo,
    };
  }
}

export default DeviceService;
