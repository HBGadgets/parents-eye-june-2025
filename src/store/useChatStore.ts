// store/useChatStore.ts - FULLY OPTIMIZED FOR REACTIVITY
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { produce } from "immer";

export interface ChatContact {
  _id: string;
  role: string;
  name: string;
  email?: string | null;
  mobileNo?: string | null;
  lastMessage?: string;
  lastMessageTime?: string | null;
  chatId?: string;
  unreadCount?: number;
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
  status?: string;
  createdAt: string;
}

export interface TypingUser {
  userId: string;
  userRole: string;
  timestamp: number;
}

interface ChatState {
  contacts: ChatContact[];
  messagesByChat: Record<string, ChatMessage[]>;
  activeChatId: string | null;
  activeContact: ChatContact | null;
  isLoading: boolean;
  error: string | null;
  typingUsers: Record<string, TypingUser>;
  onlineUsers: Set<string>;
  currentUserId: string | null;

  setContacts: (contacts: ChatContact[]) => void;
  updateContactLastMessage: (
    chatId: string,
    message: string,
    timestamp: string
  ) => void;
  incrementUnreadCount: (chatId: string) => void;
  resetUnreadCount: (chatId: string) => void;
  setActiveChat: (contact: ChatContact | null) => void;
  setChatHistory: (chatId: string, messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessageDelivery: (messageId: string, deliveredTo: string[]) => void;
  updateMessageReadStatus: (messageIds: string[], readBy: string) => void;
  setUserTyping: (
    chatId: string,
    userId: string,
    userRole: string,
    isTyping: boolean
  ) => void;
  clearTypingIndicator: (chatId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentUserId: (userId: string) => void;
  clearChat: () => void;
  clearAllMessages: () => void;
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

          const chatId = contact.chatId || null;

          console.log("[ChatStore] setActiveChat:", {
            contactName: contact.name,
            contactUserId: contact._id,
            chatId: chatId,
          });

          if (!chatId) {
            console.error(
              "[ChatStore] ❌ CRITICAL: Contact has no chatId!",
              contact
            );
            set(
              { activeChatId: null, activeContact: contact },
              false,
              "setActiveChat"
            );
            return;
          }

          set(
            produce((state: ChatState) => {
              state.activeChatId = chatId;
              state.activeContact = contact;

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

        // ========== MESSAGE ACTIONS (OPTIMIZED FOR REACTIVITY) ==========

        setChatHistory: (chatId, messages) => {
          console.log("[ChatStore] setChatHistory:", {
            chatId,
            messageCount: messages.length,
          });

          const { messagesByChat } = get();

          // ✅ Create new object reference using spread
          set(
            {
              messagesByChat: {
                ...messagesByChat,
                [chatId]: messages, // New array reference
              },
            },
            false,
            "setChatHistory"
          );

          console.log("[ChatStore] ✅ Stored messages:", {
            chatId,
            count: messages.length,
          });
        },

        addMessage: (message) => {
          const { activeChatId, currentUserId, messagesByChat, contacts } =
            get();

          // Get existing messages or empty array
          const existingMessages = messagesByChat[message.chatId] || [];

          // Check for duplicate
          const exists = existingMessages.some((m) => m._id === message._id);
          if (exists) {
            console.log("[ChatStore] Message already exists:", message._id);
            return;
          }

          // Create new messages array
          const newMessages = [...existingMessages, message];

          console.log("[ChatStore] ✅ Adding message:", {
            chatId: message.chatId,
            messageId: message._id,
            text: message.text.substring(0, 30),
            totalNow: newMessages.length,
          });

          // ✅ Update messagesByChat with new reference (triggers re-render!)
          set(
            {
              messagesByChat: {
                ...messagesByChat,
                [message.chatId]: newMessages,
              },
            },
            false,
            "addMessage"
          );

          // Update contact
          set(
            produce((state: ChatState) => {
              const contact = state.contacts.find(
                (c) => c.chatId === message.chatId
              );
              if (contact) {
                contact.lastMessage = message.text;
                contact.lastMessageTime = message.createdAt;

                if (
                  message.chatId !== activeChatId &&
                  message.sender.userId !== currentUserId
                ) {
                  contact.unreadCount = (contact.unreadCount || 0) + 1;
                }
              }
            }),
            false,
            "addMessage-updateContact"
          );
        },

        updateMessageDelivery: (messageId, deliveredTo) => {
          set(
            produce((state: ChatState) => {
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

        // ========== TYPING ACTIONS (OPTIMIZED FOR REACTIVITY) ==========

        setUserTyping: (chatId, userId, userRole, isTyping) => {
          const { typingUsers } = get();

          // ✅ Create new typingUsers object with new reference
          const newTypingUsers = { ...typingUsers };

          if (isTyping) {
            newTypingUsers[chatId] = {
              userId,
              userRole,
              timestamp: Date.now(),
            };
            console.log(
              "[ChatStore] 👤 User typing:",
              userId,
              "in chat:",
              chatId
            );
          } else {
            delete newTypingUsers[chatId];
            console.log("[ChatStore] 🛑 User stopped typing:", userId);
          }

          // ✅ Set with new reference (triggers re-render!)
          set({ typingUsers: newTypingUsers }, false, "setUserTyping");

          // Auto-clear after 3 seconds
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
          const { typingUsers } = get();
          const newTypingUsers = { ...typingUsers };
          delete newTypingUsers[chatId];

          // ✅ Set with new reference
          set({ typingUsers: newTypingUsers }, false, "clearTypingIndicator");
        },

        // ========== UI ACTIONS ==========

        setLoading: (isLoading) => {
          set({ isLoading }, false, "setLoading");
        },

        setError: (error) => {
          set({ error }, false, "setError");
        },

        setCurrentUserId: (userId) => {
          console.log("[ChatStore] Setting currentUserId:", userId);
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
          const messages = activeChatId
            ? messagesByChat[activeChatId] || []
            : [];

          console.log("[ChatStore] getCurrentMessages:", {
            activeChatId,
            messageCount: messages.length,
          });

          return messages;
        },

        getUnreadCountForContact: (chatId) => {
          const { contacts } = get();
          const contact = contacts.find((c) => c.chatId === chatId);
          return contact?.unreadCount || 0;
        },

        isUserTypingInChat: (chatId) => {
          const { typingUsers, currentUserId } = get();
          const typingUser = typingUsers[chatId];
          return typingUser && typingUser.userId !== currentUserId
            ? typingUser
            : null;
        },
      }),
      {
        name: "chat-storage",
        partialize: (state) => ({
          currentUserId: state.currentUserId,
          // Don't persist messages or contacts - they're fetched on connect
        }),
      }
    ),
    { name: "ChatStore" }
  )
);
