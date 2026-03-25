---
name: "npm-script-conventions"
description: "Standard npm scripts for Node.js projects"
---

# NPM Script Conventions

Ensure these standard scripts exist in `package.json`:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/",
    "format:check": "prettier --check src/",
    "validate": "npm run lint && npm run format:check && npm test",
    "db:migrate": "node src/config/migrate.js",
    "db:seed": "node src/config/seed.js"
  }
}
```

## Conventions
- `start` — production entry point, no dev tools
- `dev` — development with file watching (use `--watch` flag in Node 18+)
- `validate` — run before every push; combines lint + format check + tests
- Prefix database scripts with `db:`
- Use `pre`/`post` hooks sparingly — prefer explicit script composition
