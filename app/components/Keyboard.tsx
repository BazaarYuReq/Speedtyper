"use client";

import { useEffect, useState } from "react";

const normalizeKey = (key: string) => {
  if (key === " ") return "Space";
  if (key === "Backspace") return "Backspace";
  if (key === "Enter") return "Enter";
  if (key === "Tab") return "Tab";
  if (key === "Shift") return "Shift";
  if (key === "Escape") return "ESC";
  return key.length === 1 ? key.toUpperCase() : key;
};
interface KeyboardProps {
  pressedKey: string;
};

const KeyButton = ({
  label,
  active,
  className = "",
}: {
  label: string;
  active: boolean;
  className?: string;
}) => (
  <div className={`relative ${className}`}>
    <span
      className={`
        absolute inset-0 rounded-xl bg-black/40
        transition-transform duration-75
        ${active ? "translate-y-[6px]" : "translate-y-[3px]"}
      `}
    />
    <span className="absolute inset-0 rounded-xl bg-gradient-to-b from-gray-900 to-gray-700" />
    <span
      className={`
        relative block rounded-xl h-[52px]
        bg-gray-500 text-white text-sm font-semibold
        transition-transform duration-75 select-none
        flex items-center justify-center
        ${active ? "translate-y-0" : "-translate-y-[6px]"}
      `}
    >
      {label}
    </span>
  </div>
);

export default function Keyboard({ pressedKey }: KeyboardProps) {
  const [pressed, setPressed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      setPressed((p) => new Set(p).add(normalizeKey(e.key)));
    };
    const up = (e: KeyboardEvent) => {
      setPressed((p) => {
        const n = new Set(p);
        n.delete(normalizeKey(e.key));
        return n;
      });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const rows = [
    ["ESC","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"],
    ["`","1","2","3","4","5","6","7","8","9","0","-","=","Backspace"],
    ["Tab","Q","W","E","R","T","Y","U","I","O","P","[","]","\\"],
    ["Caps","A","S","D","F","G","H","J","K","L",";","'","Enter"],
    ["Shift","Z","X","C","V","B","N","M",",",".","/","Shift"],
    ["Ctrl","Option","Cmd","Space","Cmd","Option","Ctrl"],
  ];

  const keyWidth = (k: string) => {
    if (k === "Space") return "w-[420px]";
    if (["Backspace", "Enter"].includes(k)) return "w-[120px]";
    if (k === "Shift") return "w-[140px]";
    if (["Tab", "Caps"].includes(k)) return "w-[90px]";
    if (["Ctrl", "Cmd", "Option"].includes(k)) return "w-[80px]";
    if (k.startsWith("F")) return "w-[60px]";
    if (k === "ESC") return "w-[70px]";
    return "w-[56px]";
  };

  return (
    <div
      className="relative"
      style={{ transform: "perspective(2000px) rotateX(45deg)" }}
    >
    
      <div className="absolute inset-0 translate-y-3 bg-gray-900 rounded-3xl" />
      <div className="relative bg-gray-900 rounded-3xl p-6 shadow-2xl">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-3 justify-center mb-3">
            {row.map((k, index) => (
              <KeyButton
                key={`${k}-${i}-${index}`}
                label={k}
                active={pressed.has(k)}
                className={keyWidth(k)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
