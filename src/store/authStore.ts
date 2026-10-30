import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { getQueryClient } from "@/lib/queryClient";
import { useDeviceStore } from "./deviceStore";

export interface UserAccessPermissions {
  master?: {
    device?: boolean;
    geoTag?: boolean;
    geotag?: boolean;
    schoolMaster?: boolean;
    branchMaster?: boolean;
    userAccess?: boolean;
    studentDetails?: boolean;
    parentsMaster?: boolean;
    routes?: boolean;
    route?: boolean;
    routeRoster?: boolean;
    geofence?: boolean;
    model?: boolean;
    category?: boolean;
    ticketTypes?: boolean;
    [key: string]: boolean | undefined;
  };
  school?: {
    pickupAndDrop?: boolean;
    leaveRequest?: boolean;
    sendBroadcast?: boolean;
    driverApprove?: boolean;
    supervisorApprove?: boolean;
    [key: string]: boolean | undefined;
  };
  users?: {
    driverApprove?: boolean;
    supervisorApprove?: boolean;
    [key: string]: boolean | undefined;
  };
  reports?: {
    analytics?: boolean;
    status?: boolean;
    distance?: boolean;
    history?: boolean;
    stop?: boolean;
    stoppageSummary?: boolean;
    travel?: boolean;
    travelSummary?: boolean;
    trip?: boolean;
    idle?: boolean;
    alert?: boolean;
    alertsEvents?: boolean;
    geofenceReport?: boolean;
    routeReport?: boolean;
    pickupAndDrop?: boolean;
    ePoliceReport?: boolean;
    [key: string]: boolean | undefined;
  };
  [key: string]: Record<string, boolean | undefined> | undefined;
}

interface DecodedToken {
  id: string;
  username: string;
  role: string;
  schoolId?: string;
  branchId?: string;
  exp?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  decodedToken: DecodedToken | null;
  role: string | null;
  username: string | null;
  access: UserAccessPermissions | null;
  fullAccess: boolean;

  hydrateAuth: () => void;
  login: (
    token: string,
    expiryDays?: number,
    access?: UserAccessPermissions | null,
    fullAccess?: boolean,
    role?: string,
    username?: string
  ) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  decodedToken: null,
  role: null,
  username: null,
  access: null,
  fullAccess: false,

  // 🔥 HYDRATE FROM COOKIE ON APP LOAD
  hydrateAuth: () => {
    const token = Cookies.get("token");

    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);

      // Optional: expiry check
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        Cookies.remove("token");
        if (typeof window !== "undefined") {
          localStorage.removeItem("userAccess");
          localStorage.removeItem("fullAccess");
          localStorage.removeItem("userRole");
          localStorage.removeItem("username");
        }
        return;
      }

      let access: UserAccessPermissions | null = null;
      let fullAccess = false;
      let role = decoded.role || null;
      let username = decoded.username || null;

      if (typeof window !== "undefined") {
        try {
          const storedAccess = localStorage.getItem("userAccess");
          if (storedAccess) {
            access = JSON.parse(storedAccess);
          }
          const storedFullAccess = localStorage.getItem("fullAccess");
          if (storedFullAccess !== null) {
            fullAccess = storedFullAccess === "true";
          }
          const storedRole = localStorage.getItem("userRole");
          if (storedRole) {
            role = storedRole;
          }
          const storedUsername = localStorage.getItem("username");
          if (storedUsername) {
            username = storedUsername;
          }
        } catch (e) {
          console.error("Failed to parse stored auth from localStorage", e);
        }
      }

      set({
        isAuthenticated: true,
        token,
        decodedToken: decoded,
        role,
        username,
        access,
        fullAccess,
      });
    } catch (err) {
      console.error("Invalid token", err);
      Cookies.remove("token");
    }
  },

  login: (
    token: string,
    expiryDays?: number,
    access?: UserAccessPermissions | null,
    fullAccess?: boolean,
    role?: string,
    username?: string
  ) => {
    if (expiryDays) {
      Cookies.set("token", token, { expires: expiryDays });
    } else {
      Cookies.set("token", token);
    }

    const decoded = jwtDecode<DecodedToken>(token);
    const resolvedRole = role || decoded.role || null;
    const resolvedUsername = username || decoded.username || null;
    const isFullAccess = fullAccess ?? (resolvedRole === "superAdmin");

    if (typeof window !== "undefined") {
      if (access) {
        localStorage.setItem("userAccess", JSON.stringify(access));
      } else {
        localStorage.removeItem("userAccess");
      }
      localStorage.setItem("fullAccess", String(isFullAccess));
      if (resolvedRole) {
        localStorage.setItem("userRole", resolvedRole);
      }
      if (resolvedUsername) {
        localStorage.setItem("username", resolvedUsername);
      }
    }

    set({
      isAuthenticated: true,
      token,
      decodedToken: decoded,
      role: resolvedRole,
      username: resolvedUsername,
      access: access || null,
      fullAccess: isFullAccess,
    });
  },

  logout: () => {
    Cookies.remove("token");
    if (typeof window !== "undefined") {
      localStorage.removeItem("userAccess");
      localStorage.removeItem("fullAccess");
      localStorage.removeItem("userRole");
      localStorage.removeItem("username");
    }

    // Disconnect sockets
    useDeviceStore.getState().disconnect();

    // Clear react-query cache
    getQueryClient().clear();

    set({
      isAuthenticated: false,
      token: null,
      decodedToken: null,
      role: null,
      username: null,
      access: null,
      fullAccess: false,
    });
  },
}));
