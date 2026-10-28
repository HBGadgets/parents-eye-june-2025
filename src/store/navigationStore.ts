import { create } from "zustand";
import { persist } from "zustand/middleware";

type NavigationState = {
  activeSection: string;
  setActiveSection: (section: string) => void;
};

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      activeSection: "Dashboard",
      setActiveSection: (section) => set({ activeSection: section }),
    }),
    {
      name: "parentseye_active_nav_section",
    }
  )
);
