<div align="center">
  <h1>⚡ GridWise — Smart Campus Energy Optimization Engine</h1>
  <p><strong>BUP CSE Fest 2026 Hackathon (Online Preliminary Round)</strong></p>
  <p>An intelligent energy scheduling backend API service. It interprets natural-language operator notes into structured energy directives using an LLM, validates them deterministically via guardrails, and solves a 24-hour linear programming (LP) cost minimization problem for grid electricity while respecting solar usage and battery limits.</p>

  <!-- Badges -->
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" />
  <img src="https://img.shields.io/badge/Groq_LPU-F37021?style=for-the-badge&logo=groq&logoColor=white" alt="Groq LPU" />
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/LP_Solver-4CAF50?style=for-the-badge&logo=math&logoColor=white" alt="LP Solver" />
</div>

---

## 🏗️ System Architecture & Workflow Diagram

The GridWise architecture relies on a **Hybrid Verification Model**. Large Language Models (LLMs) are exceptional at interpreting natural language intent but are notoriously unreliable at executing precise mathematical constraints. 

To guarantee **zero math hallucinations**, GridWise isolates the LLM's role to structural interpretation, offloading the actual mathematical optimization to a deterministic Linear Programming solver. A subsequent independent replayer verifies the physical validity of the solver's output before returning a response.

```mermaid
sequenceDiagram
    participant Client
    participant Fastify as Fastify Controller
    participant Groq as Groq LLM Interpreter
    participant Zod as Zod Guardrail Pipe
    participant LPSolver as LP Math Engine
    participant Replayer as Replayer Verification

    Client->>Fastify: POST /optimize-energy (Scenario & Natural Language)
    Fastify->>Groq: Prompt Construction & API Call
    Groq-->>Fastify: Unverified JSON Directives
    Fastify->>Zod: Validate Structure & Business Rules
    alt Validation Failed
        Zod-->>Fastify: Error Context
        Fastify->>Groq: Contextual Error Re-injection (Bounded Retry)
        Groq-->>Fastify: Corrected JSON
        Fastify->>Zod: Re-validate
    end
    Zod-->>Fastify: Sanitized Directives
    Fastify->>LPSolver: Transform into LP Standard Form & Solve
    LPSolver-->>Fastify: Optimization Results (24-hour plan)
    Fastify->>Replayer: Verify Energy Balance & Battery Physics
    Replayer-->>Fastify: Validation Passed
    Fastify-->>Client: 200 OK JSON Response
```

The service operates as a strict pipeline:
1. **LLM Interpretation (`src/interpretation`):** Receives the `operator_notes` and uses **Groq (llama-3.3-70b-versatile)** to extract intent and parameters into one of the 6 canonical directive types. 
2. **Deterministic Guardrails (`src/guardrails`):** Checks the LLM output. It enforces unique ascending hours, valid numeric limits, and ensures unsupported outputs are safely flattened to `no_op`.
3. **Math Optimizer (`src/optimizer`):** Constructs a linear programming model (`javascript-lp-solver`). It applies the guardrailed directives (e.g., `solar_reduction`, `no_charge_window`) alongside fixed GridWise energy balance rules, battery rate limits, state-of-charge tracking, and end-of-day neutrality.

---

## 🧮 Mathematical Optimization Model (Linear Programming)

The optimization engine computes the minimal cost to meet campus energy demands by dynamically deciding when to draw from the grid, consume solar power, charge, or discharge the battery.

### Decision Variables
For each hour $h \in [0, 23]$:
- $g_h$: Grid electricity imported (kWh)
- $s_h$: Solar energy utilized (kWh)
- $c_h$: Energy charged into the battery (kWh)
- $d_h$: Energy discharged from the battery (kWh)
- $e_h$: State of Charge (SOC) of the battery at the end of the hour (kWh)

### Objective Function
Minimize total grid electricity cost over the 24-hour period:
$$ \text{Minimize } Z = \sum_{h=0}^{23} (g_h \times \text{tariff}_h) $$

### Constraints

