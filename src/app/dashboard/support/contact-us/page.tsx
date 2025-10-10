'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Search, Paperclip, Menu, File, Image } from 'lucide-react';

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

interface ChatHistory {
  date: string;
  messages: number;
}

const EyeLogo = () => (
  <div className="relative w-10 h-10 flex items-center justify-center">
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-200 via-orange-200 to-yellow-300 animate-pulse"></div>
    <div className="absolute inset-1 rounded-full bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200"></div>
    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-green-200 via-cyan-200 to-blue-200"></div>
    <div className="absolute inset-3 rounded-full bg-black"></div>
    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-yellow-100 to-orange-200"></div>
  </div>
);

const EyeCareBot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! Welcome to ParentEye Assistant. How can I help you today?',
      sender: 'bot',
      timestamp: '12:38',
      date: '10/10/2025',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contacts: Contact[] = [
    {
      id: '1',
      name: 'ParentEye Bot',
      phone: '+1 234-543-4321',
      lastMessage: 'Welcome to ParentEye Assistant',
      time: '12:38',
    },
    {
      id: '2',
      name: 'Dr. Sarah Johnson',
      phone: '+1 234-543-4322',
      lastMessage: 'Your appointment is confirmed',
      time: '12:35',
    },
    {
      id: '3',
      name: 'Appointment Reminder',
      phone: '+1 234-543-4323',
      lastMessage: 'You have an appointment tomorrow',
      time: '11:20',
    },
  ];

  const chatHistory: ChatHistory[] = [
    { date: '10/10/2025', messages: 5 },
    { date: '10/09/2025', messages: 12 },
    { date: '10/08/2025', messages: 8 },
    { date: '10/07/2025', messages: 15 },
    { date: '10/06/2025', messages: 6 },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim() === '') return;

    const currentDate = new Date().toLocaleDateString('en-US');
    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      date: currentDate,
    };

    setMessages([...messages, newMessage]);
    setInputText('');
    setShowAttachMenu(false);

    setTimeout(() => {
      const botResponse = getBotResponse(inputText);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        date: currentDate,
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  const getBotResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('appointment') || lowerInput.includes('book')) {
      return 'I can help you book an appointment. What date and time works best for you?';
    } else if (
      lowerInput.includes('symptom') ||
      lowerInput.includes('pain') ||
      lowerInput.includes('vision')
    ) {
      return "I understand you're experiencing symptoms. Can you describe what you're feeling? For urgent issues, please contact your doctor immediately.";
    } else if (
      lowerInput.includes('prescription') ||
      lowerInput.includes('glasses')
    ) {
      return 'For prescription inquiries, I can connect you with our optometry team. Would you like me to schedule a consultation?';
    } else if (lowerInput.includes('hours') || lowerInput.includes('open')) {
      return "Our clinic is open Monday-Friday: 9:00 AM - 6:00 PM, Saturday: 10:00 AM - 4:00 PM. We're closed on Sundays.";
    } else {
      return 'Thank you for your message. How else can I assist you today?';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-yellow-50 to-orange-50 font-sans">
      {/* Left Sidebar */}
      <div
        className={`${
          showSidebar ? 'w-80' : 'w-0'
        } bg-white border-r border-yellow-100 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4 bg-gradient-to-r from-yellow-200 to-orange-200 border-b border-yellow-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-700 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-yellow-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-800 placeholder-yellow-700"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`p-4 border-b border-yellow-100 cursor-pointer hover:bg-yellow-50 transition-colors ${
                selectedContact?.id === contact.id ? 'bg-yellow-100' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <EyeLogo />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {contact.name}
                    </h3>
                    <span className="text-xs text-gray-500">{contact.time}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{contact.phone}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {contact.lastMessage}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-200 to-orange-200 border-b border-yellow-100 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 hover:bg-yellow-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-yellow-900" />
            </button>
            <EyeLogo />
            <div>
              <h2 className="font-bold text-gray-900">ParentEye Assistant</h2>
              <p className="text-xs text-green-700 font-semibold">● Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="flex items-end space-x-2 max-w-md">
                {message.sender === 'bot' && (
                  <div className="flex-shrink-0">
                    <EyeLogo />
                  </div>
                )}
                <div
                  className={`flex flex-col ${
                    message.sender === 'user'
                      ? 'items-end'
                      : 'items-start'
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-orange-200 to-yellow-200 text-gray-900 font-medium rounded-br-sm shadow'
                        : 'bg-white text-gray-800 rounded-bl-sm shadow border border-yellow-100'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 px-2">
                    {message.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-yellow-100 p-4 shadow-sm">
          <div className="flex items-end space-x-2">
            <div className="relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2 text-orange-600 hover:bg-yellow-50 rounded-lg transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg border border-yellow-100 p-2 w-48">
                  <button className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-yellow-50 rounded-lg transition-colors">
                    <File className="w-5 h-5 text-orange-600" />
                    <span className="text-sm text-gray-700">Document</span>
                  </button>
                  <button className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-yellow-50 rounded-lg transition-colors">
                    <Image className="w-5 h-5 text-orange-600" />
                    <span className="text-sm text-gray-700">Image</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 bg-yellow-50 border border-yellow-100 rounded-2xl px-4 py-2 flex items-center focus-within:border-orange-200 transition-colors">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message here..."
                className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-500"
              />
            </div>
            <button
              onClick={handleSendMessage}
              className="p-3 bg-gradient-to-r from-orange-300 to-yellow-300 text-white rounded-full hover:from-orange-400 hover:to-yellow-400 transition-all shadow transform hover:scale-105"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div
        className={`${
          showRightPanel ? 'w-80' : 'w-0'
        } bg-white border-l border-yellow-100 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-b border-yellow-100">
          <div className="flex flex-col items-center">
            <EyeLogo />
            <h3 className="font-bold text-gray-900 mt-3 text-lg">
              ParentEye Assistant
            </h3>
            <p className="text-sm text-gray-600">AI-Powered Support</p>
            <p className="text-xs text-green-600 font-semibold mt-1">
              ● Active Now
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Chat History</h4>
          <div className="space-y-2">
            {chatHistory.map((history, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100 rounded-lg p-3 hover:bg-yellow-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {history.date}
                    </p>
                    <p className="text-xs text-gray-500">
                      {history.messages} messages
                    </p>
                  </div>
                  <div className="text-orange-500">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EyeCareBot;
