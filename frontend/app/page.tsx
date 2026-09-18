'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ChartStage, type ChartView } from '@/components/chart/chart-stage';
import { ComposeSection } from '@/components/inputs/compose-section';
import { ErrorPanel } from '@/components/output/error-panel';
import { ResultsPanel } from '@/components/output/results-panel';
import { SolvingPanel } from '@/components/output/solving-panel';

import { useOptimizeEnergy } from '@/hooks/use-optimize-energy';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { describeError } from '@/lib/api';
import {
  buildBaselineRows,
  buildOptimizedRows,
  chartLowerBound,
  chartUpperBound,
  computeTotals,
  extractDirectiveWindows,
  totalsFromResponse,
  type ChartRow,
} from '@/lib/chart-data';
import { DEFAULT_PRESET, SCENARIO_PRESETS, type ScenarioPreset } from '@/lib/presets';
import {
  scenarioFormSchema,
  toFormValues,
  toRequestPayload,
  type OptimizeEnergyRequest,
  type ScenarioFormValues,
} from '@/lib/schemas';
import { formatBdt } from '@/lib/format';
import type { Stage } from '@/components/motion/variants';

/** Non-finite values are a half-typed field, not data — they plot as zero. */
function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Live form state → a request shape safe to preview, even mid-edit. */
function toPreviewRequest(values: ScenarioFormValues): OptimizeEnergyRequest {
  return {
    scenario_id: values.scenario_id || 'scenario',
    operator_notes: [],
    hours: (values.hours ?? []).map((hour, index) => ({
      hour: index,
      demand_kwh: finite(hour?.demand_kwh),
      solar_kwh: finite(hour?.solar_kwh),
      tariff_bdt_per_kwh: finite(hour?.tariff_bdt_per_kwh),
    })),
    battery: {
      capacity_kwh: Math.max(1, finite(values.battery?.capacity_kwh)),
      initial_energy_kwh: finite(values.battery?.initial_energy_kwh),
      minimum_energy_kwh: finite(values.battery?.minimum_energy_kwh),
      max_charge_kwh_per_hour: Math.max(1, finite(values.battery?.max_charge_kwh_per_hour)),
      max_discharge_kwh_per_hour: Math.max(1, finite(values.battery?.max_discharge_kwh_per_hour)),
    },
  };
}

