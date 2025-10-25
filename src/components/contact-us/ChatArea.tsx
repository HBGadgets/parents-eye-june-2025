"use client";
import React, { useEffect, useRef, useState } from "react";
import { Send, Menu, Loader2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
  date: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
}

interface TypingUser {
  userId: string;
  userRole: string;
}

interface ChatAreaProps {
  messages: Message[];
  inputText: string;
  showAttachMenu: boolean;
  onInputChange: (text: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onToggleAttachMenu: () => void;
  onToggleSidebar: () => void;
  selectedContact: Contact | null;
  typingUser?: TypingUser | null; // NEW
  isLoading?: boolean; // NEW
  sendTypingIndicator: () => void;
}

const ChatArea = ({
  messages,
  inputText,
  showAttachMenu,
  onInputChange,
  onSend,
  onKeyPress,
  onToggleAttachMenu,
  onToggleSidebar,
  selectedContact,
  typingUser, // NEW
  isLoading, // NEW
  sendTypingIndicator,
}: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Debug: Log messages when they change
  useEffect(() => {
    console.log("[ChatArea] Messages updated:", messages.length, messages);
  }, [messages]);

  // Debug: Log typing user
  useEffect(() => {
    if (typingUser) {
      console.log("[ChatArea] Typing user:", typingUser);
    }
  }, [typingUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log("[ChatArea] Input changed:", value.length, "chars");

    // Update input text
    onInputChange(value);

    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Send typing indicator
    if (value.length > 0) {
      console.log("[ChatArea] Sending typing=true");
      sendTypingIndicator(true);

      // Auto-stop typing after 2 seconds
      const timeout = setTimeout(() => {
        console.log("[ChatArea] Auto-stopping typing");
        sendTypingIndicator(false);
      }, 2000);

      setTypingTimeout(timeout);
    } else {
      console.log("[ChatArea] Sending typing=false (empty input)");
      sendTypingIndicator(false);
    }
  };

  // Stop typing when unmounting
  useEffect(() => {
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
      sendTypingIndicator(false);
    };
  }, []);

  if (!selectedContact) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-lg font-semibold bg-white h-full">
        Select a contact to start chatting 💬
      </div>
    );
  }

  const PersonAvatar = ({ sender }: { sender: "user" | "bot" }) => {
    const avatarLetter =
      sender === "bot" ? selectedContact.name.charAt(0).toUpperCase() : "U";

    const isBotSender = sender === "bot";

    return (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isBotSender
            ? "bg-gradient-to-r from-orange-400 to-yellow-400"
            : "bg-green-100"
        }`}
      >
        <span
          className={`text-sm font-semibold ${
            isBotSender ? "text-white" : "text-green-600"
          }`}
        >
          {avatarLetter}
        </span>
      </div>
    );
  };

  const chatName = selectedContact.name;
  const chatAvatarLetter = selectedContact.name.charAt(0).toUpperCase();
  const isBotChat = selectedContact.id === "1";

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-200 to-orange-200 border-b border-yellow-100 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-yellow-900" />
          </button>
          <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {chatAvatarLetter}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-base truncate">
              {chatName}
            </h2>
            {/* Show typing indicator in header if active */}
            {typingUser && (
              <div className="flex justify-start px-4 py-2">
                <div className="flex items-end space-x-2">
                  <PersonAvatar sender="bot" />
                  <div className="px-4 py-3 bg-white rounded-2xl shadow border border-yellow-100">
                    <div className="flex space-x-1 items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Debug info (remove in production) */}
        <div className="text-xs text-gray-600 hidden md:block">
          {messages.length} messages
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 p-4 custom-scrollbar">
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Loading state */}
          {isLoading && messages.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-yellow-600" />
              <span className="ml-2 text-gray-600">Loading messages...</span>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <div className="text-4xl mb-2">👋</div>
              <p className="text-sm">No messages yet. Say hi!</p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="flex items-end space-x-2 max-w-[70%]">
                {msg.sender === "bot" && <PersonAvatar sender="bot" />}
                <div
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-orange-200 to-yellow-200 text-gray-900 font-medium rounded-br-sm shadow"
                        : "bg-white text-gray-800 rounded-bl-sm shadow border border-yellow-100"
                    }`}
                  >
                    <p className="text-sm break-words">{msg.text}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 px-2">
                    {msg.timestamp}
                  </span>
                </div>
                {msg.sender === "user" && <PersonAvatar sender="user" />}
              </div>
            </div>
          ))}

          {/* Typing Indicator - shown in message area */}
          {typingUser && (
            <div className="flex justify-start">
              <div className="flex items-end space-x-2 max-w-[70%]">
                <PersonAvatar sender="bot" />
                <div className="flex flex-col items-start">
                  <div className="px-4 py-3 bg-white rounded-2xl rounded-bl-sm shadow border border-yellow-100">
                    <div className="flex space-x-1 items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-yellow-100 p-4 flex-shrink-0">
        <div className="flex items-center space-x-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              console.log("[ChatArea] Input changed:", e.target.value);
              onInputChange(e.target.value);
            }}
            onKeyPress={(e) => {
              console.log("[ChatArea] Key pressed:", e.key);
              onKeyPress(e);
            }}
            placeholder="Type a message..."
            className="flex-1 bg-yellow-50 border border-yellow-100 rounded-2xl px-4 py-3 text-sm text-gray-800 placeholder-gray-500 outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
          <button
            onClick={() => {
              console.log("[ChatArea] Send clicked");
              onSend();
            }}
            disabled={!inputText.trim()}
            className="p-3 bg-gradient-to-r from-orange-300 to-yellow-300 text-white rounded-full hover:from-orange-400 hover:to-yellow-400 transition-all shadow transform hover:scale-105 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollbar Style */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #facc15;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #eab308;
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default ChatArea;
