'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api';

interface ComboBoxProps {
  field: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function ComboBox({ field, value, onChange, placeholder }: ComboBoxProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.getTovaryMappingSuggestions(field, q);
        setSuggestions(res.values);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [field]);

  // Load all options on focus
  const handleFocus = () => {
    fetchSuggestions(value);
    setOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    fetchSuggestions(e.target.value);
    setOpen(true);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = value
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
    : suggestions;

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        className="w-full border border-indigo-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-400 focus:outline-none"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (filtered.length > 0 || loading) && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto text-sm">
          {loading && (
            <li className="px-3 py-2 text-gray-400 text-xs">Загрузка...</li>
          )}
          {!loading && filtered.map((s, i) => (
            <li
              key={i}
              className="px-3 py-1.5 hover:bg-indigo-50 cursor-pointer text-gray-700 truncate"
              onMouseDown={() => handleSelect(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
