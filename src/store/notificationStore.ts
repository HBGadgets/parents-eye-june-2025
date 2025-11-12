import { create } from "zustand";

export interface NotificationItem {
  title: string;
  body: string;
  type?: string;
  timestamp: number;
  ping?: boolean;
}

interface NotificationStore {
  notifications: NotificationItem[];
  addNotification: (notification: NotificationItem) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
