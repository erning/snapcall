import { useEffect, useRef, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Mobile bottom sheet */}
      <div className="sm:hidden fixed inset-0 z-40 bg-black/30" />
      <div
        ref={ref}
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-lg p-4 max-h-[70vh] overflow-y-auto animate-slide-up"
      >
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 bg-stone-300 rounded-full" />
        </div>
        {children}
      </div>

      {/* Desktop inline */}
      <div className="hidden sm:block mt-2">{children}</div>
    </>
  );
}
