import type { UserAccessPermissions } from "@/store/authStore";

export type UserRole = "superAdmin" | "school" | "branchGroup" | "branch" | null;

export interface NavItemConfig {
  title: string;
  url: string;
  key?: string | string[];
}

export interface SidebarItem {
  title: string;
  url: string;
}

// 1. Super Admin baseline for Master
export const SUPER_ADMIN_MASTER_ITEMS: NavItemConfig[] = [
  { title: "Device", url: "/dashboard/users/add-device", key: "device" },
  { title: "School Master", url: "/dashboard/users/school-master", key: "schoolMaster" },
  { title: "Branch Master", url: "/dashboard/users/branch-master", key: "branchMaster" },
  { title: "User Access", url: "/dashboard/users/user-access", key: "userAccess" },
  {
    title: "Student Details",
    url: "/dashboard/school/student-details",
    key: "studentDetails",
  },
  {
    title: "Parents Master",
    url: "/dashboard/users/parents-master",
    key: "parentsMaster",
  },
  { title: "Routes", url: "/dashboard/master/route", key: ["routes", "route"] },
  { title: "Route Roster", url: "/dashboard/master/route-roster", key: "routeRoster" },
  {
    title: "Geofence",
    url: "/dashboard/school/geofence",
    key: "geofence",
  },
  { title: "Model", url: "/dashboard/master/model", key: "model" },
  { title: "Category", url: "/dashboard/master/category", key: "category" },
  { title: "Ticket Types", url: "/dashboard/support/ticket-types", key: "ticketTypes" },
  { title: "Driver", url: "/dashboard/users/driver-approve", key: "driver" },
];

// 2. School and BranchGroup baseline for Master
export const SCHOOL_BRANCH_GROUP_MASTER_ITEMS: NavItemConfig[] = [
  { title: "Device", url: "/dashboard/users/add-device", key: "device" },
  { title: "Branch Master", url: "/dashboard/users/branch-master", key: "branchMaster" },
  {
    title: "Student Details",
    url: "/dashboard/school/student-details",
    key: "studentDetails",
  },
  {
    title: "Parents Master",
    url: "/dashboard/users/parents-master",
    key: "parentsMaster",
  },
  { title: "Routes", url: "/dashboard/master/route", key: ["routes", "route"] },
  { title: "Route Roster", url: "/dashboard/master/route-roster", key: "routeRoster" },
  {
    title: "Geofence",
    url: "/dashboard/school/geofence",
    key: "geofence",
  },
];

// 3. Branch baseline for Master
export const BRANCH_MASTER_ITEMS: NavItemConfig[] = [
  { title: "Device", url: "/dashboard/users/add-device", key: "device" },
  {
    title: "Student Details",
    url: "/dashboard/school/student-details",
    key: "studentDetails",
  },
  {
    title: "Parents Master",
    url: "/dashboard/users/parents-master",
    key: "parentsMaster",
  },
  { title: "Routes", url: "/dashboard/master/route", key: ["routes", "route"] },
  { title: "Route Roster", url: "/dashboard/master/route-roster", key: "routeRoster" },
  {
    title: "Geofence",
    url: "/dashboard/school/geofence",
    key: "geofence",
  },
];

// School section baseline
export const SCHOOL_CONFIG: NavItemConfig[] = [
  { title: "Pickup And Drop", url: "/dashboard/school/pickup-drop", key: "pickupAndDrop" },
  { title: "Leave Request", url: "/dashboard/school/leave-request", key: "leaveRequest" },
  { title: "Send Broadcast", url: "/dashboard/school/send-broadcast", key: "sendBroadcast" },
];

// Users section baseline
export const USERS_CONFIG: NavItemConfig[] = [
  {
    title: "Driver Approve",
    url: "/dashboard/users/driver-approve",
    key: "driverApprove",
  },
  {
    title: "Supervisor Approve",
    url: "/dashboard/users/supervisor-approve",
    key: "supervisorApprove",
  },
];

