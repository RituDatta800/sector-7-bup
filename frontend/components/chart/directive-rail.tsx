'use client';

import { motion } from 'framer-motion';
import type { DirectiveWindow } from '@/lib/chart-data';
import { directiveLabel, formatHourSet } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PLOT_LEFT_GUTTER, PLOT_RIGHT_GUTTER } from './series';

/**
 * Labelled spans for every directive that constrained the solve, laid out on
 * the same 24-column grid as the plot above. The plot shades the hours; the
 * rail names them — so a window's meaning never depends on decoding a wash of
 * colour behind the marks.
 */
export function DirectiveRail({
  windows,
  className,
}: {
  windows: readonly DirectiveWindow[];
  className?: string;
}) {
  if (windows.length === 0) return null;

  // Stack overlapping windows onto separate lanes so labels never collide.
  const lanes: DirectiveWindow[][] = [];
  for (const window of [...windows].sort((a, b) => a.start - b.start)) {
    const lane = lanes.find((row) => row.every((placed) => placed.end < window.start - 1));
    if (lane) lane.push(window);
    else lanes.push([window]);
  }

  return (
    <div
      className={cn('space-y-[3px]', className)}
      style={{ paddingLeft: PLOT_LEFT_GUTTER, paddingRight: PLOT_RIGHT_GUTTER }}
    >
      {lanes.map((lane, laneIndex) => (
        <div
          key={laneIndex}
          className="grid gap-[2px]"
          style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
        >
          {lane.map((window, index) => (
            <Tooltip key={window.key}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, scaleX: 0.4 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{
                    delay: 0.1 + laneIndex * 0.06 + index * 0.04,
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    gridColumn: `${window.start + 1} / ${window.end + 2}`,
                    transformOrigin: 'left center',
                    background: 'var(--viz-highlight)',
                    borderColor: 'var(--viz-highlight-edge)',
                  }}
                  className="focus-visible:ring-ring flex h-5 cursor-help items-center overflow-hidden rounded-[3px] border px-1.5 outline-none focus-visible:ring-2"
                  tabIndex={0}
                >
                  {/* At phone width a one-hour window truncates to "S…", which
                      reads as noise — the span still maps the window onto the
                      hour scale, and the cards below name it in full. */}
                  <span className="text-foreground/80 hidden truncate text-[10px] leading-none font-medium sm:inline">
                    {directiveLabel(window.directiveType)}
                  </span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-72">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold">
                    {directiveLabel(window.directiveType)}
                  </div>
                  <div className="text-muted-foreground tabular text-[11px]">
                    Note {window.noteIndex + 1} · {formatHourSet(window.hours)}
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-snug">
                    {window.explanation}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  );
}