1. **Hourly Energy Balance:** Supply must perfectly meet demand.
   $$ g_h + s_h + d_h - c_h = \text{demand}_h $$

2. **Effective Solar Bounds:** Usable solar cannot exceed generation.
   $$ 0 \le s_h \le \text{effective\_solar}_h $$
   *(Note: $\text{effective\_solar}_h$ accounts for `solar_reduction` directives)*

3. **Battery State Transition:** Tracks energy across time.
   $$ e_h = e_{h-1} + c_h - d_h $$
   *(Where $e_{-1} = \text{initial\_energy}$)*

4. **End-of-Day Neutrality:** Battery must return to starting state.
   $$ e_{23} = \text{initial\_energy} $$

5. **Battery Reserve & Rate Limits:** Ensures safe battery operation.
   $$ \max(\text{min\_reserve}, \text{directive\_reserve}_h) \le e_h \le \text{capacity} $$
   $$ 0 \le c_h \le \text{max\_charge\_rate} $$
   $$ 0 \le d_h \le \text{max\_discharge\_rate} $$

6. **Directive Window Hard Constraints:** Applied conditionally based on LLM interpretation.
   - `no_charge`: $c_h = 0$
   - `no_discharge`: $d_h = 0$
   - `max_grid`: $g_h \le \text{limit}$

---

## 🛡️ Supported Operator Directives & Guardrail Rules

The LLM is tasked with mapping natural language operator notes into an array of structured directives.

| Directive Type | Description | Key Parameters |
| :--- | :--- | :--- |
| `solar_reduction` | Temporary drop in solar efficiency (e.g., cloud cover/maintenance). | `hours` (number[]), `reduction_percent` (number, 1-100) |
| `minimum_battery_reserve` | Holds emergency backup power above the standard minimum. | `hours` (number[]), `reserve_percent` (number, 1-100) |
| `no_charge_window` | Prevents the battery from drawing charge during specific hours. | `hours` (number[]) |
| `no_discharge_window` | Prevents the battery from discharging power to the campus. | `hours` (number[]) |
| `max_grid_window` | Caps the maximum kWh that can be imported from the grid. | `hours` (number[]), `max_kwh` (number) |
| `no_op` | Emitted when notes contain no actionable operational directives. | None. `applies: false` |

### Guardrail Rules (Zod Pipe)
- **0-Indexed Hour Conversion:** Natural language time (e.g., "1 PM to 3 PM") must strictly map to 0-indexed hour arrays (e.g., `[13, 14]`).
- **Ascending Unique Arrays:** All `hours` arrays must contain strictly ascending, non-duplicate integers.
- **`applies` Semantics:** The `applies` boolean must be `true` for all active directives, and strictly `false` ONLY for the `no_op` directive type.
- **Micro-Epsilon Clamping:** To handle floating-point anomalies in JS physics verification, a 0.01 tolerance window (micro-epsilon) is applied to all balance checks.

---

## 📡 API Endpoints Contract

### `GET /health`
Returns system health status.
```json
{
  "status": "ok"
}
```

### `POST /optimize-energy`
Main optimization orchestrator.

**Request Schema:**
```json
{
  "scenario_id": "string",
  "operator_notes": "string (Natural language)",
  "hours": [
    {
      "hour": "number (0-23)",
      "demand_kwh": "number",
      "solar_generation_kwh": "number",
      "grid_tariff_bdt": "number"
    }
  ],
  "battery": {
    "capacity_kwh": "number",
    "max_charge_rate_kw": "number",
    "max_discharge_rate_kw": "number",
    "initial_energy_kwh": "number",
    "min_reserve_percent": "number"
  }
}
```

**Response Schema:**
```json
{
  "scenario_id": "string",
  "directive_interpretation": {
    "applies": "boolean",
    "directives": [ /* Extracted directives */ ]
  },
  "hourly_plan": [
    {
      "hour": "number",
      "grid_import_kwh": "number",
      "solar_used_kwh": "number",
      "battery_charge_kwh": "number",
      "battery_discharge_kwh": "number",
      "battery_soc_kwh": "number",
      "hourly_cost_bdt": "number"
    }
  ],
  "total_grid_kwh": "number",
  "total_cost_bdt": "number",
  "peak_grid_kwh": "number",
  "plan_summary": "string"
}
```

