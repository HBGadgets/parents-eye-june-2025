
"use client";

import * as React from "react";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";
import { useNavigationStore } from "@/store/navigationStore";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import SearchComponent from "@/components/SearchComponent(appsidebar)";
import { useRouter } from "next/navigation";
import RouteLoader from "@/components/RouteLoader";

type UserRole = "superAdmin" | "school" | "branchGroup" | "branch" | null;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [userRole, setUserRole] = React.useState<UserRole>(null);
  const activeSection = useNavigationStore((state) => state.activeSection);
  const [userInfo, setUserInfo] = React.useState<string>("");
  const [isRouting, setIsRouting] = React.useState(false); // Loader flag
  const router = useRouter();

  React.useEffect(() => {
    const token = Cookies.get("token");
    const decoded = token ? getDecodedToken(token) : null;
    const role = decoded?.role;
    const user = decoded?.username;

    if (user) {
      setUserInfo(user);
    }

    if (
      typeof role === "string" &&
      ["superAdmin", "school", "branchGroup", "branch"].includes(role)
    ) {
      setUserRole(role as UserRole);
    }
  }, []);

  const getSidebarData = React.useCallback(
    (section: string, role: UserRole) => {
      switch (section) {
        case "School":
          return [
            { title: "Student Details", url: "/dashboard/school/student-details" },
            { title: "Geofence", url: "/dashboard/school/geofence" },
            { title: "Pickup And Drop", url: "/dashboard/school/pickup-drop" },
            { title: "Absent", url: "/dashboard/school/absent" },
            { title: "Present", url: "/dashboard/school/present" },
            { title: "Leave Request", url: "/dashboard/school/leave-request" },
            { title: "Status", url: "/dashboard/school/status" },
            { title: "Approved Request", url: "/dashboard/school/approved-request" },
            { title: "Denied Request", url: "/dashboard/school/denied-request" },
          ];
        case "Users":
          if (role === "superAdmin") {
            return [
              { title: "School Master", url: "/dashboard/users/school-master" },
              { title: "Branch Master", url: "/dashboard/users/branch-master" },
              { title: "Driver Approve", url: "/dashboard/users/driver-approve" },
              { title: "Student Approve", url: "/dashboard/users/student-approve" },
              { title: "Supervisor Approve", url: "/dashboard/users/supervisor-approve" },
              { title: "Add Device", url: "/dashboard/users/add-device" },
              { title: "Read Device", url: "/dashboard/users/read-device" },
              { title: "User Access", url: "/dashboard/users/user-access" },
              { title: "Notification", url: "/dashboard/users/notification" },
            ];
          } else if (role === "school" || role === "branchGroup") {
            return [
              { title: "Branch Master", url: "/dashboard/users/branch-master" },
              { title: "Driver Approve", url: "/dashboard/users/driver-approve" },
              { title: "Student Approve", url: "/dashboard/users/student-approve" },
              { title: "Supervisor Approve", url: "/dashboard/users/supervisor-approve" },
              { title: "Read Device", url: "/dashboard/users/read-device" },
            ];
          } else {
            return [
              { title: "Driver Approve", url: "/dashboard/users/driver-approve" },
              { title: "Student Approve", url: "/dashboard/users/student-approve" },
              { title: "Supervisor Approve", url: "/dashboard/users/supervisor-approve" },
              { title: "Read Device", url: "/dashboard/users/read-device" },
            ];
          }
        case "Reports":
          return [
            { title: "Status Report", url: "/dashboard/reports/status-report" },
            { title: "Distance Report", url: "/dashboard/reports/distance-report" },
            { title: "History Report", url: "/dashboard/reports/history-report" },
            { title: "Stop Report", url: "/dashboard/reports/stop-report" },
            { title: "Travel Summary", url: "/dashboard/reports/travel-summary" },
            { title: "Trip Report", url: "/dashboard/reports/trip-report" },
            { title: "Idle Report", url: "/dashboard/reports/idle-report" },
            { title: "Alerts/Events", url: "/dashboard/reports/events" },
            { title: "Geofence Report", url: "/dashboard/reports/geofence-report" },
          ];
        default:
          return [];
      }
    },
    []
  );

  const sidebarData = React.useMemo(() => {
    if (!activeSection || !userRole) return [];
    return getSidebarData(activeSection, userRole);
  }, [activeSection, userRole, getSidebarData]);

  React.useEffect(() => {
    if (!sidebarData || sidebarData.length === 0) return;

    sidebarData.forEach((item) => {
      router.prefetch(item.url);
      console.log(`Prefetched: ${item.url}`);
    });
  }, [sidebarData, router]);

  // Optional reset loader after short delay (or use router events)
  React.useEffect(() => {
    if (isRouting) {
      const timer = setTimeout(() => setIsRouting(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isRouting]);

  if (!userRole) return null;

  return (
    <>
      {isRouting && <RouteLoader />}

      <Sidebar
        {...props}
        className="bg-[#ffdc00]"
        style={{ backgroundColor: "#ffdc00" }}
      >
        <SidebarHeader className="bg-primary h-full">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
               <SearchComponent
  data={sidebarData}
  displayKey={["title"]}
  debounceDelay={500}
  onSelect={(item) => {
    setIsRouting(true); // show loader
    router.push(item.url); // navigate
  }}
/>

              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarRail className="bg-primary" />
      </Sidebar>
    </>
  );
}
