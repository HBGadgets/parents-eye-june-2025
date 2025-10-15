// stores/useChatStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import DeviceService, {
  Chat,
  Message,
} from "@/services/livetrack/DeviceService";

interface ChatState {
  // Data
  chats: Chat[];
  messagesByChat: Map<string, Message[]>;
  activeChatId: string | null;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => void;
  fetchChatList: () => void;
  joinChat: (chatId: string) => void;
  leaveChat: () => void;
  sendMessage: (chatId: string, text: string) => void;
  clearError: () => void;

  // Getters
  getChatMessages: (chatId: string) => Message[];
  getActiveChat: () => Chat | null;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      chats: [],
      messagesByChat: new Map(),
      activeChatId: null,
      isLoading: false,
      error: null,

      // Actions
      initialize: () => {
        const deviceService = DeviceService.getInstance();

        // Chat event handlers are already registered in DeviceService
        // We just need to fetch the chat list
        if (deviceService.authenticated) {
          deviceService.fetchChatList();
        }
      },

      fetchChatList: () => {
        const deviceService = DeviceService.getInstance();
        if (deviceService.authenticated) {
          set({ isLoading: true });
          deviceService.fetchChatList();
        }
      },

      joinChat: (chatId: string) => {
        const deviceService = DeviceService.getInstance();

        if (!deviceService.authenticated || !deviceService.connected) {
          set({ error: "Cannot join chat: Not connected or authenticated" });
          return;
        }

        if (!chatId?.trim()) {
          set({ error: "Chat ID is required" });
          return;
        }

        console.log("[ChatStore] Joining chat:", chatId);

        set({
          activeChatId: chatId,
          isLoading: true,
          error: null,
        });

        deviceService.joinChat(chatId);
      },

      leaveChat: () => {
        const state = get();
        if (!state.activeChatId) return;

        console.log("[ChatStore] Leaving chat:", state.activeChatId);

        const deviceService = DeviceService.getInstance();
        deviceService.leaveChat();

        set({ activeChatId: null });
      },

      sendMessage: (chatId: string, text: string) => {
        const deviceService = DeviceService.getInstance();

        if (!deviceService.authenticated || !deviceService.connected) {
          set({ error: "Cannot send message: Not connected" });
          return;
        }

        if (!text?.trim()) {
          set({ error: "Message cannot be empty" });
          return;
        }

        console.log("[ChatStore] Sending message to chat:", chatId);
        deviceService.sendMessage(chatId, text);
      },

      clearError: () => {
        set({ error: null });
      },

      // Getters
      getChatMessages: (chatId: string) => {
        const state = get();
        return state.messagesByChat.get(chatId) || [];
      },

      getActiveChat: () => {
        const state = get();
        if (!state.activeChatId) return null;
        return (
          state.chats.find((chat) => chat._id === state.activeChatId) || null
        );
      },
    }),
    {
      name: "chat-store",
    }
  )
);
