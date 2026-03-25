---
name: vercel-cli
description: Vercel CLI reference for deploying, managing projects, domains, environment variables, DNS, certificates, blob storage, integrations, feature flags, and more. Full command overview.
---

Use the Vercel CLI to deploy projects, manage domains, environment variables, DNS records, certificates, blob storage, integrations, and more from the command line.

## Installation

```bash
npm i -g vercel
# or: pnpm i -g vercel / yarn global add vercel / bun i -g vercel
```

## Authentication

```bash
vercel login                  # Interactive login
vercel login [email]          # Login with email
vercel login --github         # Login with GitHub
vercel logout                 # Logout
vercel whoami                 # Show current user
```

For CI/CD, use `--token` flag with a token from your account tokens page.

## Deploy

```bash
vercel                        # Deploy (default command)
vercel deploy                 # Deploy to preview
vercel deploy --prod          # Deploy to production
vercel build                  # Build locally
vercel build --prod           # Production build locally
```

## Project Management

```bash
vercel link                   # Link local dir to Vercel project
vercel link [path]            # Link specific directory
vercel project ls             # List projects
vercel project add            # Create project
vercel project rm             # Remove project
vercel project inspect [name] # Inspect project details
vercel open                   # Open project in dashboard
vercel pull                   # Pull remote env vars and settings
vercel pull --environment=production
```

## Environment Variables

```bash
vercel env ls                 # List env vars
vercel env add [name] [env]   # Add env var
vercel env update [name] [env]# Update env var
vercel env rm [name] [env]    # Remove env var
vercel env pull [file]        # Pull env vars to local .env
vercel env run -- <command>   # Run command with env vars
```

## Domains & DNS

```bash
vercel domains ls             # List domains
vercel domains add [domain] [project]  # Add domain
vercel domains rm [domain]    # Remove domain
vercel domains buy [domain]   # Purchase domain
vercel dns ls [domain]        # List DNS records
vercel dns add [domain] [name] [type] [value]  # Add record
vercel dns rm [record-id]     # Remove record
```

## Aliases

```bash
vercel alias set [deploy-url] [custom-domain]  # Set alias
vercel alias rm [custom-domain]                # Remove alias
vercel alias ls                                # List aliases
```

## Deployments

```bash
vercel list                   # List recent deployments
vercel list [project-name]    # List for specific project
vercel inspect [deploy-id]    # Inspect deployment
vercel inspect [deploy-id] --logs  # With logs
vercel inspect [deploy-id] --wait  # Wait for completion
vercel logs [deploy-url]      # View runtime logs
vercel logs [deploy-url] --follow  # Follow logs
vercel remove [deploy-url]    # Remove deployment
vercel redeploy [deploy-id]   # Rebuild and redeploy
vercel promote [deploy-id]    # Promote to current
vercel rollback               # Rollback production
vercel rollback [deploy-id]   # Rollback to specific deployment
```

## Blob Storage

```bash
vercel blob list              # List blobs
vercel blob put [file]        # Upload file
vercel blob get [url]         # Download blob
vercel blob del [url]         # Delete blob
vercel blob copy [from] [to]  # Copy blob
```

## Certificates

```bash
vercel certs ls               # List certificates
vercel certs issue [domain]   # Issue certificate
vercel certs rm [cert-id]     # Remove certificate
```

## Integrations (Marketplace)

```bash
vercel install <name>                    # Install integration
vercel integration add <name>           # Add integration
vercel integration list [project]       # List integrations
vercel integration discover             # Discover available
vercel integration guide <name>         # View setup guide
vercel integration balance <name>       # Check balance
vercel integration open <name> [resource]  # Open dashboard
vercel integration remove <name>        # Remove integration
vercel integration-resource remove <name>      # Remove resource
vercel integration-resource disconnect <name>  # Disconnect resource
```

## Feature Flags

```bash
vercel flags list             # List flags
vercel flags create [slug]    # Create flag
vercel flags set [flag] --environment [env] --variant [variant]
vercel flags open [flag]      # Open flag in dashboard
```

## Cache Management

```bash
vercel cache purge            # Purge all cache
vercel cache purge --type cdn # Purge CDN cache only
vercel cache purge --type data # Purge data cache only
vercel cache invalidate --tag foo      # Invalidate by tag
vercel cache dangerously-delete --tag foo  # Delete by tag
```

## Teams & Scoping

```bash
vercel teams list             # List teams
vercel teams add              # Create team
vercel teams invite [email]   # Invite to team
vercel switch                 # Switch team scope
vercel switch [team-name]     # Switch to specific team
```

## Git Integration

```bash
vercel git ls                 # List git connections
vercel git connect            # Connect git provider
vercel git disconnect [provider]  # Disconnect provider
```

## Other Commands

```bash
vercel dev                    # Local development server
vercel dev --port 3000        # Custom port
vercel init                   # Initialize from examples
vercel init [project-name]    # Init specific example
vercel bisect                 # Binary search deployments for issues
vercel bisect --good [url] --bad [url]
vercel mcp                    # Set up MCP client config
vercel target list            # List custom environments
vercel redirects list         # List project redirects
vercel redirects add /old /new --status 301
vercel rolling-release configure --cfg='[config]'
vercel rolling-release start --dpl=[deploy-id]
vercel api [endpoint]         # Make authenticated API requests (beta)
vercel curl [path]            # HTTP request with protection bypass (beta)
vercel httpstat [path]        # HTTP timing statistics
vercel webhooks list          # List webhooks (beta)
vercel microfrontends pull    # Pull microfrontends config
vercel telemetry status       # Check telemetry
vercel telemetry disable      # Disable telemetry
vercel guidance disable       # Disable guidance messages
vercel help [command]         # Get help
vercel --version              # Check version
```

## Common Workflow

```bash
# 1. Link and pull settings
vercel link
vercel pull

# 2. Develop locally
vercel dev

# 3. Deploy to preview
vercel deploy

# 4. Deploy to production
vercel deploy --prod

# 5. Set up custom domain
vercel domains add example.com
vercel alias set <deploy-url> example.com
```

## When to Use This Skill

- Deploying Next.js, React, or other frontend projects
- Managing environment variables across environments
- Setting up custom domains and DNS
- Managing blob storage
- Installing and managing marketplace integrations
- Debugging deployments with logs, inspect, and bisect
- Rolling releases and gradual rollouts
- CI/CD automation with `--token`

## References

- Docs: https://vercel.com/docs/cli
- npm: https://www.npmjs.com/package/vercel
