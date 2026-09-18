# GridWise LLM - Backend Service

NestJS and Fastify-powered core API for energy optimization and natural-language operator note interpretation.

## Architecture

- **`src/main.ts`**: Application entrypoint bootstrapping Fastify, CORS, and global filters.
- **`src/app.module.ts`**: Root module aggregating feature modules.
- **`src/config/`**: Centralized, validated environment configuration using Zod.
- **`src/health/`**: Health check endpoints (`GET /health`).
- **`src/optimize-energy/`**: Primary orchestration module and `POST /optimize-energy` endpoint.
- **`src/interpretation/`**: Layer 2 LLM note interpretation via swappable client providers.
- **`src/guardrails/`**: Layer 3 deterministic validation and fallback logic.
- **`src/optimizer/`**: Layer 4 mathematical programming and LP solver integration.
- **`src/shared/`**: Common types, schemas, constants, and error definitions.
- **`src/filters/`**: Global exception filters sanitizing error responses.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Run tests
npm test
npm run test:e2e
```
