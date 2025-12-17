import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

interface ContextMenuProps {
  x: number;
  y: number;
  onAddOTO: () => void;
  onAddDownsell: () => void;
  onClose: () => void;
}

export const ContextMenu = ({ x, y, onAddOTO, onAddDownsell, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use capture phase to ensure we catch the event before ReactFlow
    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 1000,
      }}
    >
      <Card className="p-1 min-w-[150px] shadow-lg">
        <button
          onClick={() => {
            onAddOTO();
            onClose();
          }}
          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded transition-colors"
        >
          Add OTO
        </button>
        <button
          onClick={() => {
            onAddDownsell();
            onClose();
          }}
          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded transition-colors"
        >
          Add Downsell
        </button>
      </Card>
    </div>
  );
};
