# Next.js Stable Version Selection and Upgrade

## Recommendation

Use the **stable Next.js 16.2 line** for new applications. On 2026-07-20, both the npm `latest`
dist-tag and the official GitHub release marked **16.2.10** as latest. Treat that patch number as a
verification snapshot, not a permanent pin: create with `create-next-app@latest`, resolve from the
stable `latest` tag, and commit the resulting lockfile.

On the same verification date, Next.js 16.3 existed only as a prerelease. Do not recommend
`next@canary` or any prerelease by default. Prereleases are appropriate only when the user explicitly
accepts prerelease churn to test a specific fix or feature.

For an existing application, inspect the declared and resolved versions before writing code:

```bash
# Read package.json and the active lockfile first, then use the project's package manager.
pnpm why next
node -p "require('next/package.json').version"
```

An ordinary feature or bug fix does not authorize a framework upgrade. Follow the installed major
and minor unless the request includes the upgrade.

## New App Router application

Let the official generator choose a compatible Next.js, React, TypeScript, and ESLint set:

```bash
pnpm create next-app@latest
```

For this skill's architecture, select TypeScript, ESLint, the App Router, `src/`, and the `@/*`
alias. After generation, keep the resolved stable version in the lockfile. Enable these options only
after understanding their scope:

- `typedRoutes: true` is the recommended type-safety default.
- `reactCompiler: true` is a stable opt-in that can increase compile time.
- `cacheComponents: true` is an architectural opt-in for Cache Components and Partial
  Prerendering; it changes rendering and caching behavior and is not required by Next.js itself.

## Upgrade paths

### Application already on Next.js 16.1 or newer

Use the built-in upgrade command, which targets stable releases by default:

```bash
pnpm next upgrade
```

Review dependency, config, codemod, and lockfile changes before accepting them.

### Next.js 15 or older

Use the official upgrade codemod, then review every transformation:

```bash
pnpm dlx @next/codemod@canary upgrade latest
```

The codemod package is published from the canary channel, but `upgrade latest` targets the stable
Next.js release. If dependencies still need a manual update:

```bash
pnpm add next@latest react@latest react-dom@latest
pnpm add -D @types/react@latest @types/react-dom@latest
```

In a workspace, run these commands in the actual application package and verify its package name
before applying a package-manager filter.

## Next.js 15 to 16 checklist

Audit every item that exists in the application:

| Surface | Next.js 16 requirement |
|---|---|
| Runtime | Node.js 20.9+; align local, CI, container, and production versions. |
| TypeScript and browsers | TypeScript 5.1+; supported browser floor is Chrome/Edge/Firefox 111+ and Safari 16.4+. |
| Async request APIs | Await `cookies()`, `headers()`, `draftMode()`, page/layout/route `params`, and page `searchParams`; synchronous compatibility is removed. |
| Generated route types | Run `next typegen`; use global `PageProps`, `LayoutProps`, and `RouteContext` without importing them. |
| Metadata routes | Await generated `id` values passed to sitemap and image functions; image function `params` are async. |
| Bundler | Turbopack is the default for `next dev` and `next build`; move `experimental.turbopack` to top-level `turbopack`, or use `--webpack` while migrating a real custom Webpack dependency. |
| Linting | Replace `next lint` and removed `next.config` `eslint` options with the ESLint CLI and native flat config. |
| Request interception | Rename `middleware.ts` / `middleware()` to `proxy.ts` / `proxy()` for the Node.js runtime. Keep deprecated middleware only when an Edge runtime is genuinely required; `proxy` cannot run on Edge. |
| Proxy flags | Rename options such as `skipMiddlewareUrlNormalize` to `skipProxyUrlNormalize`. Keep `export const config = { matcher: ... }` in `proxy.ts`. |
| Cache Components | Remove `experimental.dynamicIO` and `experimental_ppr`. Adopt `cacheComponents: true` only through an explicit Cache Components migration. |
| Cache invalidation | Pass a profile to `revalidateTag(tag, profile)`; use `updateTag()` only in Server Actions and `refresh()` only to refresh the client router from a Server Action. |
| Images | Review local image query strings (`images.localPatterns.search`), the 4-hour `minimumCacheTTL` default, changed `imageSizes` defaults, and stricter quality configuration. |
| Parallel routes | Add an explicit `default.tsx` to every parallel route slot; Next.js 16 fails builds when it is missing. |
| Runtime config | Replace removed `serverRuntimeConfig`, `publicRuntimeConfig`, and `next/config` usage with environment variables. Use `connection()` when a prerenderable route must read a server value at request time. |
| Removed features | Remove AMP APIs and obsolete `devIndicators` options. |

Do not enable Cache Components, React Compiler, View Transitions, or another opt-in merely because a
codemod exposes it. Each has a separate migration or build/runtime tradeoff.

## Next.js 16.2 capabilities

Use these only when the task needs them:

- The stable Adapters API uses top-level `adapterPath` and is for deployment platforms or custom
  build integrations, not ordinary application code.
- `<Link transitionTypes={['...']}>` and router `transitionTypes` integrate with React View
  Transitions only when `experimental.viewTransition` is enabled.
- `next start --inspect` attaches a debugger to the production server.
- `unstable_catchError()` and `unstable_retry()` remain experimental in 16.2. Prefer normal route
  error files and `reset()` unless the task explicitly accepts an unstable API.

## Verification

Run project scripts when they exist. A typical gate after a Next.js upgrade is:

```bash
pnpm exec next typegen
pnpm exec eslint .
pnpm exec tsc --noEmit
pnpm test
pnpm exec next build
```

Also smoke-test proxy matchers, authentication, locale routing, Server Actions, cache invalidation,
image routes, metadata routes, and the real deployment adapter or self-hosting path when changed.
Verify both the manifest constraint and the resolved lockfile version.

## Never

- Never silently upgrade Next.js during unrelated work.
- Never recommend a canary because it has a larger version number than the stable release.
- Never claim compatibility from dependency installation alone; run type generation and a production
  build.
- Never copy Next.js 16-only APIs into a project that still resolves an older major.
- Never convert Edge middleware to Node.js proxy without checking runtime-dependent packages.
- Never enable Cache Components as a mechanical config rename; migrate and test its rendering model.

## Official sources

- [Next.js 16.2 release](https://nextjs.org/blog/next-16-2)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js upgrading guide](https://nextjs.org/docs/app/guides/upgrading)
- [Next.js releases](https://github.com/vercel/next.js/releases)
