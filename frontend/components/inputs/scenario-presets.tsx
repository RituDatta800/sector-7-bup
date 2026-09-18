'use client';

import { Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SCENARIO_PRESETS, type ScenarioPreset } from '@/lib/presets';
import { cn } from '@/lib/utils';

export function ScenarioPresets({
  activeId,
  onSelect,
  disabled,
}: {
  activeId: string | null;
  onSelect: (preset: ScenarioPreset) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-subtle-foreground mr-0.5 flex items-center gap-1 text-[11px]">
        <Layers className="size-3" />
        Presets
      </span>
      {SCENARIO_PRESETS.map((preset) => (
        <Tooltip key={preset.id}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant={activeId === preset.id ? 'secondary' : 'ghost'}
              disabled={disabled}
              onClick={() => onSelect(preset)}
              className={cn(
                'h-7 px-2.5 text-[11px]',
                activeId === preset.id && 'ring-border ring-1',
              )}
            >
              {preset.name}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-56">
            {preset.blurb}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
