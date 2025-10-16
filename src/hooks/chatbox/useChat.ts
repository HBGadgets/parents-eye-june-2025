// hooks/useChat.ts
import { useDeviceStore } from "@/store/deviceStore";
import { useChatStore } from "@/store/useChatStore";
import { useEffect, useCallback, useMemo } from "react";

export const useChat = () => {
  const deviceStore = useDeviceStore();
  const chatStore = useChatStore();

  // Initialize chat when device service is authenticated
  useEffect(() => {
    if (deviceStore.isAuthenticated && !chatStore.chats.length) {
      chatStore.initialize();
    }
  }, [deviceStore.isAuthenticated]);

  // Get messages for active chat
  const activeMessages = useMemo(() => {
    if (!chatStore.activeChatId) return [];
    return chatStore.getChatMessages(chatStore.activeChatId);
  }, [chatStore.activeChatId, chatStore.messagesByChat]);

  // Get active chat details
  const activeChat = useMemo(() => {
    return chatStore.getActiveChat();
  }, [chatStore.activeChatId, chatStore.chats]);

  // Send message helper
  const handleSendMessage = useCallback(
    (text: string) => {
      if (!chatStore.activeChatId) {
        console.error("No active chat selected");
        return;
      }
      chatStore.sendMessage(chatStore.activeChatId, text);
    },
    [chatStore.activeChatId, chatStore.sendMessage]
  );

  return {
    // State
    chats: chatStore.chats,
    activeChat,
    activeMessages,
    activeChatId: chatStore.activeChatId,
    isConnected: deviceStore.isConnected,
    isAuthenticated: deviceStore.isAuthenticated,
    isLoading: chatStore.isLoading,
    error: chatStore.error,

    // Actions
    fetchChatList: chatStore.fetchChatList,
    joinChat: chatStore.joinChat,
    leaveChat: chatStore.leaveChat,
    sendMessage: handleSendMessage,
    clearError: chatStore.clearError,
  };
};
