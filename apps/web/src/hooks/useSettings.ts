import { useState, useCallback } from "react";

export interface Settings {
  iterations: number;
  bigBlind: number;
  smallBlind: number;
}

const STORAGE_KEY = "snapcall-settings";

export const defaultSettings: Settings = {
  iterations: 10000,
  bigBlind: 20,
  smallBlind: 10,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw);
    return {
      iterations:
        typeof parsed.iterations === "number" && parsed.iterations > 0
          ? parsed.iterations
          : defaultSettings.iterations,
      bigBlind:
        typeof parsed.bigBlind === "number" && parsed.bigBlind > 0
          ? parsed.bigBlind
          : defaultSettings.bigBlind,
      smallBlind:
        typeof parsed.smallBlind === "number" && parsed.smallBlind > 0
          ? parsed.smallBlind
          : defaultSettings.smallBlind,
    };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaults = { ...defaultSettings };
    saveSettings(defaults);
    setSettings(defaults);
  }, []);

  return { settings, updateSettings, resetSettings };
}
