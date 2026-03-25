---
name: "env-setup"
description: "Environment variable configuration with Zod validation"
---

# Environment Setup

## Config file (`src/config/env.js`)
- Use Zod to define and validate all environment variables at startup
- App should crash fast on missing or invalid config — never silently use defaults for critical vars
- Export the validated config object for use throughout the app

## Pattern
```js
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = envSchema.parse(process.env);
```

## .env.example
- Always maintain a `.env.example` with all variables (no real values)
- Comment each variable with its purpose
- Never commit `.env` files — ensure `.gitignore` covers `.env*` except `.env.example`
