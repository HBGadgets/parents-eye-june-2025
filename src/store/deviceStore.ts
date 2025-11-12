import { create } from "zustand";
import { devtools } from "zustand/middleware";
import Cookies from "js-cookie";
import DeviceService, {
  SingleDeviceData,
} from "@/services/livetrack/DeviceService";
import { AllDeviceResponse } from "@/types/socket";
import { useChatStore } from "./useChatStore";

export interface DeviceFilters {
  page: number;
  limit: number;
  filter:
    | "all"
    | "running"
    | "overspeed"
    | "idle"
    | "stopped"
    | "inactive"
    | "new";
  searchTerm: string;
}

// Enhanced auth data interface
interface AuthData {
  role: string;
  message: string;
  userId?: string; // Optional: if backend sends it
}

// Streaming modes
type StreamingMode = "all" | "single" | null;

interface DeviceState {
  // Data
  deviceData: AllDeviceResponse | null;
  singleDeviceData: Map<string, SingleDeviceData>;
  filters: DeviceFilters;

  // Connection status
  isConnected: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userRole: string | null;

  // Streaming state
  streamingMode: StreamingMode;
  activeDeviceId: string | null;
  activeSingleDevices: Set<string>;
  singleDeviceLoading: Set<string>;

  // Pagination helpers
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  updateFilters: (newFilters: Partial<DeviceFilters>) => void;
  setPage: (page: number) => void;
  clearError: () => void;
  refreshData: () => void;

  // Single device actions
  startSingleDeviceStream: (uniqueId: string) => void;
  stopSingleDeviceStream: (uniqueId: string) => void;
  stopAllSingleDeviceStreams: () => void;
  switchToAllDevices: () => void;
  getSingleDeviceData: (uniqueId: string) => SingleDeviceData | null;
  clearSingleDeviceData: (uniqueId: string) => void;
  clearAllSingleDeviceData: () => void;

  // Stream state checks
  isDeviceStreamActive: (uniqueId: string) => boolean;
  isDeviceLoading: (uniqueId: string) => boolean;
  isAllDeviceStreamingActive: () => boolean;
  isSingleDeviceStreamingActive: () => boolean;

  // Utility methods
  getConnectionStatus: () => {
    connected: boolean;
    authenticated: boolean;
    streamingMode: StreamingMode;
    activeDeviceId: string | null;
    activeSingleDevices: string[];
    userRole: string | null;
  };
}

const initialFilters: DeviceFilters = {
  page: 1,
  limit: 10,
  filter: "all",
  searchTerm: "",
};

// ========== MODULE-LEVEL MAP FOR CHAT WORKAROUND ==========
// Tracks userId -> chatId mappings built from chat events
const userChatIdMap = new Map<string, string>();

