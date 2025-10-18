"use client";
import React, { useState, useEffect, useCallback } from "react";
import LeftSidebar from "@/components/contact-us/LeftSidebar";
import ChatArea from "@/components/contact-us/ChatArea";
import RightPanel from "@/components/contact-us/RightPanel";
import { useLiveDeviceData } from "@/hooks/livetrack/useLiveDeviceData";
import { useChat } from "@/hooks/chatbox/useChat";
// import { useChat } from "@/hooks/useChat";
// import { useLiveDeviceData } from "@/hooks/useLiveDeviceData";

// Map backend ChatContact to UI Contact shape
interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
  _id: string; // Preserve for backend calls
  role: string; // Preserve for backend calls
}

// Map backend ChatMessage to UI Message shape
interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
  date: string;
}

interface ChatHistory {
  date: string;
  messages: number;
}

const EyeCareBot = () => {
  // Connect socket and auto-authenticate (reuses device connection)
  useLiveDeviceData();

  // Get chat state and actions
  const {
    contacts: backendContacts,
    activeContact,
    activeMessages,
    typingUser,
    totalUnreadCount,
    isLoading,
    isAuthenticated,
    currentUserId,
    joinChat,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
  } = useChat();

  // Local UI state
  const [inputText, setInputText] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(
    null
  );
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // ========== MAP BACKEND DATA TO UI FORMAT ==========

  // Map backend contacts to UI format
  const contacts: Contact[] = backendContacts.map((c) => ({
    id: c._id,
    name: c.name,
    phone: c.mobileNo || c.email || "",
    lastMessage: c.lastMessage || "",
    time: c.lastMessageTime
      ? new Date(c.lastMessageTime).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "",
    unread: (c.unreadCount || 0) > 0,
    _id: c._id, // Preserve for backend
    role: c.role, // Preserve for backend
  }));

  // Map backend messages to UI format
  const messages: Message[] = activeMessages.map((msg) => ({
    id: msg._id,
    text: msg.text,
    sender: msg.sender.userId === currentUserId ? "user" : "bot",
    timestamp: new Date(msg.createdAt).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    date: new Date(msg.createdAt).toLocaleDateString("en-US"),
  }));

  // Map active contact to UI format
  const selectedContact: Contact | null = activeContact
    ? {
        id: activeContact._id,
        name: activeContact.name,
        phone: activeContact.mobileNo || activeContact.email || "",
        lastMessage: activeContact.lastMessage || "",
        time: activeContact.lastMessageTime
          ? new Date(activeContact.lastMessageTime).toLocaleTimeString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }
            )
          : "",
        unread: (activeContact.unreadCount || 0) > 0,
        _id: activeContact._id,
        role: activeContact.role,
      }
    : null;

  // Generate chat history from messages
  const chatHistory: ChatHistory[] = React.useMemo(() => {
    const historyMap = new Map<string, number>();
    messages.forEach((msg) => {
      const count = historyMap.get(msg.date) || 0;
      historyMap.set(msg.date, count + 1);
    });

    return Array.from(historyMap.entries()).map(([date, count]) => ({
      date,
      messages: count,
    }));
  }, [messages]);

  // ========== EVENT HANDLERS ==========

  const handleSelectContact = useCallback(
    (contact: Contact) => {
      // Find original backend contact
      const backendContact = backendContacts.find((c) => c._id === contact.id);

      if (backendContact) {
        joinChat(backendContact);
      }

      setInputText("");
      setShowAttachMenu(false);
      setSelectedHistoryDate(null);
    },
    [backendContacts, joinChat]
  );

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim() || !activeContact) return;

    sendMessage(inputText);
    setInputText("");
    setShowAttachMenu(false);

    // Stop typing indicator
    if (typingTimeout) clearTimeout(typingTimeout);
    sendTypingIndicator(false);
  }, [
    inputText,
    activeContact,
    sendMessage,
    typingTimeout,
    sendTypingIndicator,
  ]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputText(value);

      // Clear previous typing timeout
      if (typingTimeout) clearTimeout(typingTimeout);

      // Send typing indicator
      if (value.length > 0) {
        sendTypingIndicator(true);

        // Auto-stop typing after 2 seconds of inactivity
        const timeout = setTimeout(() => {
          sendTypingIndicator(false);
        }, 2000);

        setTypingTimeout(timeout);
      } else {
        sendTypingIndicator(false);
      }
    },
    [typingTimeout, sendTypingIndicator]
  );

  // ========== MARK MESSAGES AS READ ==========

  // Mark messages as read when viewing active chat
  useEffect(() => {
    if (activeMessages.length > 0 && currentUserId) {
      // Find unread messages
      const unreadMessages = activeMessages
        .filter(
          (msg) =>
            msg.sender.userId !== currentUserId &&
            (!msg.readBy || !msg.readBy.includes(currentUserId))
        )
        .map((msg) => msg._id);

      if (unreadMessages.length > 0) {
        // Mark as read after a short delay (user has seen them)
        const timer = setTimeout(() => {
          markAsRead(unreadMessages);
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [activeMessages, currentUserId, markAsRead]);

  // ========== FILTER MESSAGES BY DATE ==========

  const displayedMessages = selectedHistoryDate
    ? messages.filter((m) => m.date === selectedHistoryDate)
    : messages;

  // ========== LOADING STATE ==========

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to chat server...</p>
        </div>
      </div>
    );
  }

  // ========== RENDER ==========

  return (
    <div className="flex w-full bg-white font-sans overflow-hidden absolute top-16 bottom-0 left-0 right-0">
      <div className="flex w-full h-full">
        <LeftSidebar
          showSidebar={showSidebar}
          contacts={contacts}
          selectedContact={selectedContact}
          onSelectContact={handleSelectContact}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          totalUnreadCount={totalUnreadCount}
          isLoading={isLoading}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <ChatArea
            messages={displayedMessages}
            inputText={inputText}
            showAttachMenu={showAttachMenu}
            onInputChange={handleInputChange}
            onSend={handleSendMessage}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            onToggleAttachMenu={() => setShowAttachMenu(!showAttachMenu)}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            selectedContact={selectedContact}
            typingUser={typingUser}
            isLoading={isLoading}
          />
        </div>

        <RightPanel
          showRightPanel={showRightPanel}
          chatHistory={chatHistory}
          selectedContact={selectedContact}
          onSelectHistory={(date) => setSelectedHistoryDate(date)}
          onTogglePanel={() => setShowRightPanel(!showRightPanel)}
        />
      </div>
    </div>
  );
};

export default EyeCareBot;
