---
name: "project-structure"
description: "Node.js/Express project folder layout conventions"
---

# Project Structure

When creating or organizing a Node.js/Express project, follow this layout:

```
src/
  server.js           # Entry point — starts HTTP server
  app.js              # Express app setup, middleware, route mounting
  routes/             # URL-to-controller mapping (one file per resource)
  controllers/        # Parse request, call service, format response
  services/           # Business logic (no HTTP awareness)
  middleware/          # Auth, validation, error handler, logging
  schemas/            # Zod request validation schemas
  errors/             # Custom error classes extending AppError
  config/
    env.js            # Zod-validated environment variables
    database.js       # Database connection setup
  utils/              # Pure helper functions
tests/
  unit/               # Service-level tests
  integration/        # Route-level tests with Supertest
  fixtures/           # Test data and factories
```

## Principles
- One responsibility per file — don't mix concerns
- Controllers never contain business logic
- Services never import Express or HTTP concepts
- Keep the dependency graph acyclic: routes -> controllers -> services -> utils
