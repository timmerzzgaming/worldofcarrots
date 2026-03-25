---
name: "express-route-scaffold"
description: "Generate Express route, controller, and middleware stubs"
---

# Express Route Scaffold

When asked to create a new route or endpoint, generate the full vertical slice:

## Route file (`src/routes/<resource>.routes.js`)
- Define Express router with RESTful endpoints
- Apply validation middleware to routes that accept input
- Mount auth middleware where needed

## Controller (`src/controllers/<resource>.controller.js`)
- Parse and validate request params/body/query
- Call the service layer — never put business logic here
- Format and return the response using the standard envelope `{ data, error, meta }`
- Wrap in try/catch and forward errors to the error middleware

## Service (`src/services/<resource>.service.js`)
- Implement business logic with no HTTP awareness
- Accept plain objects, return plain objects
- Throw custom error classes for known failure modes

## Validation schema (`src/schemas/<resource>.schema.js`)
- Use Zod to define request body and param schemas
- Export named schemas for create, update, and query operations

## Conventions
- Use plural resource names in URLs: `/api/v1/users`
- Use camelCase for JS identifiers, kebab-case for file names
- Always include JSDoc for exported functions
