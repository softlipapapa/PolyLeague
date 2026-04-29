"use client";

import { useState, useEffect, useRef } from "react";

interface SelectOption<T extends string> {
  value: T;
  label: string;
  color?: string;
  icon?: string;
}

interface SelectDropdownProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
}

export default function SelectDropdown<T extends string>({
  label,
  value,
  onChange,
  options,
}: SelectDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="mb-4" ref={ref}>
      <label className="block text-xs text-white/40 mb-1.5 font-medium">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg transition-all cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5">
            {selected?.icon ? (
              <img src={selected.icon} alt="" className="w-5 h-5 rounded-full shrink-0" />
            ) : selected?.color ? (
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: selected.color }}
              />
            ) : null}
            <span className="text-sm text-white/90">
              {selected?.label || "Select..."}
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-white/30 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-gray-900/98 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-white/8 transition-colors ${
                  opt.value === value
                    ? "bg-white/5 text-white"
                    : "text-white/60"
                }`}
              >
                {opt.icon ? (
                  <img src={opt.icon} alt="" className="w-5 h-5 rounded-full shrink-0" />
                ) : opt.color ? (
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                ) : null}
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
