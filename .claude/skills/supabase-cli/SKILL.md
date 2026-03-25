---
name: supabase-cli
description: Supabase CLI reference for local development, database management, migrations, edge functions, type generation, storage, secrets, branches, and project management. Run the full Supabase stack locally.
---

Use the Supabase CLI to manage local development, database migrations, edge functions, type generation, storage, and project configuration.

## Installation

```bash
# npm
npm install -g supabase

# Homebrew (macOS/Linux)
brew install supabase/tap/supabase

# Or run via npx (requires Node.js 20+)
npx supabase <command>
```

## Global Flags

| Flag | Description |
|------|-------------|
| `--debug` | Enable verbose logging |
| `--experimental` | Activate preview features |
| `-o, --output` | Format: `env`, `pretty`, `json`, `toml`, `yaml` |
| `--profile` | Specify API connection profile |
| `--workdir` | Override project directory path |
| `--yes` | Auto-confirm prompts |
| `--create-ticket` | File support request for errors |

## Getting Started

```bash
supabase init                     # Initialize local config (creates supabase/config.toml)
supabase login                    # Authenticate with personal access token
supabase link --project-ref <id>  # Link to hosted project
supabase start                    # Start local stack (requires 7GB RAM)
supabase stop                     # Stop local stack
supabase status                   # Show running services and connection details
```

## Database Management

```bash
supabase db pull          # Pull remote schema as new migration
supabase db push          # Apply local migrations to remote database
supabase db reset         # Reinitialize local DB with migrations + seed
supabase db dump          # Export remote database via pg_dump
supabase db diff          # Compare schema between environments
supabase db lint          # Lint local database for schema errors
supabase db start         # Start database container only
```

## Migrations

```bash
supabase migration new <name>       # Create timestamped migration file
supabase migration list             # Show local vs remote migration status
supabase migration fetch            # Retrieve migration files from history
supabase migration repair           # Fix migration history inconsistencies
supabase migration squash           # Consolidate multiple migrations
supabase migration up               # Execute pending migrations
supabase migration down             # Revert to previous version
```

## Type Generation

```bash
supabase gen types                   # Generate TypeScript types (default)
supabase gen types --lang=go         # Generate Go types
supabase gen types --lang=swift      # Generate Swift types
supabase gen types --lang=python     # Generate Python types
supabase gen signing-key             # Create JWT signing key (ES256/RS256)
supabase gen bearer-jwt              # Generate bearer token
```

## Edge Functions

```bash
supabase functions new <name>        # Create function with boilerplate
supabase functions list              # List deployed functions
supabase functions download <name>   # Retrieve function source
supabase functions serve             # Test functions locally (with debug)
supabase functions deploy <name>     # Deploy to production
supabase functions delete <name>     # Remove function
```

## Secrets Management

```bash
supabase secrets set KEY=value       # Set environment variable
supabase secrets list                # List all project secrets
supabase secrets unset KEY           # Remove a secret
```

## Storage

```bash
supabase storage ls <bucket>         # List bucket contents
supabase storage cp <src> <dest>     # Copy objects to/from storage
supabase storage mv <src> <dest>     # Move objects within bucket
supabase storage rm <path>           # Delete storage objects
```

## Project Management

```bash
supabase projects create             # Provision new project
supabase projects list               # List accessible projects
supabase projects api-keys           # Get project API keys
supabase projects delete             # Destroy project
```

## Preview Branches

```bash
supabase branches create <name>      # Create ephemeral or persistent branch
supabase branches list               # List all preview branches
supabase branches get <id>           # Get branch connection params
supabase branches update <id>        # Modify branch config
supabase branches pause <id>         # Suspend branch
supabase branches unpause <id>       # Reactivate branch
supabase branches delete <id>        # Remove branch
```

## Testing

```bash
supabase test db                     # Run pgTAP unit tests
supabase test new <name>             # Create new test file
```

## Database Inspection

```bash
supabase inspect db bloat            # Identify table space waste
supabase inspect db blocking         # Reveal lock contention
supabase inspect db calls            # Rank queries by frequency
supabase inspect db locks            # Show exclusive lock holders
supabase inspect db long-running-queries   # Find extended executions
supabase inspect db outliers         # Rank by aggregate duration
supabase inspect db vacuum-stats     # Monitor cleanup activity
supabase inspect db traffic-profile  # Analyze read/write patterns
supabase inspect report              # Generate comprehensive stats
```

## SSO (SAML)

```bash
supabase sso add                     # Register identity provider
supabase sso list                    # List providers
supabase sso show <id>               # Show provider details
supabase sso info                    # Project SAML config
supabase sso update <id>             # Modify provider
supabase sso remove <id>             # Unregister provider
```

## Custom Domains

```bash
supabase domains create              # Configure custom hostname
supabase domains activate            # Enable custom domain
supabase domains get                 # Retrieve domain config
supabase domains reverify            # Revalidate ownership
supabase domains delete              # Remove custom domain
supabase vanity-subdomains activate  # Enable branded subdomain
supabase vanity-subdomains get       # Fetch subdomain details
supabase vanity-subdomains check-availability   # Check availability
```

## Network & Security

```bash
supabase network-bans get            # Show blocked IPs
supabase network-bans remove         # Lift IP restrictions
supabase network-restrictions get    # Retrieve CIDR allowlists
supabase network-restrictions update # Modify IP filtering
supabase ssl-enforcement get         # Check SSL requirements
supabase ssl-enforcement update      # Toggle SSL enforcement
```

## Postgres Configuration

```bash
supabase postgres-config get         # Show config overrides
supabase postgres-config update      # Modify parameters
supabase postgres-config delete      # Revert custom settings
```

## Utilities

```bash
supabase bootstrap                   # Launch quick start template
supabase snippets list               # List SQL snippets
supabase snippets download <id>      # Export snippet
supabase services                    # Show component versions
supabase completion <shell>          # Generate shell autocompletion
supabase config push                 # Sync local settings to remote
supabase seed buckets                # Populate storage from config
```

## Common Workflow

```bash
# 1. Initialize and start local development
supabase init
supabase start

# 2. Create a migration
supabase migration new add_users_table

# 3. Edit the migration file, then apply
supabase db reset

# 4. Generate types
supabase gen types > src/types/supabase.ts

# 5. Link to remote and push
supabase link --project-ref <id>
supabase db push
```

## When to Use This Skill

- Setting up local Supabase development environments
- Managing database migrations and schema changes
- Deploying and testing edge functions
- Generating TypeScript/Go/Swift/Python types from schema
- Managing secrets, storage, and project configuration
- Inspecting database performance and health
- Working with preview branches for CI/CD

## References

- Docs: https://supabase.com/docs/reference/cli/introduction
- Getting Started: https://supabase.com/docs/guides/local-development/cli/getting-started
- GitHub: https://github.com/supabase/cli