---

## 🖥️ Frontend Dashboard Features

Built with **Next.js 16 (App Router)** and **Tailwind CSS**, the dashboard provides a premium, responsive interface for operators:

- **Framer Motion Animations:** Smooth "Swing Up & Merge" layout transitions when executing optimization payloads.
- **Savings Comparison Banner:** Dynamic banner displaying baseline vs. GridWise Optimized cost savings (`-% saved`).
- **Advanced Telemetry (Recharts):** Complex `ComposedChart` data visualizations featuring contiguous `ReferenceArea` overlays highlighting active directive windows (e.g., visually blocking out "no charge" hours).
- **Quick-Preset Toolbar:** Interactive one-click demo states ("Default Demo", "High Solar Reduction", "Battery Reserve Hold") powered by React Hook Form.

---

## ⚡ Performance Benchmarks

GridWise is engineered for ultra-low latency, leveraging Groq's specialized LPU hardware and highly optimized deterministic solvers to effortlessly beat the 5-second SLA.

| Pipeline Stage | Average Latency |
| :--- | :--- |
| **LLM Inference (Groq LPU)** | ~350 ms |
| **Zod Guardrail Validation** | < 1 ms |
| **LP Dual Simplex Optimization** | 2–5 ms |
| **Replayer Verification** | < 1 ms |
| **Total End-to-End Latency** | **~400–800 ms** |

---

## 🚀 Local Setup, Docker & Testing Guide

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (Optional, for containerized environments)
- A [Groq API Key](https://console.groq.com/)

### Environment Variables

To run the API, you must provide the following environment variables. Create a `.env` file in the `backend` directory:

| Variable | Description |
|---|---|
| `LLM_API_KEY` | Your Groq API Key (Starts with `gsk_...`) |
| `PORT` | Optional. Defaults to 3000. |

### Running Locally (Node.js)

```bash
# 1. Clone the repository and enter the backend directory
cd backend

# 2. Install dependencies
npm ci

# 3. Start the server
npm run build
npm run start:prod
```

### Running via Docker

If you prefer to run the API via Docker:

```bash
# 1. Build the image locally
cd backend
docker build -t gridwise-llm-backend:latest .

# 2. Run the container, injecting the API key
docker run -p 3000:3000 -e LLM_API_KEY="gsk_your_key_here" gridwise-llm-backend:latest
```
*(The container uses a secure multi-stage build and does not bake any credentials into the image.)*

### Testing the API

**1. Health Endpoint**
```bash
curl http://localhost:3000/health
```
**Expected Result:** `{"status":"ok"}`

**2. Public Sample Test (POST `/optimize-energy`)**
```bash
curl -X POST http://localhost:3000/optimize-energy \
-H "Content-Type: application/json" \
-d '{
  "scenario_id": "TEST-01",
  "operator_notes": ["The battery charger will be isolated from 2 AM until 5 AM."],
  "hours": [
    {"hour": 0, "demand_kwh": 100, "solar_kwh": 0, "tariff_bdt_per_kwh": 6},
    {"hour": 1, "demand_kwh": 95, "solar_kwh": 0, "tariff_bdt_per_kwh": 5}
  ],
  "battery": {
    "capacity_kwh": 200,
    "initial_energy_kwh": 70,
    "minimum_energy_kwh": 30,
    "max_charge_kwh_per_hour": 55,
    "max_discharge_kwh_per_hour": 55
  }
}'
```

---

## ⚠️ Known Limitations
- The LLM relies on external availability from Groq. If Groq is down, interpretation fails and the system safely defaults to `no_op`.
- `javascript-lp-solver` is extremely fast for linear constraints, but floating-point precision math is internally clamped to GridWise's 0.01 BDT/kWh tolerance.
