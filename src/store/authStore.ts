import { getQueryClient } from "@/lib/queryClient";
import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { useDeviceStore } from "./deviceStore";

interface DecodedToken {
  id: string;
  username: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  decodedToken: DecodedToken | null;
  login: (token: string, expiryDays?: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  decodedToken: null,

  login: (token: string, expiryDays?: number) => {
    // Save in cookie/localStorage
    let cookieString = `token=${token}; path=/`;

    if (expiryDays) {
      const date = new Date();
      date.setTime(date.getTime() + expiryDays * 24 * 60 * 60 * 1000);
      const expires = date.toUTCString();
      cookieString += `; expires=${expires}`;
    }

    document.cookie = cookieString;
    // localStorage.setItem("token", token);

    // Decode token
    const decoded = jwtDecode<DecodedToken>(token);

    set({
      isAuthenticated: true,
      token,
      decodedToken: decoded,
    });
  },

  logout: () => {
    // Clear cookie & localStorage
    document.cookie = "token=; Max-Age=0; path=/";
    localStorage.removeItem("token");
    const disconnect = useDeviceStore.getState().disconnect;
    disconnect();

    // Clear react-query cache
    getQueryClient().clear();

    set({
      isAuthenticated: false,
      token: null,
      decodedToken: null,
    });
  },
}));
