# Error Handling — Boundaries, Recovery, Structured Logging

## What

Next.js 16.2 uses React error boundaries to catch rendering errors at any route segment. Every route can have an `error.tsx` (catches errors in its subtree), a `not-found.tsx` (handles missing resources), and `global-error.tsx` at the root for layout-level failures. For fine-grained async recovery, use native `try/catch` and either rethrow, return fallback content, or redirect outside the protected operation.

All error boundaries are Client Components (`'use client'` required). All user-facing messages use `t()`. All errors are logged server-side via pino before reaching the boundary — see `references/logging.md`.

## How

### error.tsx — route-level error boundary

```tsx
// src/app/[locale]/products/error.tsx
'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function ProductsError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-xl font-semibold">{t('error.generic')}</h1>
      <p className="text-muted-foreground">{t('error.tryAgain')}</p>
      <Button onClick={() => reset()}>{t('button.retry')}</Button>
    </main>
  );
}
```

- `'use client'` is mandatory — error boundaries must be Client Components.
- Never render `error.message` to the user — may contain stack traces or internal details.
- `reset()` re-renders the route segment. If the transient issue is resolved, the page recovers.
- `digest` is a server-generated hash safe for client-side log correlation.

### global-error.tsx — root layout error boundary

```tsx
// src/app/global-error.tsx
'use client';
export default function GlobalError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // NextIntlClientProvider is in locale layout — may have crashed. Hardcoded strings only.
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            onClick={() => reset()}>Try again</button>
        </main>
      </body>
    </html>
  );
}
```

Must render its own `<html>` and `<body>` — replaces the entire page. Only active in production.

### Fine-grained async error handling

```typescript
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getProduct } from '@/lib/api/endpoints/products';
import { logger } from '@/lib/logger';

type Props = PageProps<'/[locale]/products/[slug]'>;

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'products' });

  let product: Awaited<ReturnType<typeof getProduct>>;
  try {
    product = await getProduct(slug, locale);
  } catch (error) {
    logger.error({ err: error, slug, locale }, 'Failed to fetch product');
    throw error; // Let error.tsx handle rendering
  }
  if (!product) notFound();

  return <main><h1>{product.name}</h1><p>{t('detail.description')}</p></main>;
}
```

Log structured context (entity ID, locale) before deciding to rethrow, call `notFound()`, or render
fallback content. Keep `notFound()` and `redirect()` outside the `try` body because they throw
framework-controlled errors.

Next.js 16.2 also introduces experimental `unstable_catchError()` and `unstable_retry()` for
component-level error boundaries. They are not a promise-tuple utility and are not the default for
this skill. Use them only when the task explicitly accepts an unstable API and the installed version
has been verified.

### not-found.tsx — depth and placement

```tsx
// src/app/[locale]/products/[slug]/not-found.tsx
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export default async function ProductNotFound() {
  const t = await getTranslations('products');
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-xl font-semibold">{t('notFound.heading')}</h1>
      <p className="text-muted-foreground">{t('notFound.description')}</p>
      <Link href="/products">{t('notFound.backToProducts')}</Link>
    </main>
  );
}
```

`notFound()` walks up the tree to the nearest `not-found.tsx`. Place it at the segment where the 404 UI should appear:

```typescript
const product = await getProduct(slug, locale);
if (!product) notFound();  // Triggers products/[slug]/not-found.tsx
```

### Error logging — structured context via pino

```typescript
import { logger } from '@/lib/logger';

try {
  await updateProduct(productId, data);
} catch (error) {
  logger.error({ err: error, productId, action: 'updateProduct' }, 'Product update failed');
  return { success: false, error: 'products.updateFailed' };
}
```

Log before the error reaches the boundary — boundaries are Client Components and cannot call pino. See `references/logging.md` for levels and PII rules.

### Error boundary composition

```
src/app/[locale]/dashboard/
  error.tsx               ← catches errors in any dashboard child route
  page.tsx
  analytics/
    error.tsx             ← analytics-specific errors (granular recovery)
    page.tsx
  settings/
    page.tsx              ← falls through to dashboard/error.tsx
```

Each `error.tsx` catches its subtree only. **Important**: `error.tsx` does NOT catch errors in `layout.tsx` at the same level — layout errors bubble to the parent segment's boundary.

### Recovery patterns

**Retry** — `reset()` re-renders the Server Component tree (transient failures):
```tsx
<Button onClick={() => reset()}>{t('button.retry')}</Button>
```

**Fallback content** — non-critical section fails, page still renders:
```tsx
async function RecentActivity({ userId }: { userId: string }) {
  const t = await getTranslations('dashboard');
  try {
    const activity = await getRecentActivity(userId);
    return <section><h2>{t('activity.heading')}</h2>{/* items */}</section>;
  } catch (error) {
    logger.warn({ err: error, userId }, 'Recent activity unavailable');
    return <p className="text-muted-foreground">{t('activity.unavailable')}</p>;
  }
}
```

Log as `warn` (degraded), not `error`. Use when a widget can fail without breaking the page.

**Redirect** — recovery impossible:
```typescript
try {
  return await criticalOperation();
} catch (error) {
  logger.error({ err: error }, 'Critical failure, redirecting');
}
redirect('/');
```

## When

### Choosing the strategy

```
Error occurred →
├─ During render?          → Let error.tsx handle it automatically
├─ Async op needing log?   → try/catch → log → rethrow or fallback
├─ Resource not found?     → notFound() → not-found.tsx
├─ Non-critical section?   → try/catch → log warn → fallback content
├─ Unrecoverable?          → try/catch → log error → redirect outside try
└─ Root layout crashed?    → global-error.tsx (last resort)
```

### Where to place error.tsx and not-found.tsx

| Situation | Placement |
|-----------|-----------|
| Base error recovery for all routes | `src/app/[locale]/error.tsx` |
| Section can fail independently | `src/app/[locale]/dashboard/analytics/error.tsx` |
| Detail page entity lookup | `src/app/[locale]/products/[slug]/not-found.tsx` |
| Root layout might crash | `src/app/global-error.tsx` — always present |

### Boundary vs try/catch

| Context | Use |
|---------|-----|
| Render failure with route-level recovery | Throw and let the nearest `error.tsx` handle it |
| Server Component needing structured logging or local fallback | Native `try/catch` |
| Server Action with sequential operations | `try/catch` — maps to `ActionResult` error shape |
| Single await, only need to re-throw | Neither — let boundary handle it |

## Never

- **No rendering `error.message` to users.** May contain stack traces, SQL, or internal details. Show translated `t()` messages only.
- **No `error.tsx` without `'use client'`.** Fails silently in production — the boundary will not activate. Most common mistake.
- **No logging PII in error context.** Log entity IDs, action names, digests. Never email, name, IP, or request bodies. See `references/logging.md`.
- **No `global-error.tsx` with translation providers.** The layout providing `NextIntlClientProvider` has crashed. Use hardcoded fallback strings.
- **No `notFound()` inside try/catch.** Like `redirect()`, it throws internally. Catching it prevents the not-found page from rendering.
- **No skipping `error.tsx` at the locale root.** Without it, unhandled errors show the default Next.js error page — no translations, no retry.
- **No invented stable `catchError()` promise helper.** In 16.2, `unstable_catchError()` is an
  experimental Client Component boundary API, not a tuple-returning async helper.
- **No silently swallowed `try/catch`.** Always log before rendering fallback content. Silent
  failures hide bugs.
- **No error handling in Client Components for server data.** Data fetching is in Server Components. Boundaries catch render failures. Clients receive resolved props.
