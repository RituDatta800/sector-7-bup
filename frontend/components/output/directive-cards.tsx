'use client';

import { motion } from 'framer-motion';
import { BadgeCheck, CircleSlash, Quote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DirectiveInterpretationEntry } from '@/lib/schemas';
import { directiveLabel, formatHourSet, formatKwh, formatPercent } from '@/lib/format';
import { revealVariants } from '@/components/motion/variants';
import { cn } from '@/lib/utils';

/** Renders the structured_adjustment payload for each directive type. */
function AdjustmentChips({ entry }: { entry: DirectiveInterpretationEntry }) {
  const chips: Array<{ label: string; value: string }> = [];

  switch (entry.directive_type) {
    case 'solar_reduction':
      chips.push(
        { label: 'Hours', value: formatHourSet(entry.structured_adjustment.hours) },
        { label: 'Output factor', value: formatPercent(entry.structured_adjustment.factor * 100, 0) },
      );
      break;
    case 'minimum_battery_reserve':
      chips.push(
        { label: 'Hours', value: formatHourSet(entry.structured_adjustment.hours) },
        { label: 'Floor', value: formatKwh(entry.structured_adjustment.minimum_energy_kwh) },
      );
      break;
    case 'max_grid_window':
      chips.push(
        { label: 'Hours', value: formatHourSet(entry.structured_adjustment.hours) },
        { label: 'Cap', value: `${formatKwh(entry.structured_adjustment.max_grid_kwh)}/h` },
      );
      break;
    case 'no_charge_window':
    case 'no_discharge_window':
      chips.push({ label: 'Hours', value: formatHourSet(entry.structured_adjustment.hours) });
      break;
    case 'no_op':
      break;
  }

  if (chips.length === 0) return null;

  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1.5">
      {chips.map((chip) => (
        <div key={chip.label} className="flex items-baseline gap-1.5">
          <dt className="text-subtle-foreground text-[10px] tracking-wide uppercase">
            {chip.label}
          </dt>
          <dd className="tabular text-[11px] font-medium">{chip.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * How the LLM read each note, and whether the guardrail layer let it through.
 *
 * A rejected note is as important as an accepted one — it is the difference
 * between "the system ignored me" and "the system understood me and refused",
 * so `applies: false` gets the same real estate.
 */
export function DirectiveCards({
  entries,
  notes,
  className,
}: {
  entries: readonly DirectiveInterpretationEntry[];
  notes: readonly string[];
  className?: string;
}) {
  const applied = entries.filter((entry) => entry.applies).length;

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          Directive interpretation
          <Badge variant={applied > 0 ? 'good' : 'outline'}>
            {applied} of {entries.length} applied
          </Badge>
        </CardTitle>
        <CardDescription>
          Each operator note, as parsed into a structured constraint and checked by the guardrail
          layer before it reached the solver.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-0">
        {entries.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">
            The optimizer returned no directive interpretations.
          </p>
        ) : null}

        {entries.map((entry, index) => {
          const note = notes[entry.note_index];
          const rejected = !entry.applies;

          return (
            <motion.div
              key={`${entry.note_index}-${entry.directive_type}-${index}`}
              variants={revealVariants}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                rejected ? 'bg-muted/40' : 'bg-card',
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="tabular">
                    Note {entry.note_index + 1}
                  </Badge>
                  <Badge variant={rejected ? 'secondary' : 'default'}>
                    {directiveLabel(entry.directive_type)}
                  </Badge>
                </span>
                <span
                  className="flex shrink-0 items-center gap-1 text-[11px] font-medium"
                  style={{ color: rejected ? 'var(--subtle-foreground)' : 'var(--status-good)' }}
                >
                  {rejected ? (
                    <CircleSlash className="size-3.5" aria-hidden />
                  ) : (
                    <BadgeCheck className="size-3.5" aria-hidden />
                  )}
                  {rejected ? 'Not applied' : 'Applied'}
                </span>
              </div>

              {note ? (
                <p className="text-muted-foreground mb-2 flex gap-1.5 text-[11px] leading-snug italic">
                  <Quote className="mt-0.5 size-3 shrink-0 opacity-50" aria-hidden />
                  {note}
                </p>
              ) : null}

              <AdjustmentChips entry={entry} />

              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                {entry.explanation}
              </p>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
