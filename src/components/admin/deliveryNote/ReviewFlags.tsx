import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NoteFlag } from '@/lib/deliveryNote/types';

// The review gate. Every flag is on the page in full — none of this is hidden
// behind a tooltip, because a flag nobody reads is the same as no flag.

interface Props {
  flags: NoteFlag[];
  acknowledged: Set<string>;
  onAcknowledge: (id: string, value: boolean) => void;
}

const ReviewFlags: React.FC<Props> = ({ flags, acknowledged, onAcknowledge }) => {
  if (!flags.length) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 flex items-start gap-2 text-emerald-900">
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="text-sm">
          <div className="font-medium">Nothing to check</div>
          <div className="text-xs">Every rule passed against what was read off the invoice.</div>
        </div>
      </div>
    );
  }

  const blocking = flags.filter((f) => f.severity === 'blocking');
  const review = flags.filter((f) => f.severity === 'review');
  const outstanding = review.filter((f) => !acknowledged.has(f.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {blocking.length > 0 && (
          <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 font-medium">
            {blocking.length} blocking
          </span>
        )}
        {review.length > 0 && (
          <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 font-medium">
            {outstanding.length} of {review.length} to acknowledge
          </span>
        )}
      </div>

      {blocking.map((flag) => (
        <div key={flag.id} className="rounded-lg border-2 border-red-400 bg-red-50 p-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-red-900">{flag.title}</div>
              <p className="text-xs text-red-800 mt-1 break-words">{flag.detail}</p>
              <p className="text-[11px] text-red-700 mt-1.5 italic">
                This one cannot be acknowledged — fix the field above.
              </p>
            </div>
          </div>
        </div>
      ))}

      {review.map((flag) => {
        const done = acknowledged.has(flag.id);
        return (
          <div
            key={flag.id}
            className={`rounded-lg border-2 p-3 ${done ? 'border-emerald-300 bg-emerald-50' : 'border-amber-400 bg-amber-50'}`}
          >
            <div className="flex items-start gap-2">
              {done
                ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />}
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${done ? 'text-emerald-900' : 'text-amber-900'}`}>
                  {flag.title}
                </div>
                <p className={`text-xs mt-1 break-words ${done ? 'text-emerald-800' : 'text-amber-900'}`}>
                  {flag.detail}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={done ? 'outline' : 'secondary'}
                  // This is the gate itself, tapped on a phone — sized to be hit
                  // deliberately, and never smaller than the surrounding text.
                  className="mt-2 h-9 sm:h-8 text-xs"
                  onClick={() => onAcknowledge(flag.id, !done)}
                >
                  {done ? 'Undo acknowledgement' : 'Acknowledge and ship anyway'}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReviewFlags;
