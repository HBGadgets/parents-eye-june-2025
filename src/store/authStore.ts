import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { getQueryClient } from "@/lib/queryClient";
import { useDeviceStore } from "./deviceStore";

interface DecodedToken {
  id: string;
  username: string;
  role: string;
  exp?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  decodedToken: DecodedToken | null;

  hydrateAuth: () => void;
  login: (token: string, expiryDays?: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  decodedToken: null,

  // 🔥 HYDRATE FROM COOKIE ON APP LOAD
  hydrateAuth: () => {
    const token = Cookies.get("token");

    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);

      // Optional: expiry check
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        Cookies.remove("token");
        return;
      }

      set({
        isAuthenticated: true,
        token,
        decodedToken: decoded,
      });
    } catch (err) {
      console.error("Invalid token", err);
      Cookies.remove("token");
    }
  },

  login: (token: string, expiryDays?: number) => {
    if (expiryDays) {
      Cookies.set("token", token, { expires: expiryDays });
    } else {
      Cookies.set("token", token);
    }

    const decoded = jwtDecode<DecodedToken>(token);

    set({
      isAuthenticated: true,
      token,
      decodedToken: decoded,
    });
  },

  logout: () => {
    Cookies.remove("token");

    // Disconnect sockets
    useDeviceStore.getState().disconnect();

    // Clear react-query cache
    getQueryClient().clear();

    set({
      isAuthenticated: false,
      token: null,
      decodedToken: null,
    });
  },
}));
