'use client';
import React from 'react';

interface ChatHistory {
  date: string;
  messages: number;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
}

const RightPanel = ({
  showRightPanel,
  chatHistory,
  selectedContact,
  onSelectHistory,
}: {
  showRightPanel: boolean;
  chatHistory: ChatHistory[];
  selectedContact: Contact | null;
  onSelectHistory: (date: string) => void;
}) => {
  const isBotChat = selectedContact?.id === '1' || !selectedContact;
  const profileName = selectedContact?.name || 'ParentEye Assistant';
  const profilePhone = selectedContact?.phone || 'AI-Powered Support';
  const profileAvatarLetter = selectedContact ? profileName.charAt(0).toUpperCase() : 'P';

  const PersonAvatar = ({ isBot = false, size = "medium" }: { isBot?: boolean; size?: "small" | "medium" | "large" }) => {
    const sizeClasses = {
      small: "w-6 h-6 text-xs",
      medium: "w-8 h-8 text-sm",
      large: "w-12 h-12 text-base"
    };

    return (
      <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center ${
        isBot ? 'bg-gradient-to-r from-orange-400 to-yellow-400' : 'bg-green-100'
      }`}>
        <span className={`font-semibold ${
          isBot ? 'text-white' : 'text-green-600'
        }`}>
          {isBot ? profileAvatarLetter : 'U'}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`${showRightPanel ? 'w-72' : 'w-0'} bg-white border-l border-yellow-100 flex flex-col transition-all duration-300 overflow-hidden h-full flex-shrink-0`}
    >
      {/* Profile Header */}
      <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-b border-yellow-100 flex-shrink-0">
        <div className="flex flex-col items-center">
          <PersonAvatar isBot={true} size="large" /> 
          <h3 className="font-bold text-gray-900 mt-3 text-lg text-center">{profileName}</h3>
          <p className="text-sm text-gray-600 text-center mt-1">{profilePhone}</p>
          {isBotChat && <p className="text-xs text-green-600 font-semibold mt-2">● Active Now</p>}
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <h4 className="font-semibold text-gray-900 mb-4 text-base">Chat History</h4>
        <div className="space-y-3">
          {chatHistory.map((history, i) => (
            <div
              key={i}
              onClick={() => onSelectHistory(history.date)}
              className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100 rounded-lg p-3 hover:bg-yellow-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <PersonAvatar isBot={true} size="small" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{history.date}</p>
                    <p className="text-xs text-gray-500">{history.messages} messages</p>
                  </div>
                </div>
                <div className="text-orange-500 flex-shrink-0">
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

export default RightPanel;