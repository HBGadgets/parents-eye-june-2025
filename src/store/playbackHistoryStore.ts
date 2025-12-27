import { create } from "zustand";

interface PlaybackHistoryStore {
  uniqueId: number | null;
  setUniqueId: (uniqueId: number) => void;
  clearUniqueId: () => void;
}

export const usePlaybackHistoryStore = create<PlaybackHistoryStore>((set) => ({
  uniqueId: null,

  setUniqueId: (uniqueId) => set({ uniqueId }),
  clearUniqueId: () => set({ uniqueId: null }),
}));
