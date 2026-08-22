import { create } from "zustand";
import type { SelectionScope } from "../types";

interface UiState {
  commandBarOpen: boolean;
  settingsOpen: boolean;
  historyOpen: boolean;
  selection: SelectionScope;
  toastMessage: string | null;

  setCommandBarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setSelection: (sel: SelectionScope) => void;
}

export const useUi = create<UiState>((set) => ({
  commandBarOpen: false,
  settingsOpen: false,
  historyOpen: false,
  selection: { kind: "none" },
  toastMessage: null,

  setCommandBarOpen: (commandBarOpen) => set({ commandBarOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setHistoryOpen: (historyOpen) => set({ historyOpen }),
  setSelection: (selection) => set({ selection }),
}));