// Reports section baseline
export const REPORTS_CONFIG: NavItemConfig[] = [
  {
    title: "Analytics Report",
    url: "/dashboard/reports/analytics-report",
    key: "analytics",
  },
  { title: "Status Report", url: "/dashboard/reports/status-report", key: "status" },
  {
    title: "Distance Report",
    url: "/dashboard/reports/distance-report",
    key: "distance",
  },
  {
    title: "History Report",
    url: "/dashboard/reports/history-report",
    key: "history",
  },
  { title: "Stop Report", url: "/dashboard/reports/stop-report", key: "stop" },
  {
    title: "Stoppage Summary",
    url: "/dashboard/reports/stoppage-summary",
    key: "stoppageSummary",
  },
  {
    title: "Travel Summary",
    url: "/dashboard/reports/travel-summary",
    key: ["travel", "travelSummary"],
  },
  { title: "Trip Report", url: "/dashboard/reports/trip-report", key: "trip" },
  { title: "Idle Report", url: "/dashboard/reports/idle-report", key: "idle" },
  { title: "Alerts/Events", url: "/dashboard/reports/events", key: ["alert", "alertsEvents"] },
  {
    title: "Geofence Report",
    url: "/dashboard/reports/geofence-report",
    key: "geofenceReport",
  },
  {
    title: "Route Report",
    url: "/dashboard/reports/route-report",
    key: "routeReport",
  },
  {
    title: "e-Police Report",
    url: "/dashboard/reports/epolice-report",
    key: "ePoliceReport",
  },
];

// Support section baseline
export const SUPPORT_CONFIG: NavItemConfig[] = [
  { title: "Chat Box", url: "/dashboard/support/contact-us" },
  { title: "Raise Ticket", url: "/dashboard/support/raise-ticket" },
  { title: "Incident Management", url: "/dashboard/incident-management" },
  { title: "FAQ", url: "/dashboard/support/faq" },
];

/**
 * Returns the hardcoded baseline items for each role and section.
 */
export const getRoleBaseItems = (section: string, role: UserRole): NavItemConfig[] => {
  switch (section) {
    case "Master":
      if (role === "superAdmin") {
        return SUPER_ADMIN_MASTER_ITEMS;
      }
      if (role === "school" || role === "branchGroup") {
        return SCHOOL_BRANCH_GROUP_MASTER_ITEMS;
      }
      return BRANCH_MASTER_ITEMS;
    case "School":
      return SCHOOL_CONFIG;
    case "Users":
      return USERS_CONFIG;
    case "Reports":
      return REPORTS_CONFIG;
    case "Support":
      return SUPPORT_CONFIG;
    default:
      return [];
  }
};

/**
 * Applies dynamic access control on top of the role's hardcoded baseline items.
 *
 * Rules:
 * 1. superAdmin always gets full baseline access.
 * 2. fullAccess === true gets full baseline access for that specific role.
 * 3. When dynamic userAccess is provided, it filters strictly WITHIN that role's baseline items.
 *    Roles cannot gain access to items outside their baseline (e.g., branch cannot access schoolMaster).
 * 4. Items without an access key (e.g., Support items) remain accessible.
 * 5. If userAccess is null/undefined, falls back to role baseline items.
 */
export const getAccessibleSidebarItems = (
  section: string,
  role: UserRole,
  userAccess: UserAccessPermissions | null,
  isFullAccess: boolean
): SidebarItem[] => {
  const baseItems = getRoleBaseItems(section, role);

  // If superAdmin or fullAccess, return all baseline items for this role
  if (role === "superAdmin" || isFullAccess) {
    return baseItems.map(({ title, url }) => ({ title, url }));
  }

  // If no dynamic access permissions object provided, fallback to role baseline
  if (!userAccess) {
    return baseItems.map(({ title, url }) => ({ title, url }));
  }

  // Determine which section permissions to check
  let sectionPermissions: Record<string, boolean | undefined> | undefined;
  switch (section) {
    case "Master":
      sectionPermissions = userAccess.master;
      break;
    case "School":
      sectionPermissions = userAccess.school;
      break;
    case "Users":
      sectionPermissions = userAccess.users;
      break;
    case "Reports":
      sectionPermissions = userAccess.reports;
      break;
    case "Support":
      // Support items don't have restrictions in schema
      return baseItems.map(({ title, url }) => ({ title, url }));
    default:
      return [];
  }

  // If section permissions are not provided at all, fallback to all items in baseline
  if (!sectionPermissions) {
    return baseItems.map(({ title, url }) => ({ title, url }));
  }

  // Filter role's baseline items by permissions
  return baseItems
    .filter((item) => {
      if (!item.key) return true;
      if (Array.isArray(item.key)) {
        return item.key.some((k) => sectionPermissions?.[k] === true);
      }
      return sectionPermissions[item.key] === true;
    })
    .map(({ title, url }) => ({ title, url }));
};
