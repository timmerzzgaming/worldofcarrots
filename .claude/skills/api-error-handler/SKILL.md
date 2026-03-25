---
name: "api-error-handler"
description: "Express error handling patterns and custom error classes"
---

# API Error Handler

## Error class pattern (`src/errors/`)
- Base `AppError` class extending `Error` with `statusCode`, `code`, and `isOperational` fields
- Specific subclasses: `NotFoundError`, `ValidationError`, `AuthenticationError`, `ForbiddenError`
- Always include a machine-readable `code` string (e.g., `RESOURCE_NOT_FOUND`)

## Error middleware (`src/middleware/errorHandler.js`)
- Centralized error handler registered last in Express middleware chain
- Convert known errors to structured JSON responses
- Log unexpected errors with full stack trace, return generic 500 to client
- Never leak stack traces or internal details in production

## Usage in controllers
- Never try/catch and respond inline — let errors propagate to the middleware
- Use `next(error)` or async wrapper to forward errors
- Throw specific error subclasses from services

## Response format
```json
{
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "message": "Email is required" },
  "meta": { "requestId": "..." }
}
```
