'use client';

import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquareText, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MAX_OPERATOR_NOTES, type ScenarioFormValues } from '@/lib/schemas';
import { NOTE_SUGGESTIONS } from '@/lib/presets';
import { EASE_OUT, SPRING_SOFT } from '@/components/motion/variants';

const NOTE_LIMIT = 240;

/**
 * Free-text operator notes — the natural-language half of the request.
 *
 * The contract caps these at three; the UI makes that ceiling visible rather
 * than rejecting a fourth note after the fact.
 */
export function OperatorNotes({ disabled }: { disabled?: boolean }) {
  const { control, register, formState } = useFormContext<ScenarioFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'operator_notes' });
  const notes = useWatch({ control, name: 'operator_notes' });

  const canAdd = fields.length < MAX_OPERATOR_NOTES;
  const rootError = formState.errors.operator_notes?.root ?? formState.errors.operator_notes;

  function appendSuggestion(suggestion: string) {
    const firstEmpty = (notes ?? []).findIndex((note) => !note?.value?.trim());

    if (firstEmpty >= 0) {
      // Replacing through the field array keeps RHF's dirty state coherent.
      remove(firstEmpty);
      append({ value: suggestion });
      return;
    }

    if (canAdd) append({ value: suggestion });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <MessageSquareText className="size-3.5" />
          Operator notes
        </span>
        <Badge variant={canAdd ? 'outline' : 'warning'}>
          {fields.length}/{MAX_OPERATOR_NOTES}
        </Badge>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence initial={false} mode="popLayout">
          {fields.map((field, index) => {
            const value = notes?.[index]?.value ?? '';
            const fieldError = formState.errors.operator_notes?.[index]?.value;

            return (
              <motion.div
                key={field.id}
                layout
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 12, scale: 0.97, transition: EASE_OUT }}
                transition={SPRING_SOFT}
                className="group relative"
              >
                <div className="text-subtle-foreground mb-1 flex items-center justify-between text-[10px]">
                  <span className="font-medium tracking-wide uppercase">Note {index + 1}</span>
                  <span className="tabular">
                    {value.length}/{NOTE_LIMIT}
                  </span>
                </div>

                <Textarea
                  rows={2}
                  maxLength={NOTE_LIMIT}
                  disabled={disabled}
                  placeholder={
                    index === 0
                      ? 'e.g. Reduce solar to 20% from 1 PM to 3 PM for panel cleaning.'
                      : 'Add another instruction, or leave blank.'
                  }
                  aria-label={`Operator note ${index + 1}`}
                  aria-invalid={Boolean(fieldError) || undefined}
                  className="min-h-[68px] resize-none pr-9 text-[13px] leading-relaxed"
                  {...register(`operator_notes.${index}.value`)}
                />

                {fields.length > 1 ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => remove(index)}
                    aria-label={`Remove note ${index + 1}`}
                    className="text-subtle-foreground hover:text-destructive absolute top-5 right-1"
                  >
                    <X />
                  </Button>
                ) : null}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {rootError?.message ? (
        <p className="text-destructive text-[11px]">{rootError.message}</p>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || !canAdd}
        onClick={() => append({ value: '' })}
        className="w-full"
      >
        <Plus />
        Add note
      </Button>

      <div className="space-y-1.5 border-t pt-3">
        <span className="text-subtle-foreground flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase">
          <Sparkles className="size-3" />
          Try one
        </span>
        <div className="flex flex-wrap gap-1.5">
          {NOTE_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => appendSuggestion(suggestion)}
              className="border-border text-muted-foreground hover:border-ring hover:text-foreground focus-visible:ring-ring/40 max-w-full truncate rounded-full border px-2.5 py-1 text-[11px] transition-colors outline-none focus-visible:ring-[3px] disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
