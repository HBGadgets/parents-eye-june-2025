// store/useChatStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { produce } from "immer";

export interface ChatContact {
  _id: string; // other user's userId
  role: string; // "school" | "branch" | "parent" | "branchgroup" | "superAdmin"
  name: string;
  email?: string | null;
  mobileNo?: string | null;
  lastMessage?: string;
  lastMessageTime?: string | null;
  chatId?: string; // server includes this
  unreadCount?: number; // track unread messages
}

export interface ChatMessage {
  _id: string;
  chatId: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: string;
  sender: { userId: string; userModel: string };
  deliveredTo?: string[];
  readBy?: string[];
  createdAt: string;
}

export interface TypingUser {
  userId: string;
  userRole: string;
  timestamp: number;
}

interface ChatState {
  // Data
  contacts: ChatContact[];
  messagesByChat: Record<string, ChatMessage[]>; // Changed from Map for persistence
  activeChatId: string | null;
  activeContact: ChatContact | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Real-time indicators
  typingUsers: Record<string, TypingUser>; // chatId -> typing user
  onlineUsers: Set<string>; // userId set

  // User context (set after auth)
  currentUserId: string | null;

  // Actions - Contacts
  setContacts: (contacts: ChatContact[]) => void;
  updateContactLastMessage: (
    chatId: string,
    message: string,
    timestamp: string
  ) => void;
  incrementUnreadCount: (chatId: string) => void;
  resetUnreadCount: (chatId: string) => void;

  // Actions - Active chat
  setActiveChat: (contact: ChatContact | null) => void;

