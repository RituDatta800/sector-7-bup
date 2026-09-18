'use client';

import { motion } from 'framer-motion';
import { FileText, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChartRow, DirectiveWindow, PlanTotals } from '@/lib/chart-data';
import type { OptimizeEnergyResponse } from '@/lib/schemas';
import { revealVariants, sectionVariants } from '@/components/motion/variants';
import { DirectiveCards } from './directive-cards';
import { PlanTable } from './plan-table';
import { SummaryStats } from './summary-stats';

export interface ResultsPanelProps {
  response: OptimizeEnergyResponse;
  notes: readonly string[];
  optimizedRows: readonly ChartRow[];
  baselineRows: readonly ChartRow[];
  optimizedTotals: PlanTotals;
  baselineTotals: PlanTotals;
  directiveWindows: readonly DirectiveWindow[];
  onEdit: () => void;
}

/**
 * Everything the solve produced, revealed beneath the chart once it has settled
 * into its pinned position. Children stagger in so the eye lands on the
 * headline numbers first and the detail arrives behind them.
 */
export function ResultsPanel({
  response,
  notes,
  optimizedRows,
  baselineRows,
  optimizedTotals,
  baselineTotals,
  directiveWindows,
  onEdit,
}: ResultsPanelProps) {
  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-4"
    >
      <SummaryStats optimized={optimizedTotals} baseline={baselineTotals} />

      <motion.div variants={revealVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-3.5" />
              Plan summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-[13px] leading-relaxed">
              {response.plan_summary}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <motion.div variants={revealVariants}>
          <DirectiveCards entries={response.directive_interpretation} notes={notes} />
        </motion.div>

        <motion.div variants={revealVariants}>
          <PlanTable
            rows={optimizedRows}
            baselineRows={baselineRows}
            directiveWindows={directiveWindows}
            scenarioId={response.scenario_id}
          />
        </motion.div>
      </div>

      <motion.div variants={revealVariants} className="flex justify-center pt-1">
        <Button type="button" variant="outline" size="lg" onClick={onEdit}>
          <SlidersHorizontal />
          Adjust scenario and re-run
        </Button>
      </motion.div>
    </motion.div>
  );
}
