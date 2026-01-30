export type NotificationType =
  | "ignition"
  | "overspeed"
  | "parking-alert"
  | "sos"
  | "general"
  | "geofence"
  | "pickup-drop";

export const NOTIFICATION_TYPES: { label: string; value: NotificationType }[] =
  [
    { label: "Ignition", value: "ignition" },
    { label: "Overspeed", value: "overspeed" },
    { label: "Parking Alert", value: "parking-alert" },
    { label: "SOS", value: "sos" },
    { label: "Geofence", value: "geofence" },
    { label: "Pickup/Drop", value: "pickup-drop" },
    // { label: "General", value: "general" },
  ];

  // IndexedDB constants
const DB_NAME = "notification-prefs-db";
const STORE_NAME = "prefs";
const KEY = "blocked-types";

// Helper to interact with IndexedDB directly (no external deps)
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getStoredPreferences = (): NotificationType[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("notification_preferences");
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn("Failed to read notification preferences from localStorage", e);
    return [];
  }
};

export const setStoredPreference = async (
  type: NotificationType,
  enabled: boolean
) => {
  // 1. Update localStorage for UI sync
  const current = getStoredPreferences();
  let updated: NotificationType[];

  if (enabled) {
    // If enabling, remove from "blocked" list? 
    // Wait, let's treat the list as "ENABLED" types or "BLOCKED" types?
    // The user request says "enable the type of notification the user want to recieve"
    // So let's store ENABLED types.
    // Default behavior: If nothing is stored, assume ALL enabled? Or nothing enabled?
    // Usually opt-out is better for notifications.
    // Let's store BLOCKED types to make opt-out easier.
    // So if "enabled" is true, we REMOVE it from the list of blocked types.
    updated = current.filter((t) => t !== type);
  } else {
    // If disabling, ADD to the list (if not already there)
    if (!current.includes(type)) {
      updated = [...current, type];
    } else {
      updated = current;
    }
  }
  
  localStorage.setItem("notification_preferences", JSON.stringify(updated));

  // 2. Update IndexedDB for Service Worker
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(updated, KEY);
  } catch (e) {
    console.warn("Failed to sync preferences to IndexedDB", e);
  }
  
  return updated;
};

// Function to initialize default state (blocked list is empty = all enabled)
export const isNotificationEnabled = (
  type: string | undefined,
  blockedTypes: NotificationType[]
): boolean => {
  if (!type) return !blockedTypes.includes("general"); // Default to general
  return !blockedTypes.includes(type as NotificationType);
};
