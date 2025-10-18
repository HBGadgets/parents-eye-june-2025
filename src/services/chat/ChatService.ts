import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { useChatStore } from "@/store/useChatStore";

export interface Chat {
  _id: string;
  participants: Array<{
    userId: string;
    userModel: string;
  }>;
  lastMessage?: {
    text: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

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

export interface ChatServiceEvents {
  onChatListReceived: (chats: Chat[]) => void;
  onChatHistoryReceived: (messages: Message[]) => void;
  onNewMessage: (message: Message) => void;
  onAuthSuccess: () => void;
  onError: (error: string) => void;
  onConnectionChange: (connected: boolean) => void;
}

class ChatService {
  private static instance: ChatService;
  private socket: Socket | null = null;
  private isConnected = false;
  private isAuthenticated = false;
  private baseUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentChatId: string | null = null;
  private callbacks: ChatServiceEvents | null = null;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  public async connect(callbacks: ChatServiceEvents): Promise<void> {
    this.callbacks = callbacks;

    if (this.socket) {
      console.log("[ChatService] Socket instance already exists");
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
      console.error("[ChatService] Failed to connect to socket:", error);
      callbacks.onError("Failed to connect to server");
    }
  }

  private setupEventListeners(callbacks: ChatServiceEvents): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("[ChatService] Socket connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      callbacks.onConnectionChange(true);
      this.authenticateIfTokenExists();
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[ChatService] Socket disconnected:", reason);
      this.isConnected = false;
      this.isAuthenticated = false;
      this.currentChatId = null;
      callbacks.onConnectionChange(false);
    });

    this.socket.on("connect_error", (error) => {
      console.error("[ChatService] Socket connection error:", error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        callbacks.onError("Failed to connect after multiple attempts");
        this.cleanup();
      }
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(
        "[ChatService] Socket reconnected after",
        attemptNumber,
        "attempts"
      );
      this.restoreActiveChat();
    });

    // Chat events
    this.socket.on("chatList", (chats: Chat[]) => {
      console.log("[ChatService] Received chat list:", chats.length);
      callbacks.onChatListReceived(chats);
    });

    this.socket.on("chatHistory", (messages: Message[]) => {
      console.log("[ChatService] Received chat history:", messages.length);
      callbacks.onChatHistoryReceived(messages);
    });

    this.socket.on(
      "userTyping",
      (data: { userId: string; userRole: string; isTyping: boolean }) => {
        console.log("[ChatService] User typing:", data);

        if (this.currentChatId) {
          const chatStore = useChatStore.getState();
          chatStore.setUserTyping(
            this.currentChatId,
            data.userId,
            data.userRole,
            data.isTyping
          );
        }
      }
    );

    this.socket.on("newMessage", (message: Message) => {
      console.log("[ChatService] Received new message:", message._id);
      callbacks.onNewMessage(message);
    });

    // Error events
    this.socket.on("error", (errorData: { message: string }) => {
      console.error("[ChatService] Server error:", errorData);
      callbacks.onError(errorData.message);

      if (
        errorData.message.includes("token") ||
        errorData.message.includes("auth")
      ) {
        this.isAuthenticated = false;
        this.cleanup();
      }
    });
  }

  private authenticateIfTokenExists(): void {
    const token = Cookies.get("token");
    if (token && this.isConnected && !this.isAuthenticated) {
      this.authenticate(token);
    }
  }

  private restoreActiveChat(): void {
    if (!this.isAuthenticated) {
      const authHandler = () => {
        this.socket?.off("auth-success", authHandler);
        this.performChatRestore();
      };
      this.socket?.on("auth-success", authHandler);
      return;
    }

    this.performChatRestore();
  }

  private performChatRestore(): void {
    // Fetch chat list after reconnection
    this.fetchChatList();

    // Rejoin current chat if any
    if (this.currentChatId) {
      console.log("[ChatService] Restoring chat:", this.currentChatId);
      this.joinChat(this.currentChatId);
    }
  }

  private cleanup(): void {
    this.currentChatId = null;
  }

  public authenticate(token: string): void {
    if (!this.socket?.connected) {
      console.warn("[ChatService] Cannot authenticate: Socket not connected");
      return;
    }

    console.log("[ChatService] Sending authentication credentials");
    this.socket.emit("credentials", token);
    this.isAuthenticated = true;
    this.callbacks?.onAuthSuccess();
  }

  public fetchChatList(): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      console.warn(
        "[ChatService] Cannot fetch chat list: Not connected or authenticated"
      );
      return;
    }

    console.log("[ChatService] Fetching chat list");
    this.socket.emit("fetchChatList");
  }

  public emitTyping(isTyping: boolean): void {
    if (!this.socket?.connected || !this.currentChatId) return;

    console.log("[ChatService] Emitting typing:", isTyping);
    this.socket.emit("typing", { isTyping });
  }

  public joinChat(chatId: string): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      console.warn(
        "[ChatService] Cannot join chat: Not connected or authenticated"
      );
      return;
    }

    if (!chatId?.trim()) {
      console.error("[ChatService] Invalid chatId provided");
      this.callbacks?.onError("Chat ID is required");
      return;
    }

    // Leave previous chat room if any
    if (this.currentChatId && this.currentChatId !== chatId) {
      this.leaveChat(this.currentChatId);
    }

    console.log("[ChatService] Joining chat:", chatId);
    this.socket.emit("joinChat", chatId);
    this.currentChatId = chatId;
  }

  public leaveChat(chatId: string): void {
    if (!this.socket?.connected) return;

    console.log("[ChatService] Leaving chat:", chatId);
    // Socket.io automatically handles room leaving, but you can add custom logic
    if (this.currentChatId === chatId) {
      this.currentChatId = null;
    }
  }

  public sendMessage(chatId: string, text: string): void {
    if (!this.socket?.connected || !this.isAuthenticated) {
      console.warn(
        "[ChatService] Cannot send message: Not connected or authenticated"
      );
      this.callbacks?.onError("Cannot send message: Not connected");
      return;
    }

    if (!text?.trim()) {
      console.error("[ChatService] Cannot send empty message");
      this.callbacks?.onError("Message cannot be empty");
      return;
    }

    console.log("[ChatService] Sending message to chat:", chatId);
    this.socket.emit("sendMessage", { chatId, text: text.trim() });
  }

  public disconnect(): void {
    console.log("[ChatService] Disconnecting socket");

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

  public get activeChatId(): string | null {
    return this.currentChatId;
  }

  public getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    activeChatId: string | null;
  } {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      activeChatId: this.currentChatId,
    };
  }
}

export default ChatService;
