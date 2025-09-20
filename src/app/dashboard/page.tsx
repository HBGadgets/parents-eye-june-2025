"use client";

import DeviceTracker from "@/components/dashboard/DeviceTracker";
import SharedDevice from "@/components/dashboard/SharedDevice";
// import { MyPageTable } from "@/components/example/MyPageTable";

export default function DashboardPage() {
  // const sharedDeviceToken = Cookies.get("token");
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Welcome to the Dashboard...</h1>
      <div className="App">
        {/* {sharedDeviceToken ? (
          <SharedDevice token={sharedDeviceToken} />
        ) : (
        )} */}
        <DeviceTracker />
      </div>
    </div>
  );
}
