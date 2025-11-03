// hooks/useChat.ts - USE THIS (DeviceService version)
"use client";
import { useEffect, useCallback } from "react";
import { useDeviceStore } from "@/store/deviceStore";
import { useChatStore, ChatContact } from "@/store/useChatStore";
import DeviceService from "@/services/livetrack/DeviceService"; // ✅ Use DeviceService

export const useChat = () => {
  const service = DeviceService.getInstance();

  const isConnected = useDeviceStore((state) => state.isConnected);
  const isAuthenticated = useDeviceStore((state) => state.isAuthenticated);

  // ✅ Subscribe directly to reactive state
  const contacts = useChatStore((state) => state.contacts);
  const activeContact = useChatStore((state) => state.activeContact);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const messagesByChat = useChatStore((state) => state.messagesByChat);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const isLoading = useChatStore((state) => state.isLoading);
  const error = useChatStore((state) => state.error);
  const currentUserId = useChatStore((state) => state.currentUserId);

  // Actions
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const setLoading = useChatStore((state) => state.setLoading);
  const setError = useChatStore((state) => state.setError);
  const clearChat = useChatStore((state) => state.clearChat);
  const resetUnreadCount = useChatStore((state) => state.resetUnreadCount);

  // ✅ Get messages directly (reactive)
  const activeMessages = activeChatId ? messagesByChat[activeChatId] || [] : [];

  // ✅ Get typing user directly (reactive)
  const typingUser = activeChatId ? typingUsers[activeChatId] || null : null;

  // Calculate totals
  const totalUnreadCount = contacts.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0
  );

  const sortedContacts = [...contacts].sort((a, b) => {
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return timeB - timeA;
  });

  // Auto-fetch contacts when authenticated
  useEffect(() => {
    if (isAuthenticated && isConnected && contacts.length === 0) {
      console.log("[useChat] Auto-fetching chat list");
      setLoading(true);
      service.fetchChatList();
    }
  }, [isAuthenticated, isConnected]);

  // Actions
  const fetchChatList = useCallback(() => {
    if (!isConnected || !isAuthenticated) {
      setError("Cannot fetch chat list: Not connected or authenticated");
      return;
    }
    setLoading(true);
    service.fetchChatList();
  }, [isConnected, isAuthenticated, service]);

  const joinChat = useCallback(
    (contact: ChatContact) => {
      if (!isConnected || !isAuthenticated) {
        setError("Cannot join chat: Not connected or authenticated");
        return;
      }

      if (!contact._id || !contact.role) {
        setError("Invalid contact information");
        return;
      }

      console.log("[useChat] Joining chat:", contact.name, contact._id);
      setLoading(true);
      setActiveChat(contact);
      service.joinChatWithContact(contact._id, contact.role);

      if (contact.chatId) {
        resetUnreadCount(contact.chatId);
      }
    },
    [
      isConnected,
      isAuthenticated,
      service,
      setActiveChat,
      setLoading,
      setError,
      resetUnreadCount,
    ]
  );

  const sendMessage = useCallback(
    (text: string, media?: { url?: string; type?: string }) => {
      if (!activeContact) {
        console.error("[useChat] No active contact");
        setError("No active chat");
        return;
      }

      if (!text.trim() && !media) {
        console.error("[useChat] Empty message");
        return;
      }

      console.log("[useChat] Sending message:", text.substring(0, 50));
      service.sendMessageToContact(
        activeContact._id,
        activeContact.role,
        text,
        media
      );
    },
    [activeContact, service]
  );

  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      if (!activeContact) return;
      service.emitTyping(activeContact._id, activeContact.role, isTyping);
    },
    [activeContact, service]
  );

  const markAsRead = useCallback(
    (messageIds: string[]) => {
      if (!activeChatId) return;
      service.markMessagesAsRead(activeChatId, messageIds);
    },
    [activeChatId, service]
  );

  return {
    contacts: sortedContacts,
    activeContact,
    activeMessages, // ✅ Reactive!
    activeChatId,
    isConnected,
    isAuthenticated,
    isLoading,
    error,
    typingUser, // ✅ Reactive!
    totalUnreadCount,
    currentUserId,
    fetchChatList,
    joinChat,
    leaveChat: clearChat,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    clearError: () => setError(null),
    refreshChatList: fetchChatList,
  };
};
