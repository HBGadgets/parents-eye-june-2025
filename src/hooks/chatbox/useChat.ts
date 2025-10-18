// hooks/useChat.ts
"use client";
import { useEffect, useCallback, useMemo } from "react";
import { useDeviceStore } from "@/store/deviceStore";
import { useChatStore, ChatContact } from "@/store/useChatStore";
import DeviceService from "@/services/livetrack/DeviceService";

export const useChat = () => {
  const service = DeviceService.getInstance();

  // Subscribe to device store
  const isConnected = useDeviceStore((state) => state.isConnected);
  const isAuthenticated = useDeviceStore((state) => state.isAuthenticated);

  // Subscribe to chat store with granular selectors for performance
  const contacts = useChatStore((state) => state.contacts);
  const activeContact = useChatStore((state) => state.activeContact);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const isLoading = useChatStore((state) => state.isLoading);
  const error = useChatStore((state) => state.error);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const currentUserId = useChatStore((state) => state.currentUserId);

  // Actions
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const setLoading = useChatStore((state) => state.setLoading);
  const setError = useChatStore((state) => state.setError);
  const clearChat = useChatStore((state) => state.clearChat);
  const getCurrentMessages = useChatStore((state) => state.getCurrentMessages);
  const getUnreadCountForContact = useChatStore(
    (state) => state.getUnreadCountForContact
  );
  const isUserTypingInChat = useChatStore((state) => state.isUserTypingInChat);
  const resetUnreadCount = useChatStore((state) => state.resetUnreadCount);

  // ========== AUTO-FETCH CHAT LIST ==========

  // Fetch contact list when authenticated
  useEffect(() => {
    if (isAuthenticated && isConnected && contacts.length === 0) {
      console.log("[useChat] Fetching chat list");
      setLoading(true);
      service.fetchChatList();
    }
  }, [isAuthenticated, isConnected]);

  // ========== COMPUTED VALUES ==========

  // Get messages for active chat
  const activeMessages = useMemo(() => {
    return getCurrentMessages();
  }, [getCurrentMessages, activeChatId]); // Re-compute when active chat changes

  // Get typing indicator for active chat
  const typingUser = useMemo(() => {
    if (!activeChatId) return null;
    return isUserTypingInChat(activeChatId);
  }, [activeChatId, typingUsers]);

  // Calculate total unread count
  const totalUnreadCount = useMemo(() => {
    return contacts.reduce((sum, contact) => {
      return sum + (contact.unreadCount || 0);
    }, 0);
  }, [contacts]);

  // Sort contacts by last message time (most recent first)
  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const timeA = a.lastMessageTime
        ? new Date(a.lastMessageTime).getTime()
        : 0;
      const timeB = b.lastMessageTime
        ? new Date(b.lastMessageTime).getTime()
        : 0;
      return timeB - timeA;
    });
  }, [contacts]);

  // ========== ACTIONS ==========

  /**
   * Fetch the list of chat contacts
   */
  const fetchChatList = useCallback(() => {
    if (!isConnected || !isAuthenticated) {
      setError("Cannot fetch chat list: Not connected or authenticated");
      return;
    }
    setLoading(true);
    service.fetchChatList();
  }, [isConnected, isAuthenticated, service]);

  /**
   * Join a chat with a contact
   */
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

      console.log("[useChat] Joining chat with:", contact.name);
      setLoading(true);
      setActiveChat(contact); // Set active in store
      service.joinChatWithContact(contact._id, contact.role);

      // Reset unread count when opening chat
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

  /**
   * Leave the current chat
   */
  const leaveChat = useCallback(() => {
    console.log("[useChat] Leaving chat");
    service.leaveChat();
    clearChat();
  }, [service, clearChat]);

  /**
   * Send a message to the active contact
   */
  const sendMessage = useCallback(
    (text: string, media?: { url?: string; type?: string }) => {
      if (!activeContact) {
        console.error("[useChat] No active contact selected");
        setError("No active chat");
        return;
      }

      if (!text.trim() && !media) {
        console.error("[useChat] Cannot send empty message");
        return;
      }

      console.log("[useChat] Sending message to:", activeContact.name);
      service.sendMessageToContact(
        activeContact._id,
        activeContact.role,
        text,
        media
      );
    },
    [activeContact, service]
  );

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      if (!activeContact) return;

      service.emitTyping(activeContact._id, activeContact.role, isTyping);
    },
    [activeContact, service]
  );

  /**
   * Mark messages as read
   */
  const markAsRead = useCallback(
    (messageIds: string[]) => {
      if (!activeChatId) return;

      service.markMessagesAsRead(activeChatId, messageIds);
    },
    [activeChatId, service]
  );

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  /**
   * Refresh chat list
   */
  const refreshChatList = useCallback(() => {
    fetchChatList();
  }, [fetchChatList]);

  // ========== RETURN API ==========

  return {
    // State
    contacts: sortedContacts,
    activeContact,
    activeMessages,
    activeChatId,
    isConnected,
    isAuthenticated,
    isLoading,
    error,
    typingUser,
    totalUnreadCount,
    currentUserId,

    // Actions
    fetchChatList,
    joinChat,
    leaveChat,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    clearError,
    refreshChatList,

    // Helpers
    getUnreadCount: getUnreadCountForContact,
    isTyping: (chatId: string) => isUserTypingInChat(chatId),
  };
};
