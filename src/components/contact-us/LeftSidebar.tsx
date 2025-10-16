'use client';
import React from 'react';
import { Search, MessageCircle } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
}

const LeftSidebar = ({
  showSidebar,
  contacts,
  selectedContact,
  onSelectContact,
  onToggleSidebar,
}: {
  showSidebar: boolean;
  contacts: Contact[];
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
  onToggleSidebar: () => void;
}) => {
  return (
    <div
      className={`${
        showSidebar ? 'w-80' : 'w-0'
      } bg-white border-r border-yellow-100 flex flex-col transition-all duration-300 overflow-hidden h-full flex-shrink-0`}
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-yellow-200 to-orange-200 border-b border-yellow-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg">Chats</h2>
          <button className="p-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors">
            <MessageCircle className="w-4 h-4 text-white" />
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-700 w-4 h-4" />
          <input
            type="text"
            placeholder="Search contacts..."
            className="w-full pl-10 pr-4 py-2 bg-yellow-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-800 placeholder-yellow-700"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="py-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => onSelectContact(contact)}
              className={`px-4 py-3 border-b border-yellow-100 cursor-pointer transition-all ${
                selectedContact?.id === contact.id 
                  ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-l-4 border-l-orange-400' 
                  : 'hover:bg-gradient-to-r from-yellow-50 to-orange-50'
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Contact Avatar */}
                <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {contact.name}
                    </h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {contact.time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1 truncate">
                    {contact.phone}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate flex-1 mr-2">
                      {contact.lastMessage}
                    </p>
                    {contact.unread && (
                      <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
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

export default LeftSidebar;