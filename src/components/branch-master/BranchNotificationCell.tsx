"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  NOTIFICATION_OPTIONS,
  NotificationPayload,
} from "@/constants/notifications";
import { useBranchNotifications } from "@/hooks/useAssignBranchNotification";
// import { useBranchNotifications } from "@/hooks/useAssignBranchNotification";
// import { useBranchNotification } from "@/hooks/useBranchNotification";

interface Props {
  branchId: string;
}

export const BranchNotificationCell: React.FC<Props> = ({ branchId }) => {
  const [open, setOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // 🔹 Query (lazy)
  const { notifications, isLoading, refetch } = useBranchNotifications(
    branchId,
    false
  );

  // 🔹 Update mutation
  const { updateNotification, isUpdating } = useBranchNotifications(branchId);

  // 🔹 Local checkbox state
  const [payload, setPayload] = useState<NotificationPayload>({
    geofence: false,
    eta: false,
    vehicleStatus: false,
    overspeed: false,
    sos: false,
    busWiseTrip: false,
  });

  // 🔥 Sync API response → local state
 useEffect(() => {
  if (notifications) {
    setPayload({
      geofence: notifications.geofence ?? false,
      eta: notifications.eta ?? false,
      vehicleStatus: notifications.vehicleStatus ?? false,
      overspeed: notifications.overspeed ?? false,
      sos: notifications.sos ?? false,
      busWiseTrip: notifications.busWiseTrip ?? false,
    });
  }
}, [notifications]);


  const enabledCount = useMemo(
    () => Object.values(payload).filter(Boolean).length,
    [payload]
  );

  // 🔹 Open dropdown + fetch once
  const handleToggleDropdown = async () => {
    setOpen((prev) => !prev);

    if (!hasFetched) {
      await refetch();
      setHasFetched(true);
    }
  };

  // 🔹 Toggle checkbox
  const handleToggleOption = (key: keyof NotificationPayload) => {
    const updatedPayload = {
      ...payload,
      [key]: !payload[key],
    };

    // 1️⃣ Update UI instantly
    setPayload(updatedPayload);

    // 2️⃣ Persist to backend
    updateNotification(updatedPayload);
  };

  return (
    <div className="relative">
      {/* Button */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-50 min-w-[160px]"
      >
        <span className="text-gray-700">
          {enabledCount > 0 ? `Notifications` : "Notifications"}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
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
                  checked={payload[opt.key]}
                  disabled={isUpdating}
                  onChange={() => handleToggleOption(opt.key)}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="ml-3 text-gray-700">{opt.label}</span>
              </label>
            ))}
        </div>
      )}
    </div>
  );
};