  // Actions - Messages
  setChatHistory: (chatId: string, messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessageDelivery: (messageId: string, deliveredTo: string[]) => void;
  updateMessageReadStatus: (messageIds: string[], readBy: string) => void;

  // Actions - Typing
  setUserTyping: (
    chatId: string,
    userId: string,
    userRole: string,
    isTyping: boolean
  ) => void;
  clearTypingIndicator: (chatId: string) => void;

  // Actions - UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentUserId: (userId: string) => void;

  // Actions - Cleanup
  clearChat: () => void;
  clearAllMessages: () => void;

  // Getters
  getCurrentMessages: () => ChatMessage[];
  getUnreadCountForContact: (chatId: string) => number;
  isUserTypingInChat: (chatId: string) => TypingUser | null;
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        contacts: [],
        messagesByChat: {},
        activeChatId: null,
        activeContact: null,
        isLoading: false,
        error: null,
        typingUsers: {},
        onlineUsers: new Set(),
        currentUserId: null,

        // ========== CONTACT ACTIONS ==========

        setContacts: (contacts) => {
          set({ contacts }, false, "setContacts");
        },

        updateContactLastMessage: (chatId, message, timestamp) => {
          set(
            produce((state: ChatState) => {
              const contact = state.contacts.find((c) => c.chatId === chatId);
              if (contact) {
                contact.lastMessage = message;
                contact.lastMessageTime = timestamp;
              }
            }),
            false,
            "updateContactLastMessage"
          );
        },

        incrementUnreadCount: (chatId) => {
          set(
            produce((state: ChatState) => {
              const contact = state.contacts.find((c) => c.chatId === chatId);
              if (contact) {
                contact.unreadCount = (contact.unreadCount || 0) + 1;
              }
            }),
            false,
            "incrementUnreadCount"
          );
        },

        resetUnreadCount: (chatId) => {
          set(
            produce((state: ChatState) => {
              const contact = state.contacts.find((c) => c.chatId === chatId);
              if (contact) {
                contact.unreadCount = 0;
              }
            }),
            false,
            "resetUnreadCount"
          );
        },

        // ========== ACTIVE CHAT ACTIONS ==========

        setActiveChat: (contact) => {
          if (!contact) {
            set(
              { activeChatId: null, activeContact: null },
              false,
              "clearActiveChat"
            );
            return;
          }

          // Reset unread count when opening chat
          const chatId = contact.chatId || contact._id;

          set(
            produce((state: ChatState) => {
              state.activeChatId = chatId;
              state.activeContact = contact;

              // Reset unread count for this contact
              const existingContact = state.contacts.find(
                (c) => c.chatId === chatId
              );
              if (existingContact) {
                existingContact.unreadCount = 0;
              }
            }),
            false,
            "setActiveChat"
          );
        },

        // ========== MESSAGE ACTIONS ==========

        setChatHistory: (chatId, messages) => {
          set(
            produce((state: ChatState) => {
              state.messagesByChat[chatId] = messages;
            }),
            false,
            "setChatHistory"
          );
        },

        addMessage: (message) => {
          const { activeChatId, currentUserId } = get();

          set(
            produce((state: ChatState) => {
              // Add message to messages list
              if (!state.messagesByChat[message.chatId]) {
                state.messagesByChat[message.chatId] = [];
              }

              // Prevent duplicates
              const exists = state.messagesByChat[message.chatId].some(
                (m) => m._id === message._id
              );
              if (!exists) {
                state.messagesByChat[message.chatId].push(message);
              }

              // Update contact last message
              const contact = state.contacts.find(
                (c) => c.chatId === message.chatId
              );
              if (contact) {
                contact.lastMessage = message.text;
                contact.lastMessageTime = message.createdAt;

                // Increment unread count if chat is not active and message is not from current user
                if (
                  message.chatId !== activeChatId &&
                  message.sender.userId !== currentUserId
                ) {
                  contact.unreadCount = (contact.unreadCount || 0) + 1;
                }
              }
            }),
            false,
            "addMessage"
          );
        },

        updateMessageDelivery: (messageId, deliveredTo) => {
          set(
            produce((state: ChatState) => {
              // Find message across all chats and update deliveredTo
              Object.values(state.messagesByChat).forEach((messages) => {
                const message = messages.find((m) => m._id === messageId);
                if (message) {
                  message.deliveredTo = deliveredTo;
                }
              });
            }),
            false,
            "updateMessageDelivery"
          );
        },

        updateMessageReadStatus: (messageIds, readBy) => {
          set(
            produce((state: ChatState) => {
              // Update readBy for multiple messages
              Object.values(state.messagesByChat).forEach((messages) => {
                messages.forEach((message) => {
                  if (messageIds.includes(message._id)) {
                    if (!message.readBy) message.readBy = [];
                    if (!message.readBy.includes(readBy)) {
                      message.readBy.push(readBy);
                    }
                  }
                });
              });
            }),
            false,
            "updateMessageReadStatus"
          );
        },

        // ========== TYPING ACTIONS ==========

        setUserTyping: (chatId, userId, userRole, isTyping) => {
          set(
            produce((state: ChatState) => {
              if (isTyping) {
                state.typingUsers[chatId] = {
                  userId,
                  userRole,
                  timestamp: Date.now(),
                };
              } else {
                delete state.typingUsers[chatId];
              }
            }),
            false,
            "setUserTyping"
          );

          // Auto-clear typing indicator after 3 seconds
          if (isTyping) {
            setTimeout(() => {
              const current = get().typingUsers[chatId];
              if (current && current.userId === userId) {
                get().clearTypingIndicator(chatId);
              }
            }, 3000);
          }
        },

        clearTypingIndicator: (chatId) => {
          set(
            produce((state: ChatState) => {
              delete state.typingUsers[chatId];
            }),
            false,
            "clearTypingIndicator"
          );
        },

        // ========== UI ACTIONS ==========

        setLoading: (isLoading) => {
          set({ isLoading }, false, "setLoading");
        },

        setError: (error) => {
          set({ error }, false, "setError");
        },

        setCurrentUserId: (userId) => {
          set({ currentUserId: userId }, false, "setCurrentUserId");
        },

        // ========== CLEANUP ACTIONS ==========

        clearChat: () => {
          set(
            {
              activeChatId: null,
              activeContact: null,
            },
            false,
            "clearChat"
          );
        },

        clearAllMessages: () => {
          set(
            {
              messagesByChat: {},
              contacts: [],
              activeChatId: null,
              activeContact: null,
              typingUsers: {},
            },
            false,
            "clearAllMessages"
          );
        },

        // ========== GETTERS ==========

        getCurrentMessages: () => {
          const { activeChatId, messagesByChat } = get();
          return activeChatId ? messagesByChat[activeChatId] || [] : [];
        },

        getUnreadCountForContact: (chatId) => {
          const { contacts } = get();
          const contact = contacts.find((c) => c.chatId === chatId);
          return contact?.unreadCount || 0;
        },

        isUserTypingInChat: (chatId) => {
          const { typingUsers, currentUserId } = get();
          const typingUser = typingUsers[chatId];
          // Don't show typing indicator for current user
          return typingUser && typingUser.userId !== currentUserId
            ? typingUser
            : null;
        },
      }),
      {
        name: "chat-storage", // localStorage key
        partialize: (state) => ({
          // Only persist contacts and messages, not UI state
          contacts: state.contacts,
          messagesByChat: state.messagesByChat,
          currentUserId: state.currentUserId,
        }),
      }
    ),
    { name: "ChatStore" }
  )
);
