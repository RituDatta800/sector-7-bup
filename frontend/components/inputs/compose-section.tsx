'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFormContext, useWatch } from 'react-hook-form';
import { AlertTriangle, Braces, Grid3x3, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { OptimizeEnergyRequest, ScenarioFormValues } from '@/lib/schemas';
import type { ScenarioPreset } from '@/lib/presets';
import {
  CARD_HOVER,
  sectionVariants,
  stackStepVariants,
  tabSwapVariants,
} from '@/components/motion/variants';
import { cn } from '@/lib/utils';
import { BatteryPanel } from './battery-panel';
import { HourGrid } from './hour-grid';
import { JsonEditor } from './json-editor';
import { OperatorNotes } from './operator-notes';
import { ScenarioPresets } from './scenario-presets';

/**
 * Best-effort serialisation of live form state for the JSON tab.
 *
 * Deliberately does not go through the wire schema: the editor has to be able
 * to show a half-typed scenario, and NaN is more useful on screen than a thrown
 * parse error.
 */
function toDraftRequest(values: ScenarioFormValues): OptimizeEnergyRequest {
  return {
    scenario_id: values.scenario_id,
    operator_notes: values.operator_notes
      .map((note) => note.value?.trim() ?? '')
      .filter((note) => note.length > 0),
    hours: values.hours.map((hour, index) => ({
      hour: index,
      demand_kwh: hour.demand_kwh,
      solar_kwh: hour.solar_kwh,
      tariff_bdt_per_kwh: hour.tariff_bdt_per_kwh,
    })),
    battery: values.battery,
  };
}

/** Numbered marker that gives the stack its top-to-bottom reading order. */
function StepBadge({ step, active }: { step: number; active?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold tabular-nums transition-colors duration-300',
        active
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'text-muted-foreground bg-card',
      )}
    >
      {step}
    </span>
  );
}

function StepCard({
  step,
  title,
  description,
  action,
  children,
}: {
  step: number;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={stackStepVariants}
      whileHover={CARD_HOVER}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative"
    >
      <Card
        className={cn(
          'overflow-hidden transition-shadow duration-300',
          hovered ? 'shadow-lg' : 'shadow-xs',
        )}
      >
        {/* Accent rail that fills in as the step is engaged. */}
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-0 w-0.5 origin-top"
          style={{ background: 'var(--primary)' }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />

        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <StepBadge step={step} active={hovered} />
            {title}
          </CardTitle>
          <CardDescription className="pl-[34px]">{description}</CardDescription>
          {action ? <div className="pt-1 pl-[34px]">{action}</div> : null}
        </CardHeader>

        <CardContent className="space-y-4 pt-4">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

export interface ComposeSectionProps {
  pending: boolean;
  activePresetId: string | null;
  onPresetSelect: (preset: ScenarioPreset) => void;
  onJsonApply: (request: OptimizeEnergyRequest) => void;
}

export function ComposeSection({
  pending,
  activePresetId,
  onPresetSelect,
  onJsonApply,
}: ComposeSectionProps) {
  const { register, control, formState } = useFormContext<ScenarioFormValues>();
  const values = useWatch({ control }) as ScenarioFormValues;
  const [editor, setEditor] = useState<'grid' | 'json'>('grid');

  const draft = useMemo(() => toDraftRequest(values), [values]);

  const errorCount = Object.keys(formState.errors).length;
  const scenarioIdError = formState.errors.scenario_id?.message;
  const hoursError =
    typeof formState.errors.hours?.message === 'string' ? formState.errors.hours.message : null;

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex justify-center"
    >
      {/* The input column holds ~30% of the page and stacks its three steps. */}
      <div className="w-full max-w-[560px] min-w-0 space-y-4 lg:w-[30%] lg:min-w-[400px]">
        {/* -------------------------------------------------------------- */}
        {/* Step 1 — structured scenario data                               */}
        {/* -------------------------------------------------------------- */}
        <StepCard
          step={1}
          title="Data input"
          description="Twenty-four hours of demand, on-site generation and tariff, plus the battery the solver may move energy through."
          action={
            <ScenarioPresets
              activeId={activePresetId}
              onSelect={onPresetSelect}
              disabled={pending}
            />
          }
        >
          <div className="space-y-1.5">
            <Label htmlFor="scenario_id" className="text-subtle-foreground">
              Scenario ID
            </Label>
            <Input
              id="scenario_id"
              disabled={pending}
              aria-invalid={Boolean(scenarioIdError) || undefined}
              className="h-8 font-mono text-xs"
              {...register('scenario_id')}
            />
            {scenarioIdError ? (
              <p className="text-destructive text-[10px]">{scenarioIdError}</p>
            ) : null}
          </div>

          <Tabs value={editor} onValueChange={(next) => setEditor(next as 'grid' | 'json')}>
            <TabsList className="w-full">
              <TabsTrigger value="grid">
                <Grid3x3 /> Hourly grid
              </TabsTrigger>
              <TabsTrigger value="json">
                <Braces /> JSON
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={editor}
              variants={tabSwapVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {editor === 'grid' ? (
                <>
                  <HourGrid />
                  {hoursError ? (
                    <p className="text-destructive mt-2 text-[11px]">{hoursError}</p>
                  ) : null}
                </>
              ) : (
                <JsonEditor current={draft} onApply={onJsonApply} disabled={pending} />
              )}
            </motion.div>
          </AnimatePresence>

          <Separator />

          <BatteryPanel />
        </StepCard>

        {/* -------------------------------------------------------------- */}
        {/* Step 2 — natural-language operator notes                        */}
        {/* -------------------------------------------------------------- */}
        <StepCard
          step={2}
          title="Normal language input"
          description="Up to three instructions in plain language. Each is interpreted into a structured directive and guardrailed before the solver sees it."
        >
          <OperatorNotes disabled={pending} />
        </StepCard>

        {/* -------------------------------------------------------------- */}
        {/* Step 3 — submit                                                 */}
        {/* -------------------------------------------------------------- */}
        <motion.div variants={stackStepVariants} className="space-y-2.5">
          <AnimatePresence initial={false}>
            {errorCount > 0 ? (
              <motion.p
                key="errors"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-destructive flex items-center justify-center gap-1.5 overflow-hidden text-[11px]"
              >
                <AlertTriangle className="size-3.5" />
                {errorCount === 1
                  ? 'One field needs attention before this can be solved.'
                  : `${errorCount} groups of fields need attention before this can be solved.`}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <motion.div
            whileHover={pending ? undefined : { scale: 1.015 }}
            whileTap={pending ? undefined : { scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          >
            <Button
              type="submit"
              size="xl"
              disabled={pending}
              className="relative w-full overflow-hidden shadow-md"
            >
              {/* Sheen that sweeps the button while it is idle. */}
              {!pending ? (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 w-1/3"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
                  }}
                  animate={{ x: ['-140%', '440%'] }}
                  transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
                />
              ) : null}
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Optimizing…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Optimize Energy
                </>
              )}
            </Button>
          </motion.div>

          <p className="text-subtle-foreground text-center text-[11px] leading-relaxed">
            Sends the scenario and notes to <code className="font-mono">POST /optimize-energy</code>.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
