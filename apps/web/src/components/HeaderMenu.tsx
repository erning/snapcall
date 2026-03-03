import { useState, useEffect } from "react";
import { EllipsisVertical } from "lucide-react";

interface HeaderMenuProps {
  onRestart: () => void;
  onSettings: () => void;
}

export function HeaderMenu({ onRestart, onSettings }: HeaderMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <div className="relative">
      <button
        type="button"
        className="text-stone-400 hover:text-stone-600 p-1 transition-colors duration-200"
        onClick={() => setOpen((v) => !v)}
      >
        <EllipsisVertical size={18} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-10"
            onClick={() => setOpen(false)}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-stone-100 shadow-lg min-w-[200px]">
            <div className="py-1">
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                onClick={() => {
                  onSettings();
                  setOpen(false);
                }}
              >
                Settings
              </button>
              <div className="border-t border-stone-100" />
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-stone-50 transition-colors"
                onClick={() => {
                  onRestart();
                  setOpen(false);
                }}
              >
                New Game
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
