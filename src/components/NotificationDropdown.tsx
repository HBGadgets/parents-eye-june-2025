"use client";

import React from "react";
import { useNotificationStore } from "@/store/notificationStore";
import { Bell, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export const NotificationSheet = () => {
  const { notifications, clearNotifications } = useNotificationStore();

  const [isClearing, setIsClearing] = React.useState(false);

  const handleClear = () => {
    if (notifications.length === 0) return;

    setIsClearing(true);

    // Wait until last stagger animation finishes
    const totalDuration = 300 + notifications.length * 80;

    setTimeout(() => {
      clearNotifications();
      setIsClearing(false);
    }, totalDuration);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="cursor-pointer relative">
          <Bell className="w-5 h-5 text-white cursor-pointer" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full px-1.5">
              {notifications.length}
            </span>
          )}
        </div>
      </SheetTrigger>

      <SheetContent side="right" className="w-80 p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>Your latest updates</SheetDescription>
            </div>

            {notifications.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-red-500 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>
        </SheetHeader>

        {notifications.length === 0 ? (
          <div className="p-6 text-gray-500 text-sm text-center">
            No notifications yet 💤
          </div>
        ) : (
          <ul className="max-h-[80vh] overflow-y-auto">
            {notifications.map((n, i) => (
              <li
                key={i}
                className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 
                  transition-all 
                  ${isClearing ? "animate-fadeOutUp" : ""}
                `}
                style={{
                  animationDelay: isClearing ? `${i * 80}ms` : "0ms",
                }}
              >
                <p className="font-medium text-gray-800">{n.title}</p>
                <p className="text-sm text-gray-600">{n.body}</p>

                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.timestamp).toLocaleTimeString("en-IN", {
                    timeStyle: "short",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
};
