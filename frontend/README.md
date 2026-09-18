# GridWise — Smart Campus Energy Optimization Console

Operator console for the GridWise LLM scheduling service. An operator lays out a
24-hour campus scenario, writes up to three instructions in plain language, and
submits; the backend interprets the notes into structured directives, guardrails
them, and solves a cost-minimising dispatch. This app is the surface that makes
that round trip legible.

## Running it

```bash
npm install
npm run dev
```

Open <http://localhost:3001>.

The console talks to the NestJS service through its own route handler, so the
browser never calls the backend directly and CORS never enters into it. Point it
at your service with `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `GRIDWISE_API_BASE_URL` | `http://localhost:3000` | Base URL of the NestJS service |
| `GRIDWISE_API_TIMEOUT_MS` | `45000` | Upstream timeout; note interpretation calls an LLM |

The header carries a live reachability indicator, polled via `GET /api/health`.
If it reads "Optimizer offline", start the backend or repoint the variable.

## Architecture

```
app/
  api/optimize-energy/route.ts   Server-side proxy; normalises transport failures
  api/health/route.ts            Reachability probe for the header indicator
  page.tsx                       Stage machine, form, mutation, animation sequence
  providers.tsx                  TanStack Query, next-themes, tooltip context
components/
  chart/                         ComposedChart, custom tooltip, legend,
                                 tariff ribbon, directive rail, swing-up stage
  inputs/                        Hour grid, battery limits, JSON tab, operator notes
  output/                        Stat tiles, directive cards, plan table, solving/error
  motion/variants.ts             The motion vocabulary and stage geometry
  ui/                            shadcn/ui primitives
lib/
  schemas.ts                     Zod contract + form schema + conversions
  api.ts                         Typed client; validates every response
  chart-data.ts                  Baseline/optimized row builders, directive windows
  presets.ts                     Seed scenarios
  format.ts                      Every figure the user reads
```

### The submit sequence

`page.tsx` holds a three-value stage — `compose`, `solving`, `result` — and the
chart is deliberately **outside** the `AnimatePresence` that swaps the panels.
On submit the input panels fade down and out, the chart swings up and settles
into a shorter pinned header, the solving panel takes the vacated space, and the
results fade in beneath. The chart is never unmounted, so the reader keeps a
continuous view of the day being planned.

Baseline and optimized chart rows share the same keys on purpose: Recharts
tweens a series when its data array changes but its `dataKey` does not, so
swapping arrays animates every mark from the old plan to the new one. The
y-domain is computed across *both* datasets so the axis holds still while the
marks travel — which is what makes the change read as movement rather than as a
re-render.

## Visualization notes

The series palette is a validated categorical set: five slots clearing the
lightness band, chroma floor, adjacent CVD separation (worst ΔE 9.1 light / 8.4
dark) and the normal-vision floor against both surfaces. **Slot order is the
colour-blindness safety mechanism** — adding a sixth series means re-running the
palette validator, not picking a nice hue. Dark mode is a selected set of steps
for the dark surface, not an automatic flip.

Two deliberate choices worth knowing before editing the chart:

- **Tariff is not a second y-axis.** Two scales on one plot invent a correlation
  the data does not contain. Tariff is a separate sequential encoding — the
  ribbon under the plot, with its own scale legend, aligned hour-for-hour.
- **Every value in the chart is also readable as text.** The hourly plan table is
  the chart's twin, so no figure is reachable only by hovering. Directive windows
  are shaded *and* labelled in the rail *and* listed in the directive cards.

## Contract

`lib/schemas.ts` mirrors `backend/src/optimize-energy/dto/*` field for field,
including the discriminated union over the six directive types. Responses are
parsed with it on arrival, so a backend that drifts from the contract surfaces
as a clear error instead of blank cards and NaN axes.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4 · shadcn/ui ·
Recharts · TanStack Query + Axios · React Hook Form + Zod · Framer Motion ·
Lucide · Sonner
