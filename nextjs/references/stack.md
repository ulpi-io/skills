# Stack — Next.js 16.2 Baseline & Build Toolchain

Every other reference file assumes these decisions. Do not deviate.

## Version policy

- Recommend the stable **Next.js 16.2** line for new applications. The verified latest patch on
  2026-07-20 is 16.2.10; use `next@latest` and the lockfile instead of freezing that snapshot in a
  hand-written dependency template.
- Before changing an existing application, inspect `package.json` and its active lockfile (`pnpm why
  next`, `npm ls next`, or equivalent). Follow the resolved version unless the task explicitly
  includes an upgrade.
- At this verification snapshot, 16.3 existed only as a prerelease. Do not recommend
  `next@canary` or any prerelease by default. Read `upgrading.md` for new apps, version choices, and
  migrations.

## What

| Dependency | Version | Notes |
|---|---|---|
| Node.js | 20.9+ | 18.x dropped in Next.js 16 |
| TypeScript | 5.1+ | Strict mode with `noUncheckedIndexedAccess` |
| React | 19.2 | App Router Server Components, `useActionState`, `useOptimistic` |
| Next.js | Stable 16.2 line | App Router only. Verified latest patch: 16.2.10. |
| Bundler | Turbopack (default) | Opt out with `next dev --webpack` / `next build --webpack` |
| React Compiler | Stable opt-in | `reactCompiler: true`; not enabled by Next.js by default |
| Linter | ESLint flat config | `next lint` removed in v16 — run `eslint .` directly |
| i18n | next-intl | All visible strings via `t()` |

## How

### next.config.ts — complete template

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // --- Project defaults ---
  typedRoutes: true,            // Type-check Link/router hrefs against generated routes.
  reactCompiler: true,          // Stable opt-in; measure its build-time cost.
  cacheComponents: true,        // Deliberate project opt-in for 'use cache' and PPR.

  // --- Turbopack (default in v16, no config needed) ---
  // Opt out: next dev --webpack, next build --webpack
  // experimental: { turbopackFileSystemCacheForDev: true },  // beta: faster cold starts

  // --- Images ---
  images: {
    remotePatterns: [
      // Add allowed remote image domains here
      // { protocol: 'https', hostname: 'cdn.example.com' },
    ],
  },

  // --- Security ---
  // serverActions: {
  //   allowedOrigins: ['my-app.com'],  // Only if behind a reverse proxy / CDN
  // },
  // experimental: {
  //   taint: true,  // Enable taintObjectReference / taintUniqueValue
  // },
};

export default nextConfig;
```

`cacheComponents: true` is a project architecture decision, not a universal Next.js requirement. It
is required before using `'use cache'`, `cacheLife`, or `cacheTag`, and it opts the application into
the Cache Components rendering model. Do not add it to an existing project as an unrelated config
cleanup; follow `caching-strategy.md` and the migration checks in `upgrading.md`.

`typedRoutes: true` type-checks `<Link>` and router destinations. Run `next typegen` after route
changes so the global `PageProps`, `LayoutProps`, and `RouteContext` helpers stay current.

### TypeScript — tsconfig.json strict settings

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,   // arr[0] is T | undefined, not T
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "module": "esnext",
    "target": "es2017",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`noUncheckedIndexedAccess` is non-negotiable. Without it, `params.slug` and `searchParams.page`
appear as `string` instead of `string | undefined`, hiding real bugs.

### ESLint — flat config (eslint.config.mjs)

```javascript
// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import/no-duplicates': 'error',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
```

`next lint` is removed in v16. Run ESLint directly:

```bash
npx eslint .
```

### Environment variables

| Prefix | Visibility | Example |
|---|---|---|
| `NEXT_PUBLIC_` | Bundled into client JS — visible to everyone | `NEXT_PUBLIC_API_URL` |
| _(none)_ | Server-only — Server Components, Server Actions, route handlers, proxy.ts | `API_SECRET_KEY` |

`NEXT_PUBLIC_` variables are inlined into browser bundles at build time. Unprefixed variables stay
server-only. A prerendered route can still capture a server value during the build; when that route
must read a deployment-specific value on each request, opt it into request-time rendering first:

```typescript
import { connection } from 'next/server';

async function getConfig() {
  await connection();  // Opts into dynamic rendering, reads env at runtime
  return process.env.API_URL;  // Now read at request time, not build time
}
```

**Rules:**
- Never prefix a secret with `NEXT_PUBLIC_` — it will be in the client bundle.
- Use `connection()` in a prerenderable route when a server value must be read at request time.
- `.env.local` is gitignored (local secrets). `.env` is committed (non-secret defaults only).

### Build validation pipeline

Run in this order. Fail fast — do not continue if a step fails.

```bash
# 1. Lint
npx eslint .

# 2. Typecheck
npx next typegen
npx tsc --noEmit

# 3. Build
npx next build

# 4. Test
npx vitest run
```

**Concurrent dev/build:** Dev and production use separate output directories (`.next/dev` for
dev) so `next dev` and `next build` can run in parallel without cache conflicts.

## When

### Turbopack vs Webpack

| Situation | Use |
|---|---|
| Default development and builds | Turbopack (no flag needed) |
| A dependency fails with Turbopack | `next dev --webpack` as a temporary workaround, file a bug |
| Custom webpack config (module federation, WASM loaders) | `--webpack` flag |
| CI builds | Turbopack (default) — faster builds |

### React Compiler — what it replaces

The React Compiler auto-memoizes components and hooks. With `reactCompiler: true`:
- New manual `useMemo`, `useCallback`, and `React.memo` are rarely needed for rendering performance.
- Do not mechanically remove existing memoization. Keep it when it carries observable semantics
  (for example, stable identity consumed by an external library) or profiling proves it is needed.

### When to use `connection()`

| Scenario | Use `connection()`? |
|---|---|
| `NEXT_PUBLIC_` variable | No — inlined at build, available everywhere |
| Server value in an already dynamic Server Component or Route Handler | No — it is read at request time |
| Server value in a prerenderable route that differs without rebuild | Yes |
| Reading cookies/headers (already dynamic) | No — already opted into dynamic rendering |

## Never

- **No new `middleware.ts` for Node.js work** — use `proxy.ts`. Keep deprecated middleware only
  when the application genuinely requires the Edge runtime, which `proxy.ts` does not support.
- **No Prisma, no ORM** — all data goes through the API client (`src/lib/api/`).
- **No unstable or experimental API by default** — use one only when the task explicitly accepts
  its stability risk and the installed Next.js version is checked.
- **No `next lint`** — removed in v16. Run `npx eslint .` directly.
- **No speculative manual memoization** — let the React Compiler handle ordinary rendering
  optimization, but preserve memoization that has semantic or measured value.
- **No Cache Components APIs without the opt-in** — `'use cache'`, `cacheLife`, and `cacheTag`
  require `cacheComponents: true` and an intentional migration.
- **No Node.js 18** — minimum is 20.9. CI and Dockerfiles must pin `node:20` or higher.
- **No `pages/` directory** — App Router only. No Pages Router, no `getServerSideProps`, no `getStaticProps`.
- **No inline fetch** — all data fetching goes through `src/lib/api/client.ts`. See `api-client-pattern.md`.
- **No hardcoded strings in JSX** — every user-visible string uses `t()`. See `i18n-conventions.md`.
- **No physical Tailwind properties** — use logical: `ps-`/`pe-` not `pl-`/`pr-`, `ms-`/`me-` not `ml-`/`mr-`, `text-start`/`text-end` not `text-left`/`text-right`.
