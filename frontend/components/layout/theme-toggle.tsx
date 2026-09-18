'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ORDER = ['light', 'dark', 'system'] as const;
type ThemeChoice = (typeof ORDER)[number];

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;
const LABELS = { light: 'Light', dark: 'Dark', system: 'System' } as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server cannot know the stored theme, so the icon renders only once the
  // client has resolved it — otherwise the markup mismatches on hydration.
  useEffect(() => setMounted(true), []);

  const resolved: ThemeChoice = ORDER.includes(theme as ThemeChoice)
    ? (theme as ThemeChoice)
    : 'system';
  // Before mount the stored theme is unknown, so the label has to match what
  // the server rendered — otherwise React reports a hydration mismatch.
  const current: ThemeChoice = mounted ? resolved : 'system';
  const Icon = ICONS[current];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Theme: ${LABELS[current]}. Switch theme.`}
          onClick={() => setTheme(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!)}
        >
          {mounted ? <Icon /> : <span className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{LABELS[current]} theme</TooltipContent>
    </Tooltip>
  );
}
