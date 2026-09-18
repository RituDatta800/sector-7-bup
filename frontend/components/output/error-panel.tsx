'use client';

import { motion } from 'framer-motion';
import { RotateCcw, ServerCrash, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { describeError } from '@/lib/api';
import { revealVariants } from '@/components/motion/variants';

export function ErrorPanel({
  error,
  onRetry,
  onEdit,
  pending,
}: {
  error: unknown;
  onRetry: () => void;
  onEdit: () => void;
  pending?: boolean;
}) {
  const { title, description } = describeError(error);

  return (
    <motion.div variants={revealVariants}>
      <Card className="border-destructive/30 bg-destructive/[0.03] items-start gap-4 p-6 sm:flex-row">
        <span
          aria-hidden
          className="bg-destructive/10 text-destructive grid size-10 shrink-0 place-items-center rounded-lg"
        >
          <ServerCrash className="size-5" />
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-muted-foreground text-xs leading-relaxed break-words">{description}</p>
          <p className="text-subtle-foreground text-[11px] leading-relaxed">
            The console talks to the optimizer through its own route handler. Check that the
            NestJS service is running and that <code className="font-mono">GRIDWISE_API_BASE_URL</code>{' '}
            points at it.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <SlidersHorizontal />
            Edit scenario
          </Button>
          <Button type="button" size="sm" onClick={onRetry} disabled={pending}>
            <RotateCcw />
            Retry
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
