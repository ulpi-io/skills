# Filament Integration Boundary

## What

This Laravel 13 stack uses **Filament 5** for the optional `/admin` panel. Filament-specific resources,
schemas, forms, tables, actions, filters, relation managers, widgets, panels, and tests belong to the
separate `laravel-filament` skill. Load that skill for any panel implementation; do not recreate a
Filament cookbook here.

Filament 5 supports Laravel 13 (its framework requirement is Laravel 11.28+) and requires PHP 8.2+.
Install the panel builder with:

```bash
composer require filament/filament:"^5.0"
php artisan filament:install --panels
```

The panel provider is registered in `bootstrap/providers.php`. Keep the panel's session, cookie, and
request-forgery middleware isolated from stateless `routes/api.php` routes.

## Laravel-owned boundaries

Use this Laravel skill for the code underneath Filament:

| Concern | Laravel reference |
|---|---|
| Mutations and orchestration | `service-layer.md` Actions |
| Models, casts, relationships, strict mode | `eloquent-models.md` |
| Policies and permissions | `auth.md` |
| Files and private S3 storage | `file-storage.md` |
| Queued work | `queues-jobs.md` |
| Application-level tests | `testing.md` |

Filament Resources call Actions; they do not own business logic. Policies remain the authorization
source of truth. Keep API Form Request validation and Filament form validation separate because they
serve different entry points.

## Laravel 13 compatibility

- Use `Illuminate\Foundation\Http\Middleware\PreventRequestForgery` for direct CSRF middleware
  references. `VerifyCsrfToken` and `ValidateCsrfToken` are deprecated aliases in Laravel 13.
- Keep Filament at `^5.0`; do not copy Filament 3 namespaces or examples into a Laravel 13 project.
- Verify every third-party Filament plugin declares compatibility with both Filament 5 and Laravel 13
  before updating the framework.
- Preserve `php artisan filament:upgrade` in Composer's `post-autoload-dump` hook so published assets
  stay synchronized after dependency updates.

## Never

- Never use this reference as a substitute for the `laravel-filament` skill.
- Never use Filament v3 `Forms\Form`, `Tables\Table::actions()`, or old action namespaces in new work.
- Never put domain logic in a Filament Resource, Page, or table Action; delegate to application Actions.
- Never expose the panel without production authorization and private storage configuration.
