'use client';
import React, { useEffect, useRef } from 'react';
import { Send, Menu } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
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
}: {
  messages: Message[];
  inputText: string;
  showAttachMenu: boolean;
  onInputChange: (text: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onToggleAttachMenu: () => void;
  onToggleSidebar: () => void;
  selectedContact: Contact | null; 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  if (!selectedContact) {
      return (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-lg font-semibold bg-white h-full">
              Select a contact to start chatting 💬
          </div>
      );
  }

  const PersonAvatar = ({ sender }: { sender: 'user' | 'bot' }) => {
    const avatarLetter = sender === 'bot' 
        ? selectedContact.name.charAt(0).toUpperCase() 
        : 'U';

    const isBotSender = sender === 'bot';

    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isBotSender 
                ? 'bg-gradient-to-r from-orange-400 to-yellow-400' 
                : 'bg-green-100'
        }`}>
            <span className={`text-sm font-semibold ${
                isBotSender ? 'text-white' : 'text-green-600'
            }`}>
                {avatarLetter}
            </span>
        </div>
    );
  };
  
  const chatName = selectedContact.name;
  const chatAvatarLetter = selectedContact.name.charAt(0).toUpperCase();
  const isBotChat = selectedContact.id === '1';

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
            <span className="text-white font-bold text-sm">{chatAvatarLetter}</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-base truncate">{chatName}</h2>
            {isBotChat ? (
              <p className="text-xs text-green-700 font-semibold">● Online</p>
            ) : (
              <p className="text-xs text-gray-500 truncate">{selectedContact.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 p-4 custom-scrollbar">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="flex items-end space-x-2 max-w-[70%]">
                {msg.sender === 'bot' && <PersonAvatar sender='bot' />}
                <div
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-orange-200 to-yellow-200 text-gray-900 font-medium rounded-br-sm shadow'
                        : 'bg-white text-gray-800 rounded-bl-sm shadow border border-yellow-100'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.text}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 px-2">
                    {msg.timestamp}
                  </span>
                </div>
                {msg.sender === 'user' && <PersonAvatar sender='user' />}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-yellow-100 p-4 flex-shrink-0">
        <div className="flex items-center space-x-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-yellow-50 border border-yellow-100 rounded-2xl px-4 py-3 text-sm text-gray-800 placeholder-gray-500 outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
          <button
            onClick={onSend}
            className="p-3 bg-gradient-to-r from-orange-300 to-yellow-300 text-white rounded-full hover:from-orange-400 hover:to-yellow-400 transition-all shadow transform hover:scale-105 flex-shrink-0"
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
      `}</style>
    </div>
  );
};

export default ChatArea;