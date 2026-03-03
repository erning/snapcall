import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Settings } from "../hooks/useSettings";
import { defaultSettings } from "../hooks/useSettings";
import { NumberEditor } from "./NumberEditor";

interface SettingsPageProps {
  settings: Settings;
  onSave: (next: Settings) => void;
  onRestart: (bb: number, sb: number) => void;
  onBack: () => void;
}

export function SettingsPage({
  settings,
  onSave,
  onRestart,
  onBack,
}: SettingsPageProps) {
  const [draft, setDraft] = useState<Settings>({ ...settings });

  const blindsChanged =
    draft.bigBlind !== settings.bigBlind ||
    draft.smallBlind !== settings.smallBlind;

  function handleSave() {
    onSave(draft);
    if (blindsChanged) {
      onRestart(draft.bigBlind, draft.smallBlind);
    }
    onBack();
  }

  return (
    <main className="h-screen flex flex-col bg-stone-50">
      <div className="shrink-0 max-w-lg w-full mx-auto px-4 pt-3 pb-2">
        <header className="px-1 flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-stone-500 hover:text-stone-700 transition-colors duration-200 -ml-1 p-1"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-stone-900">Settings</h1>
        </header>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto px-4 pb-24 space-y-4">
          {/* Calculation */}
          <div className="bg-white rounded-2xl p-4 space-y-2 border border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900">
              Calculation
            </h2>
            <label className="block text-xs font-medium text-stone-500 px-1">
              Monte Carlo iterations
            </label>
            <NumberEditor
              value={draft.iterations}
              onChange={(v) => setDraft((d) => ({ ...d, iterations: v }))}
              step={1000}
              min={1000}
              compact
            />
          </div>

          {/* Game Defaults */}
          <div className="bg-white rounded-2xl p-4 space-y-2 border border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900">
              Game Defaults
            </h2>
            <label className="block text-xs font-medium text-stone-500 px-1">
              Big Blind
            </label>
            <NumberEditor
              value={draft.bigBlind}
              onChange={(v) => setDraft((d) => ({ ...d, bigBlind: v }))}
              step={1}
              min={1}
              compact
            />
            <label className="block text-xs font-medium text-stone-500 px-1 pt-2">
              Small Blind
            </label>
            <NumberEditor
              value={draft.smallBlind}
              onChange={(v) => setDraft((d) => ({ ...d, smallBlind: v }))}
              step={1}
              min={1}
              compact
            />
          </div>

          {/* Cancel / Save */}
          <div className="flex gap-3 px-1">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors duration-200"
            >
              {blindsChanged ? "Save and Restart Game" : "Save"}
            </button>
          </div>

          {/* Reset to Defaults */}
          <div className="border-t border-stone-200 pt-4 px-1">
            <button
              type="button"
              onClick={() => setDraft({ ...defaultSettings })}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors duration-200"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
