import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Home } from 'lucide-react';
import { searchAddresses, type AddressSuggestion } from '@/utils/addressLookup';

interface AddressSearchFieldProps {
  value: string;
  onChange: (line1: string) => void;
  /** Fired when a suggestion is picked, so town/postcode can be filled too. */
  onSelect?: (suggestion: AddressSuggestion) => void;
  /** Coordinates to bias results towards — usually from the typed postcode. */
  near?: { latitude: number; longitude: number } | null;
  label?: string;
  id?: string;
  placeholder?: string;
  hint?: string;
}

/**
 * Free-text address search over OpenStreetMap, biased to the customer's
 * postcode when one has been entered. Typing an address by hand still works —
 * suggestions are a shortcut, never a requirement.
 */
const AddressSearchField: React.FC<AddressSearchFieldProps> = ({
  value,
  onChange,
  onSelect,
  near,
  label = 'Address',
  id = 'address',
  placeholder = 'Start typing your street…',
  hint,
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  // A pick shouldn't immediately re-trigger a search for the text it just set.
  const justPickedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (justPickedRef.current) {
      justPickedRef.current = false;
      return;
    }
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchAddresses(value, { near });
      if (cancelled) return;
      setSuggestions(results);
      setSearching(false);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setSearching(false);
    };
  }, [value, near]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  const showList = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          id={id}
          autoComplete="address-line1"
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9 pr-9"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {showList && (
        <ul className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 shadow-lg">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.label}-${index}`}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start gap-2"
                onClick={() => {
                  justPickedRef.current = true;
                  onChange(suggestion.line1);
                  onSelect?.(suggestion);
                  setOpen(false);
                }}
              >
                <Home className="h-3.5 w-3.5 text-zim-green mt-1 flex-shrink-0" />
                <span className="text-sm">
                  <span className="block font-medium">{suggestion.line1}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {[suggestion.town, suggestion.postcode].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
    </div>
  );
};

export default AddressSearchField;
