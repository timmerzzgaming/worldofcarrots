# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Runtime**: Node.js (v18+) with ESM (`import`/`export`, not CommonJS)
- **Framework**: Express
- **Validation**: Zod (validate all request bodies and env vars at startup)
- **Testing**: Jest + Supertest
- **Linting/Formatting**: ESLint + Prettier
- **Package Manager**: npm
- **Database**: PostgreSQL (connection string via `DATABASE_URL`)
- **Auth**: JWT (access token 15m, refresh token 7d)

## Commands

```bash
npm install                                  # Install dependencies
cp .env.example .env                         # Configure environment (required before first run)
npm run dev                                  # Dev server with file watching
npm test                                     # Run all tests
npm test -- --testPathPattern=<pattern>      # Run a single test file
npm run lint                                 # Check lint errors
npm run lint:fix                             # Auto-fix lint errors
npm run validate                             # lint + format:check + test (run before pushing)
```

## Architecture

Layered Express architecture with strict separation of concerns:

```
src/
  server.js           <- starts HTTP server (entry point)
  app.js              <- Express setup, mounts middleware and routes
  routes/             <- URL-to-controller mapping
  controllers/        <- parse request, call service, format response
  services/           <- business logic (no HTTP awareness)
  middleware/         <- auth, validation, error handler, logging
  schemas/            <- Zod request validation schemas
  errors/             <- custom error classes extending AppError
  config/env.js       <- Zod-validated environment variables
```

**Request flow**: Route -> Controller -> Service -> (DB/external) -> Controller -> Response

**API pattern**: REST with `/api/v1/` prefix. All responses use envelope `{ data, error, meta }`.

## Key Conventions

- Env vars are validated with Zod at startup (`src/config/env.js`) — app crashes fast on misconfiguration
- Errors flow through centralized error middleware — never catch/respond inline in route handlers
- Controllers only parse requests and format responses; business logic belongs in services
- Unit tests for services, integration tests (Supertest) for routes
- Conventional commits: `type(scope): subject`
- Feature branches from main, squash merge
