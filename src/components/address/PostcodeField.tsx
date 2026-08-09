import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import {
  autocompletePostcode,
  coverageForPostcode,
  lookupPostcode,
  prettyPostcode,
  type Coverage,
  type PostcodeDetails,
} from '@/utils/addressLookup';

interface PostcodeFieldProps {
  value: string;
  onChange: (postcode: string) => void;
  /**
   * Fired once a postcode resolves to a real place. Used to auto-fill the town
   * and to bias address suggestions to the right part of the country.
   */
  onResolved?: (details: PostcodeDetails | null) => void;
  /** Fired whenever the coverage verdict changes, so the parent can gate. */
  onCoverageChange?: (coverage: Coverage) => void;
  label?: string;
  id?: string;
  hint?: string;
}

/**
 * Postcode entry with live completion and a coverage verdict.
 *
 * The postcode is the field that decides whether we collect from an address, so
 * the verdict is shown here rather than being buried in a later step.
 */
const PostcodeField: React.FC<PostcodeFieldProps> = ({
  value,
  onChange,
  onResolved,
  onCoverageChange,
  label = 'Postcode',
  id = 'postcode',
  hint,
}) => {
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [details, setDetails] = useState<PostcodeDetails | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const coverage = coverageForPostcode(value);

  // Report the verdict upward without making the parent a dependency of the
  // effect (which would re-fire on every parent render).
  const coverageRef = useRef<string>('');
  useEffect(() => {
    const key = `${coverage.status}:${coverage.route ?? ''}`;
    if (coverageRef.current === key) return;
    coverageRef.current = key;
    onCoverageChange?.(coverage);
  }, [coverage, onCoverageChange]);

  // Debounced completion + full lookup. 350ms is short enough to feel live and
  // long enough to keep us well inside the free services' rate limits.
  useEffect(() => {
    const clean = value.replace(/\s/g, '');
    if (clean.length < 2) {
      setOptions([]);
      setDetails(null);
      onResolved?.(null);
      return;
    }

    let cancelled = false;
    setChecking(true);
    const timer = setTimeout(async () => {
      const [completions, resolved] = await Promise.all([
        autocompletePostcode(value),
        clean.length >= 5 ? lookupPostcode(value) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setOptions(completions);
      setDetails(resolved);
      onResolved?.(resolved);
      setChecking(false);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setChecking(false);
    };
    // onResolved is intentionally omitted: callers pass inline closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close the suggestion list on an outside click.
  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  const showList = open && options.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          autoComplete="postal-code"
          placeholder="e.g. LU1 3XX"
          value={value}
          onChange={(event) => {
            onChange(event.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pr-9"
        />
        {checking && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {showList && (
        <ul className="absolute z-30 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 shadow-lg">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={() => {
                  onChange(prettyPostcode(option));
                  setOpen(false);
                }}
              >
                <MapPin className="h-3.5 w-3.5 text-zim-green flex-shrink-0" />
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}

      {details && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {details.town}
          {details.country ? `, ${details.country}` : ''}
        </p>
      )}
      {!details && hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}

      {coverage.status !== 'unknown' && (
        <div
          className={`mt-2 flex items-start gap-2 rounded-md p-2.5 text-xs ${
            coverage.status === 'covered'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
              : coverage.status === 'not_covered'
                ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
          }`}
        >
          {coverage.status === 'covered' ? (
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          ) : coverage.status === 'not_covered' ? (
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          ) : (
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          )}
          <span>{coverage.message}</span>
        </div>
      )}
    </div>
  );
};

export default PostcodeField;
