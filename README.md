# GridWise LLM - Team Submission

GridWise LLM is an intelligent energy scheduling backend API service. It interprets natural-language operator notes into structured energy directives, validates them deterministically via guardrails, and solves a cost-minimizing, constraint-valid 24-hour energy schedule using linear programming.

## System Architecture

The service operates as a pipeline:
1. **LLM Interpretation (`src/interpretation`):** Receives the `operator_notes` and uses **Groq (llama-3.3-70b-versatile)** to extract intent and parameters into one of the 6 canonical directive types. 
2. **Deterministic Guardrails (`src/guardrails`):** Checks the LLM output. It enforces unique ascending hours, valid numeric limits, and ensures unsupported outputs are safely flattened to `no_op`.
3. **Math Optimizer (`src/optimizer`):** Constructs a linear programming model (`javascript-lp-solver`). It applies the guardrailed directives (e.g., `solar_reduction`, `no_charge_window`) alongside fixed GridWise energy balance rules, battery rate limits, state-of-charge tracking, and end-of-day neutrality.

## Dependencies & External Tools
- **Framework:** NestJS (`@nestjs/common`, `@nestjs/core`) with Fastify (`@nestjs/platform-fastify`).
- **Optimization:** `javascript-lp-solver` (Linear Programming).
- **Validation:** `zod` for rigorous schema validation.
- **LLM Provider:** Groq REST API (`llama-3.3-70b-versatile` model). Used exclusively for operator-note interpretation.

## Environment Variables & Secret Handling

To run the API, you must provide the following environment variable. **Do not commit `.env` files.**

| Variable | Description |
|---|---|
| `LLM_API_KEY` | Your Groq API Key (Starts with `gsk_...`) |

*(Optional Variables: `PORT` defaults to 3000, `HOST` defaults to 0.0.0.0, `LLM_MODEL` defaults to llama-3.3-70b-versatile)*

## Local Quickstart (Node.js)

From a clean machine with Node.js v20+:

```bash
# 1. Clone the repository and enter the backend directory
cd backend

# 2. Install dependencies
npm ci

# 3. Configure environment variable (Windows PowerShell example)
$env:LLM_API_KEY="gsk_your_key_here"

# (Linux/macOS example)
# export LLM_API_KEY="gsk_your_key_here"

# 4. Start the server
npm run build
npm run start:prod
```

## Docker Fallback Instructions

If you prefer to run the API via Docker:

```bash
# 1. Build the image locally
cd backend
docker build -t gridwise-llm-backend:latest .

# 2. Run the container, injecting the API key
docker run -p 3000:3000 -e LLM_API_KEY="gsk_your_key_here" gridwise-llm-backend:latest
```
*(The container uses a secure multi-stage build and does not bake any credentials into the image.)*

## Testing the API

### 1. Health Endpoint
```bash
curl http://localhost:3000/health
```
**Expected Result:** `{"status":"ok"}`

### 2. Public Sample Test (POST `/optimize-energy`)
Send a valid JSON payload. For example, using `curl` (Linux/macOS):
```bash
curl -X POST http://localhost:3000/optimize-energy \
-H "Content-Type: application/json" \
-d '{
  "scenario_id": "TEST-01",
  "operator_notes": ["The battery charger will be isolated from 2 AM until 5 AM."],
  "hours": [
    {"hour": 0, "demand_kwh": 100, "solar_kwh": 0, "tariff_bdt_per_kwh": 6},
    {"hour": 1, "demand_kwh": 95, "solar_kwh": 0, "tariff_bdt_per_kwh": 5}
    /* ... provide all 24 hours ... */
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

**Expected Result:** A JSON object containing `scenario_id`, the `directive_interpretation` array mapping the note to `no_charge_window` for hours `[2, 3, 4]`, and the full 24-hour `hourly_plan` that minimizes grid cost while leaving `battery_kwh: 0` for `battery_action: charge` during those specific hours.

## Known Limitations
- The LLM relies on external availability from Groq. If Groq is down, interpretation fails and the system safely defaults to `no_op`.
- `javascript-lp-solver` is extremely fast for linear constraints, but floating-point precision math is internally clamped to GridWise's 0.01 BDT/kWh tolerance.
