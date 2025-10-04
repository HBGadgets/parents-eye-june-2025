import { getQueryClient } from "@/lib/queryClient";
import { create } from "zustand";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  id: string;
  username: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  decodedToken: DecodedToken | null;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  decodedToken: null,

  login: (token: string) => {
    // Save in cookie/localStorage
    document.cookie = `token=${token}; path=/`;
    localStorage.setItem("token", token);

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

    // Clear react-query cache
    getQueryClient().clear();

    set({
      isAuthenticated: false,
      token: null,
      decodedToken: null,
    });
  },
}));
