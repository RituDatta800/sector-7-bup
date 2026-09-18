'use client';

import { motion } from 'framer-motion';
import { Brain, ShieldCheck, Sigma } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { revealVariants } from '@/components/motion/variants';

const PIPELINE = [
  {
    id: 'interpret',
    icon: Brain,
    title: 'Interpreting notes',
    detail: 'An LLM turns each operator note into a candidate structured directive.',
  },
  {
    id: 'guardrails',
    icon: ShieldCheck,
    title: 'Applying guardrails',
    detail: 'Deterministic checks reject anything structurally or physically invalid.',
  },
  {
    id: 'solve',
    icon: Sigma,
    title: 'Solving the schedule',
    detail: 'A linear program minimises cost across 24 hours under every surviving constraint.',
  },
] as const;

/**
 * Shown between submit and response.
 *
 * These are the stages the request passes through, not a measured progress bar
 * — the endpoint is a single call with no progress channel, so nothing here
 * claims to know how far along it is.
 */
export function SolvingPanel() {
  return (
    <motion.div variants={revealVariants} className="space-y-4">
      <Card className="overflow-hidden">
        <div className="relative">
          <motion.span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, var(--primary), transparent)',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className="divide-y">
          {PIPELINE.map((stage, index) => (
            <div key={stage.id} className="flex items-start gap-3 px-5 py-4">
              <motion.span
                aria-hidden
                className="bg-primary/10 text-primary mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: index * 0.45,
                  ease: 'easeInOut',
                }}
              >
                <stage.icon className="size-4" />
              </motion.span>

              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm font-medium">{stage.title}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{stage.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="gap-3 p-4">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-2.5 w-32" />
          </Card>
        ))}
      </div>

      <p className="text-subtle-foreground text-center text-[11px]" role="status" aria-live="polite">
        Waiting for the optimizer…
      </p>
    </motion.div>
  );
}
