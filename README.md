# GridWise LLM

GridWise LLM is an intelligent energy scheduling service and operator console. It interprets natural-language operator notes into structured energy directives, validates them deterministically via guardrails, and solves a cost-minimizing, constraint-valid 24-hour energy schedule using linear programming.

## Repository Layout

```
.
├── backend/    # NestJS + Fastify REST API service (Core service)
├── frontend/   # Next.js local test console (Internal validation interface)
└── README.md   # Root repository overview and setup instructions
```

## System Architecture

The project is structured into two independent packages:

1. **`backend/` (Core Service)**
   - **Framework:** NestJS with Fastify HTTP adapter.
   - **Responsibilities:**
     - `POST /optimize-energy`: Accepts a 24-hour scenario and operator notes, interprets notes via LLM, applies deterministic guardrails, and solves the schedule.
     - `GET /health`: Health and readiness probe endpoint.
   - **Architectural Layers:**
     - **Layer 1: Orchestrator & Controllers (`src/optimize-energy/`):** Receives HTTP requests, coordinates workflow execution across layers.
     - **Layer 2: Interpretation (`src/interpretation/`):** Calls an LLM to interpret operator notes into raw directive candidates.
     - **Layer 3: Guardrails (`src/guardrails/`):** Enforces deterministic structural and physical validity checks, falling back to `no_op` on failure.
     - **Layer 4: Optimizer (`src/optimizer/`):** Constructs linear programming constraints and runs the mathematical solver.

2. **`frontend/` (Internal Test Console)**
   - **Framework:** Next.js (App Router) + React.
   - **Responsibilities:**
     - Provides an internal testing harness to load sample scenarios, edit request payloads, trigger optimizations against the backend, inspect results, and compare with expected outputs.
     - Not user-facing or graded; strictly for developer inspection and validation.

## Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm

### Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```
The backend starts by default at `http://localhost:3000`.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend test console starts at `http://localhost:3001` (or next available port).