export const useDeviceStore = create<DeviceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      deviceData: null,
      singleDeviceData: new Map(),
      filters: initialFilters,
      isConnected: false,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userRole: null,
      streamingMode: null,
      activeDeviceId: null,
      activeSingleDevices: new Set(),
      singleDeviceLoading: new Set(),
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,

      // Actions
      connect: async () => {
        const deviceService = DeviceService.getInstance();
        set({ isLoading: true, error: null });

        try {
          await deviceService.connect({
            onDataReceived: (data: AllDeviceResponse) => {
              const state = get();
              const totalPages = Math.ceil(data.total / state.filters.limit);

              set({
                deviceData: data,
                isLoading: false,
                streamingMode: "all",
                totalPages,
                hasNextPage: state.filters.page < totalPages,
                hasPrevPage: state.filters.page > 1,
              });
            },

            onSingleDeviceDataReceived: (data: SingleDeviceData) => {
              set((state) => {
                const newSingleDeviceData = new Map(state.singleDeviceData);
                const newSingleDeviceLoading = new Set(
                  state.singleDeviceLoading
                );

                const deviceKey = String(data.uniqueId || data.imei);

                newSingleDeviceData.set(deviceKey, data);
                newSingleDeviceLoading.delete(deviceKey);

                return {
                  singleDeviceData: newSingleDeviceData,
                  singleDeviceLoading: newSingleDeviceLoading,
                  streamingMode: "single" as StreamingMode,
                  activeDeviceId: deviceKey,
                };
              });
            },

            // ========== AUTH SUCCESS - EXTRACT USERID FROM JWT ==========
            onAuthSuccess: (authData?: AuthData) => {
              // console.log("[DeviceStore] Auth success:", authData);

              set({
                isAuthenticated: true,
                userRole: authData?.role || null,
                error: null,
              });

              const chatStore = useChatStore.getState();

              // Try to get userId from authData first (if backend sends it)
              if (authData?.userId) {
                chatStore.setCurrentUserId(authData.userId);
                localStorage.setItem("userId", authData.userId);
                // console.log(
                //   "[DeviceStore] ✅ Set currentUserId from auth:",
                //   authData.userId
                // );
              } else {
                // Fallback: Decode JWT token to extract userId
                const token = Cookies.get("token");
                if (token) {
                  try {
                    const base64Url = token.split(".")[1];
                    const base64 = base64Url
                      .replace(/-/g, "+")
                      .replace(/_/g, "/");
                    const jsonPayload = decodeURIComponent(
                      atob(base64)
                        .split("")
                        .map(
                          (c) =>
                            "%" +
                            ("00" + c.charCodeAt(0).toString(16)).slice(-2)
                        )
                        .join("")
                    );

                    const payload = JSON.parse(jsonPayload);
                    // console.log("[DeviceStore] Decoded JWT payload:", payload);

                    // Try common JWT field names
                    const userId =
                      payload.id ||
                      payload.userId ||
                      payload.sub ||
                      payload.user_id;

                    if (userId) {
                      chatStore.setCurrentUserId(userId);
                      localStorage.setItem("userId", userId);
                      // console.log(
                      //   "[DeviceStore] ✅ Set currentUserId from JWT:",
                      //   userId
                      // );
                    } else {
                      // console.error(
                      //   "[DeviceStore] ❌ No userId found in JWT. Keys:",
                      //   Object.keys(payload)
                      // );
                    }
                  } catch (err) {
                    // console.error(
                    //   "[DeviceStore] ❌ Failed to decode JWT:",
                    //   err
                    // );
                  }
                } else {
                  // console.error("[DeviceStore] ❌ No token in cookies");
                }
              }

              // Request initial data
              const state = get();
              if (state.streamingMode !== "single") {
                deviceService.requestDeviceData(state.filters);
              }

              if (state.activeSingleDevices.size > 0) {
                state.activeSingleDevices.forEach((uniqueId) => {
                  deviceService.requestSingleDeviceData(uniqueId, false);
                });
              }
            },

            onError: (error: string) => {
              // console.error("[DeviceStore] Error:", error);

              set({
                error,
                isLoading: false,
              });

              if (
                error.includes("token") ||
                error.includes("auth") ||
                error.includes("Invalid") ||
                error.includes("expired")
              ) {
                set({
                  isAuthenticated: false,
                  userRole: null,
                  streamingMode: null,
                  activeDeviceId: null,
                });
              }
            },

            onConnectionChange: (connected: boolean) => {
              set({ isConnected: connected });

              if (!connected) {
                set({
                  isAuthenticated: false,
                  userRole: null,
                  streamingMode: null,
                  activeDeviceId: null,
                  singleDeviceLoading: new Set(),
                  error: connected === false ? "Connection lost" : null,
                });
              } else {
                const currentState = get();
                if (currentState.error === "Connection lost") {
                  set({ error: null });
                }
              }
            },

            // ========== CHAT CALLBACKS WITH WORKAROUNDS ==========

            onChatListReceived: (contacts) => {
              // console.log("[DeviceStore] Chat list received:", contacts.length);

              // ✅ WORKAROUND: Inject chatIds from our map
              const enhancedContacts = contacts.map((contact) => {
                const storedChatId = userChatIdMap.get(contact._id);
                if (storedChatId && !contact.chatId) {
                  // console.log(
                  //   "[DeviceStore] 🔧 Adding chatId to contact:",
                  //   contact.name,
                  //   "→",
                  //   storedChatId
                  // );
                  return { ...contact, chatId: storedChatId };
                }
                return contact;
              });

              const chatStore = useChatStore.getState();
              chatStore.setContacts(enhancedContacts);
              chatStore.setLoading(false);
            },

            onChatHistoryReceived: (messages) => {
              // console.log("[DeviceStore] Chat history received:", {
              //   count: messages.length,
              //   chatId: messages[0]?.chatId,
              // });

              const chatStore = useChatStore.getState();
              const chatId = messages[0]?.chatId;

              if (chatId) {
                // ✅ WORKAROUND: Store userId -> chatId mappings for all participants
                const currentUserId = chatStore.currentUserId;
                messages.forEach((msg) => {
                  if (msg.sender.userId !== currentUserId) {
                    userChatIdMap.set(msg.sender.userId, chatId);
                    // console.log(
                    //   "[DeviceStore] 📝 Stored mapping:",
                    //   msg.sender.userId,
                    //   "→",
                    //   chatId
                    // );
                  }
                });

                // console.log(
                //   "[DeviceStore] Setting chat history for chatId:",
                //   chatId
                // );
                chatStore.setChatHistory(chatId, messages);

                // ✅ WORKAROUND: Fix activeChatId if it's wrong/null
                if (chatStore.activeContact) {
                  const currentActiveChatId = chatStore.activeChatId;

                  if (!currentActiveChatId || currentActiveChatId !== chatId) {
                    // console.log("[DeviceStore] 🔧 Fixing activeChatId:", {
                    //   before: currentActiveChatId,
                    //   after: chatId,
                    // });

                    chatStore.setActiveChat({
                      ...chatStore.activeContact,
                      chatId: chatId,
                    });
                  }
                }
              } else {
                // console.error("[DeviceStore] ❌ No chatId in history messages");
              }
              chatStore.setLoading(false);
            },

            onNewMessage: (message) => {
              // console.log("[DeviceStore] New message received:", {
              //   _id: message._id,
              //   chatId: message.chatId,
              //   sender: message.sender.userId,
              // });

              const chatStore = useChatStore.getState();

              // ✅ WORKAROUND: Store userId -> chatId mapping from newMessage
              const currentUserId = chatStore.currentUserId;
              if (message.sender.userId !== currentUserId) {
                userChatIdMap.set(message.sender.userId, message.chatId);
                // console.log(
                //   "[DeviceStore] 📝 Stored mapping from newMessage:",
                //   message.sender.userId,
                //   "→",
                //   message.chatId
                // );
              }

              chatStore.addMessage(message);
            },

            // ========== OPTIONAL CHAT CALLBACKS ==========

            onChatJoined: (data) => {
              // console.log("[DeviceStore] Chat joined:", data.chatId);
            },

            onUserTyping: (data) => {
              // console.log(
              //   "[DeviceStore] User typing:",
              //   data.userId,
              //   data.isTyping
              // );

              const chatStore = useChatStore.getState();
              const contact = chatStore.contacts.find(
                (c) => c._id === data.userId && c.role === data.userRole
              );

              if (contact?.chatId) {
                chatStore.setUserTyping(
                  contact.chatId,
                  data.userId,
                  data.userRole,
                  data.isTyping
                );
              }
            },

            onMessagesRead: (data) => {
              // console.log(
              //   "[DeviceStore] Messages read:",
              //   data.messageIds.length
              // );
              const chatStore = useChatStore.getState();
              chatStore.updateMessageReadStatus(data.messageIds, data.readBy);
            },

            onDeliveryUpdate: (data) => {
              // console.log("[DeviceStore] Delivery update:", data.messageId);
              const chatStore = useChatStore.getState();
              chatStore.updateMessageDelivery(data.messageId, data.deliveredTo);
            },
          });
        } catch (error) {
          // console.error("[DeviceStore] Connection failed:", error);
          set({
            error: "Failed to initialize connection",
            isLoading: false,
          });
        }
      },

      disconnect: () => {
        // console.log("[DeviceStore] Disconnecting");

        const deviceService = DeviceService.getInstance();
        deviceService.disconnect();

        set({
          isConnected: false,
          isAuthenticated: false,
          userRole: null,
          deviceData: null,
          singleDeviceData: new Map(),
          streamingMode: null,
          activeDeviceId: null,
          activeSingleDevices: new Set(),
          singleDeviceLoading: new Set(),
          error: null,
        });

        // Clear chat store and userId map
        const chatStore = useChatStore.getState();
        chatStore.clearChat();
        userChatIdMap.clear();
      },

      updateFilters: (newFilters: Partial<DeviceFilters>) => {
        const state = get();
        const updatedFilters = { ...state.filters, ...newFilters };

        if (newFilters.filter || newFilters.searchTerm !== undefined) {
          updatedFilters.page = 1;
        }

        set({ filters: updatedFilters, isLoading: true });

        const deviceService = DeviceService.getInstance();
        if (deviceService.authenticated) {
          deviceService.requestDeviceData(updatedFilters);
        }
      },

      setPage: (page: number) => {
        const state = get();
        if (page < 1 || page > state.totalPages) return;

        const updatedFilters = { ...state.filters, page };
        set({ filters: updatedFilters, isLoading: true });

        const deviceService = DeviceService.getInstance();
        if (deviceService.authenticated) {
          deviceService.requestDeviceData(updatedFilters);
        }
      },

      clearError: () => {
        set({ error: null });
      },

      refreshData: () => {
        const state = get();
        set({ isLoading: true });

        const deviceService = DeviceService.getInstance();
        if (deviceService.authenticated) {
          if (state.streamingMode === "all") {
            deviceService.requestDeviceData(state.filters);
          } else if (state.streamingMode === "single" && state.activeDeviceId) {
            deviceService.requestSingleDeviceData(state.activeDeviceId, false);
          }
        }
      },

      // ... (rest of your device streaming methods remain unchanged)

      startSingleDeviceStream: (uniqueId: string | number) => {
        const deviceService = DeviceService.getInstance();

        if (!deviceService.authenticated || !deviceService.connected) {
          set({
            error: "Cannot start device stream: Not connected or authenticated",
          });
          return;
        }

        const deviceId = String(uniqueId);

        if (!deviceId.trim()) {
          set({ error: "Device ID is required" });
          return;
        }

        set((state) => {
          const newActiveSingleDevices = new Set(state.activeSingleDevices);
          const newSingleDeviceLoading = new Set(state.singleDeviceLoading);

          newActiveSingleDevices.add(deviceId);
          newSingleDeviceLoading.add(deviceId);

          return {
            activeSingleDevices: newActiveSingleDevices,
            singleDeviceLoading: newSingleDeviceLoading,
            streamingMode: "single" as StreamingMode,
            activeDeviceId: deviceId,
            error: null,
          };
        });

        deviceService.requestSingleDeviceData(deviceId);
      },

      stopSingleDeviceStream: (uniqueId: string | number) => {
        const deviceId = String(uniqueId);
        const deviceService = DeviceService.getInstance();
        deviceService.stopSingleDeviceStream(deviceId);

        set((state) => {
          const newActiveSingleDevices = new Set(state.activeSingleDevices);
          const newSingleDeviceLoading = new Set(state.singleDeviceLoading);
          const newSingleDeviceData = new Map(state.singleDeviceData);

          newActiveSingleDevices.delete(deviceId);
          newSingleDeviceLoading.delete(deviceId);
          newSingleDeviceData.delete(deviceId);

          const hasActiveStreams = newActiveSingleDevices.size > 0;

          return {
            activeSingleDevices: newActiveSingleDevices,
            singleDeviceLoading: newSingleDeviceLoading,
            singleDeviceData: newSingleDeviceData,
            streamingMode: hasActiveStreams ? "single" : null,
            activeDeviceId: hasActiveStreams ? state.activeDeviceId : null,
          };
        });

        const updatedState = get();
        if (updatedState.activeSingleDevices.size === 0) {
          updatedState.switchToAllDevices();
        }
      },

      stopAllSingleDeviceStreams: () => {
        const deviceService = DeviceService.getInstance();
        deviceService.stopAllSingleDeviceStreams();

        set({
          singleDeviceData: new Map(),
          activeSingleDevices: new Set(),
          singleDeviceLoading: new Set(),
          streamingMode: null,
          activeDeviceId: null,
        });

        const state = get();
        state.switchToAllDevices();
      },

      switchToAllDevices: () => {
        const state = get();
        const deviceService = DeviceService.getInstance();

        if (!deviceService.authenticated || !deviceService.connected) {
          return;
        }

        deviceService.stopAllSingleDeviceStreams();

        set({
          singleDeviceData: new Map(),
          activeSingleDevices: new Set(),
          singleDeviceLoading: new Set(),
          streamingMode: null,
          activeDeviceId: null,
          isLoading: true,
        });

        deviceService.requestDeviceData(state.filters);
      },

      getSingleDeviceData: (uniqueId: string | number) => {
        const state = get();
        return state.singleDeviceData.get(String(uniqueId)) || null;
      },

      clearSingleDeviceData: (uniqueId: string | number) => {
        const deviceId = String(uniqueId);
        const deviceService = DeviceService.getInstance();
        deviceService.stopSingleDeviceStream(deviceId);

        set((state) => {
          const newSingleDeviceData = new Map(state.singleDeviceData);
          const newActiveSingleDevices = new Set(state.activeSingleDevices);
          const newSingleDeviceLoading = new Set(state.singleDeviceLoading);

          newSingleDeviceData.delete(deviceId);
          newActiveSingleDevices.delete(deviceId);
          newSingleDeviceLoading.delete(deviceId);

          const hasActiveStreams = newActiveSingleDevices.size > 0;

          return {
            singleDeviceData: newSingleDeviceData,
            activeSingleDevices: newActiveSingleDevices,
            singleDeviceLoading: newSingleDeviceLoading,
            streamingMode: hasActiveStreams ? "single" : null,
            activeDeviceId: hasActiveStreams ? state.activeDeviceId : null,
          };
        });

        const updatedState = get();
        if (updatedState.activeSingleDevices.size === 0) {
          updatedState.switchToAllDevices();
        }
      },

      clearAllSingleDeviceData: () => {
        const deviceService = DeviceService.getInstance();
        deviceService.stopAllSingleDeviceStreams();

        set({
          singleDeviceData: new Map(),
          activeSingleDevices: new Set(),
          singleDeviceLoading: new Set(),
          streamingMode: null,
          activeDeviceId: null,
        });

        const state = get();
        state.switchToAllDevices();
      },

      isDeviceStreamActive: (uniqueId: string | number) => {
        const state = get();
        return state.activeSingleDevices.has(String(uniqueId));
      },

      isDeviceLoading: (uniqueId: string | number) => {
        const state = get();
        return state.singleDeviceLoading.has(String(uniqueId));
      },

      isAllDeviceStreamingActive: () => {
        const state = get();
        return state.streamingMode === "all";
      },

      isSingleDeviceStreamingActive: () => {
        const state = get();
        return state.streamingMode === "single";
      },

      getConnectionStatus: () => {
        const state = get();
        return {
          connected: state.isConnected,
          authenticated: state.isAuthenticated,
          streamingMode: state.streamingMode,
          activeDeviceId: state.activeDeviceId,
          activeSingleDevices: Array.from(state.activeSingleDevices),
          userRole: state.userRole,
        };
      },
    }),
    {
      name: "device-store",
      partialize: (state) => ({
        filters: state.filters,
      }),
    }
  )
);

// Export selectors for performance optimization
export const useDeviceData = () => useDeviceStore((state) => state.deviceData);
export const useConnectionStatus = () =>
  useDeviceStore((state) => ({
    isConnected: state.isConnected,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    userRole: state.userRole,
  }));
export const useStreamingStatus = () =>
  useDeviceStore((state) => ({
    streamingMode: state.streamingMode,
    activeDeviceId: state.activeDeviceId,
    activeSingleDevices: Array.from(state.activeSingleDevices),
  }));
