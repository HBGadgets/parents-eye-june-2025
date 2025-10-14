'use client';
import React, { useState } from 'react';
import LeftSidebar from '@/components/contact-us/LeftSidebar';
import ChatArea from '@/components/contact-us/ChatArea';
import RightPanel from '@/components/contact-us/RightPanel';

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

const getInitialMessages = (contact: Contact): Message[] => {
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = new Date().toLocaleDateString('en-US');

  let initialText = `Hello ${contact.name}! How can I assist you in this conversation?`;
  if (contact.id === '1') {
    initialText = 'Hello! Welcome to ParentEye Assistant. How can I help you today?';
  }

  return [
    {
      id: 'init-1',
      text: initialText,
      sender: 'bot',
      timestamp: time,
      date: date,
    },
  ];
};

const EyeCareBot = () => {
  const initialContacts: Contact[] = [
    { id: '1', name: 'ParentEye Bot', phone: '+91 234-543-4321', lastMessage: 'Welcome to ParentEye Assistant', time: '12:38' },
    { id: '2', name: 'Dr. Sarah Johnson', phone: '+91 234-543-4322', lastMessage: 'Your appointment is confirmed', time: '12:35' },
    { id: '3', name: 'Mr. Alex Lee', phone: '+91 234-543-4323', lastMessage: 'Can you send the invoice?', time: '12:25' },
  ];

  const [selectedContact, setSelectedContact] = useState<Contact | null>(initialContacts[0]);
  const [messages, setMessages] = useState<Message[]>(getInitialMessages(initialContacts[0]));
  const [inputText, setInputText] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  const contacts: Contact[] = initialContacts;

  const chatHistory: ChatHistory[] = [
    { date: '10/10/2025', messages: 5 },
    { date: '10/09/2025', messages: 12 },
  ];

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setMessages(getInitialMessages(contact));
    setInputText('');
    setShowAttachMenu(false);
    setSelectedHistoryDate(null);
  };

  const handleSendMessage = () => {
    if (inputText.trim() === '' || !selectedContact) return;
    const currentDate = new Date().toLocaleDateString('en-US');
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: currentTime,
      date: currentDate,
    };

    setMessages([...messages, newMessage]);
    setInputText('');
    setShowAttachMenu(false);

    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputText),
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
    const text = input.toLowerCase();
    if (text.includes('appointment')) return 'I can help you book an appointment. What date works best?';
    if (text.includes('symptom')) return 'Please describe your symptoms for better assistance.';
    if (text.includes('hours')) return 'Clinic Hours: Mon–Fri 9AM–6PM, Sat 10AM–4PM.';
    return 'Thank you for your message. How else can I help?';
  };

  const displayedMessages = selectedHistoryDate
    ? messages.filter((m) => m.date === selectedHistoryDate)
    : messages;

  return (
    <div className="flex w-full bg-white font-sans overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="flex w-full h-full">
        <LeftSidebar
          showSidebar={showSidebar}
          contacts={contacts}
          selectedContact={selectedContact}
          onSelectContact={handleSelectContact}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
        />
        
        <div className="flex-1 flex flex-col min-w-0">
          <ChatArea
            messages={displayedMessages}
            inputText={inputText}
            showAttachMenu={showAttachMenu}
            onInputChange={setInputText}
            onSend={handleSendMessage}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            onToggleAttachMenu={() => setShowAttachMenu(!showAttachMenu)}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            selectedContact={selectedContact}
          />
        </div>
        
        <RightPanel
          showRightPanel={showRightPanel}
          chatHistory={chatHistory}
          selectedContact={selectedContact}
          onSelectHistory={(date) => setSelectedHistoryDate(date)}
        />
      </div>
    </div>
  );
};

export default EyeCareBot;