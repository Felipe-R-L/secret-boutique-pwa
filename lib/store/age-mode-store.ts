import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Modo de catálogo escolhido pelo visitante:
// - "unset": ainda não respondeu (modal aberta; por segurança, só SFW visível)
// - "adult": declarou 18+ → catálogo completo
// - "sfw":   declarou ser menor → apenas produtos livres (is_adult = false)
export type AgeMode = "unset" | "adult" | "sfw";

interface AgeModeStore {
  mode: AgeMode;
  setMode: (mode: AgeMode) => void;
}

export const useAgeModeStore = create<AgeModeStore>()(
  persist(
    (set) => ({
      mode: "unset",
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "sb-age-mode",
      storage: createJSONStorage(() => localStorage),
      // Rehidratação manual pós-mount (AgeGate) para não divergir do SSR.
      skipHydration: true,
    },
  ),
);
