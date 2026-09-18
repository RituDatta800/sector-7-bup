'use client';

import { useState } from 'react';
import { AlertTriangle, Check, ClipboardPaste, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { optimizeEnergyRequestSchema, type OptimizeEnergyRequest } from '@/lib/schemas';

/**
 * Raw-payload tab: paste a captured /optimize-energy request body and have it
 * validated against the same schema the wire uses before it touches form state.
 * Failures are reported per field path rather than as one opaque "invalid JSON".
 */
export function JsonEditor({
  current,
  onApply,
  disabled,
}: {
  current: OptimizeEnergyRequest;
  onApply: (request: OptimizeEnergyRequest) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(() => JSON.stringify(current, null, 2));
  const [issues, setIssues] = useState<string[]>([]);
  const [applied, setApplied] = useState(false);

  function loadCurrent() {
    setText(JSON.stringify(current, null, 2));
    setIssues([]);
    setApplied(false);
  }

  function apply() {
    setApplied(false);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      setIssues([error instanceof Error ? error.message : 'The text is not valid JSON.']);
      return;
    }

    const result = optimizeEnergyRequestSchema.safeParse(parsed);

    if (!result.success) {
      setIssues(
        result.error.issues
          .slice(0, 8)
          .map((issue) => `${issue.path.join('.') || 'payload'} — ${issue.message}`),
      );
      return;
    }

    setIssues([]);
    setApplied(true);
    onApply(result.data);
  }

  return (
    <div className="space-y-2.5">
      <Textarea
        spellCheck={false}
        value={text}
        disabled={disabled}
        onChange={(event) => {
          setText(event.target.value);
          setApplied(false);
        }}
        aria-label="Scenario request payload as JSON"
        aria-invalid={issues.length > 0 || undefined}
        className="h-[302px] resize-none overflow-auto font-mono text-[11px] leading-relaxed"
      />

      {issues.length > 0 ? (
        <div className="border-destructive/30 bg-destructive/5 space-y-1 rounded-md border p-2.5">
          <span className="text-destructive flex items-center gap-1.5 text-[11px] font-medium">
            <AlertTriangle className="size-3.5" />
            {issues.length} problem{issues.length > 1 ? 's' : ''} in the payload
          </span>
          <ul className="text-destructive/90 space-y-0.5 text-[11px] leading-snug">
            {issues.map((issue) => (
              <li key={issue} className="font-mono">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={apply} disabled={disabled}>
          {applied ? <Check /> : <ClipboardPaste />}
          {applied ? 'Applied' : 'Apply to form'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={loadCurrent} disabled={disabled}>
          <Download />
          Reload from form
        </Button>
      </div>
    </div>
  );
}