export default function DashboardPage() {
  const reduceMotion = useReducedMotion();

  const [stage, setStage] = useState<Stage>('compose');
  const [view, setView] = useState<ChartView>('baseline');
  /** The exact payload behind the plotted result — not the live form state. */
  const [solvedRequest, setSolvedRequest] = useState<OptimizeEnergyRequest | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const form = useForm<ScenarioFormValues>({
    resolver: zodResolver(scenarioFormSchema),
    defaultValues: toFormValues(DEFAULT_PRESET.request),
    mode: 'onBlur',
  });

  const mutation = useOptimizeEnergy({
    onSuccess: (response) => {
      setStage('result');
      setView('optimized');
      toast.success('Schedule optimized', {
        description: `${response.scenario_id} · ${formatBdt(response.total_cost_bdt)} across 24 hours.`,
      });
    },
    onError: (error) => {
      const { title, description } = describeError(error);
      toast.error(title, { description });
    },
  });

  /* ---------------------------------------------------------------------- */
  /* Chart data                                                              */
  /* ---------------------------------------------------------------------- */

  const liveValues = useWatch({ control: form.control }) as ScenarioFormValues;
  const debouncedValues = useDebouncedValue(liveValues, 280);

  const previewRequest = useMemo(
    () => toPreviewRequest(debouncedValues),
    [debouncedValues],
  );

  /** The scenario the chart describes: the solved one if there is one. */
  const chartRequest = solvedRequest ?? previewRequest;

  const baselineRows = useMemo(() => buildBaselineRows(chartRequest), [chartRequest]);

  const optimizedRows = useMemo<ChartRow[] | null>(() => {
    if (!mutation.data || !solvedRequest) return null;
    return buildOptimizedRows(solvedRequest, mutation.data);
  }, [mutation.data, solvedRequest]);

  const directiveWindows = useMemo(
    () => extractDirectiveWindows(mutation.data),
    [mutation.data],
  );

  const hasResult = Boolean(mutation.data && optimizedRows);
  const displayRows = hasResult && view === 'optimized' ? optimizedRows! : baselineRows;

  /**
   * One y-domain spanning both datasets, so the axis holds still while the
   * marks travel from the baseline plan to the optimized one.
   */
  const yDomain = useMemo<[number, number]>(() => {
    const all = optimizedRows ? [...baselineRows, ...optimizedRows] : baselineRows;
    return [chartLowerBound(all), chartUpperBound(all)];
  }, [baselineRows, optimizedRows]);

  const baselineTotals = useMemo(() => computeTotals(baselineRows), [baselineRows]);
  const optimizedTotals = useMemo(
    () =>
      mutation.data && optimizedRows ? totalsFromResponse(mutation.data, optimizedRows) : null,
    [mutation.data, optimizedRows],
  );

  const solvedNotes = solvedRequest?.operator_notes ?? [];

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                 */
  /* ---------------------------------------------------------------------- */

  const activePresetId = useMemo(() => {
    const match = SCENARIO_PRESETS.find((preset) => preset.id === liveValues?.scenario_id);
    return match?.id ?? null;
  }, [liveValues?.scenario_id]);

  const applyPreset = useCallback(
    (preset: ScenarioPreset) => {
      form.reset(toFormValues(preset.request));
      toast.info(`Loaded “${preset.name}”`, { description: preset.blurb });
    },
    [form],
  );

  const applyJson = useCallback(
    (request: OptimizeEnergyRequest) => {
      form.reset(
        toFormValues({
          ...request,
          // The form always keeps at least one note row, even for an empty list.
          operator_notes: request.operator_notes.length > 0 ? request.operator_notes : [''],
        }),
      );
      toast.success('Payload applied to the form');
    },
    [form],
  );

  const backToCompose = useCallback(() => {
    setStage('compose');
    setView('baseline');
    setSolvedRequest(null);
    mutation.reset();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [mutation, reduceMotion]);

  const onSubmit = form.handleSubmit(
    (values) => {
      const payload = toRequestPayload(values);
      setSolvedRequest(payload);
      setView('optimized');
      setStage('solving');
      mutation.mutate({ payload });
    },
    () => {
      toast.error('Scenario is incomplete', {
        description: 'Fix the highlighted fields before running the optimizer.',
      });
    },
  );

  const retry = useCallback(() => {
    if (solvedRequest) mutation.mutate({ payload: solvedRequest });
  }, [mutation, solvedRequest]);

  // Bring the chart into view as it swings up, so the transition is actually seen.
  useEffect(() => {
    if (stage === 'solving') {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }, [stage, reduceMotion]);

  const panel: 'compose' | 'solving' | 'error' | 'result' =
    stage === 'compose'
      ? 'compose'
      : mutation.isPending
        ? 'solving'
        : mutation.isError
          ? 'error'
          : 'result';

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6">
        <FormProvider {...form}>
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div ref={stageRef}>
              <ChartStage
                stage={stage}
                scenarioId={chartRequest.scenario_id}
                rows={displayRows}
                baselineRows={baselineRows}
                directiveWindows={view === 'optimized' ? directiveWindows : []}
                capacityKwh={chartRequest.battery.capacity_kwh}
                yDomain={yDomain}
                hasResult={hasResult}
                view={view}
                onViewChange={setView}
                animationMs={stage === 'compose' ? 380 : 900}
              />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {panel === 'compose' ? (
                <ComposeSection
                  key="compose"
                  pending={mutation.isPending}
                  activePresetId={activePresetId}
                  onPresetSelect={applyPreset}
                  onJsonApply={applyJson}
                />
              ) : panel === 'solving' ? (
                <SolvingPanel key="solving" />
              ) : panel === 'error' ? (
                <ErrorPanel
                  key="error"
                  error={mutation.error}
                  onRetry={retry}
                  onEdit={backToCompose}
                  pending={mutation.isPending}
                />
              ) : mutation.data && optimizedRows && optimizedTotals ? (
                <ResultsPanel
                  key="result"
                  response={mutation.data}
                  notes={solvedNotes}
                  optimizedRows={optimizedRows}
                  baselineRows={baselineRows}
                  optimizedTotals={optimizedTotals}
                  baselineTotals={baselineTotals}
                  directiveWindows={directiveWindows}
                  onEdit={backToCompose}
                />
              ) : null}
            </AnimatePresence>
          </form>
        </FormProvider>
      </main>

      <SiteFooter />
    </div>
  );
}
