"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  NOTIFICATION_OPTIONS,
  NotificationPayload,
} from "@/constants/notifications";
import { useBranchNotifications } from "@/hooks/useAssignBranchNotification";

interface Props {
  branchId: string;
}

const EMPTY_PAYLOAD: NotificationPayload = {
  geofence: false,
  eta: false,
  vehicleStatus: false,
  overspeed: false,
  sos: false,
  busWiseTrip: false,
};

export const BranchNotificationCell: React.FC<Props> = ({ branchId }) => {
  const [open, setOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // 🔹 SINGLE HOOK CALL - Fixed the duplicate call issue
  const { notifications, isLoading, refetch, updateNotification, isUpdating } =
    useBranchNotifications(branchId, false);

  // 🔹 Local state for UI
  const [payload, setPayload] = useState<NotificationPayload>(EMPTY_PAYLOAD);

  // 🔹 Sync fetched data to local state
  // ✅ FIXED: Use deep comparison or specific dependencies
  useEffect(() => {
    if (notifications && Object.keys(notifications).length > 0) {
      setPayload({
        geofence: notifications.geofence ?? false,
        eta: notifications.eta ?? false,
        vehicleStatus: notifications.vehicleStatus ?? false,
        overspeed: notifications.overspeed ?? false,
        sos: notifications.sos ?? false,
        busWiseTrip: notifications.busWiseTrip ?? false,
      });
    }
  }, [
    // ✅ Depend on actual values, not the object reference
    notifications?.geofence,
    notifications?.eta,
    notifications?.vehicleStatus,
    notifications?.overspeed,
    notifications?.sos,
    notifications?.busWiseTrip,
  ]);

  const enabledCount = useMemo(
    () => Object.values(payload).filter(Boolean).length,
    [payload]
  );

  // 🔹 Toggle dropdown and lazy fetch
  const handleToggleDropdown = async () => {
    const newOpenState = !open;
    setOpen(newOpenState);

    // Fetch only once when opening
    if (newOpenState && !hasFetched) {
      setHasFetched(true);
      try {
        await refetch();
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    }
  };

  // 🔹 Toggle individual notification option
  const handleToggleOption = (key: keyof NotificationPayload) => {
    const updatedPayload = {
      ...payload,
      [key]: !payload[key],
    };

    // Optimistic UI update
    setPayload(updatedPayload);

    // Backend mutation (hook handles success/error)
    updateNotification(updatedPayload);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggleDropdown}
        disabled={isUpdating}
        className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
      >
        <span className="text-gray-700">
          {enabledCount > 0
            ? `Notifications`
            : "Notifications"}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-white border rounded shadow-lg">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>
          )}

          {!isLoading &&
            NOTIFICATION_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center px-3 py-2 text-sm hover:bg-yellow-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={!!payload[opt.key]}
                  disabled={isUpdating}
                  onChange={() => handleToggleOption(opt.key)}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 disabled:cursor-not-allowed"
                />
                <span className="ml-3 text-gray-700">{opt.label}</span>
              </label>
            ))}
        </div>
      )}
    </div>
  );
};
