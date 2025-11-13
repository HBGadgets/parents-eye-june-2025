import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface NotificationItem {
  title: string;
  body: string;
  type?: string;
  timestamp: string;
  ping?: boolean;
}

interface NotificationStore {
  notifications: NotificationItem[];
  addNotification: (notification: NotificationItem) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: [],

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
        })),

      clearNotifications: () => set({ notifications: [] }),
    }),

    {
      name: "ct-notifications",
      partialize: (state) => ({ notifications: state.notifications }), // only persist notifications
    }
  )
);
