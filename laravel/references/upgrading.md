# Laravel 13 Version Selection and Upgrade

## Recommendation

Use Laravel 13 for new applications. It is the current stable major and receives a longer support
window than Laravel 12. Declare `laravel/framework:^13.0`; let Composer and the lockfile resolve the
current compatible release rather than pinning a patch version in project guidance.

For existing applications, detect the installed version before writing code:

```bash
composer show laravel/framework
```

Also read `composer.json` and `composer.lock`. An ordinary bug fix or feature does not authorize a
major-version upgrade. Keep using the installed major unless the task explicitly includes the upgrade.

## New API-only application

Update the installer, create the app, and install the API surface:

```bash
composer global update laravel/installer
laravel new example-api
cd example-api
php artisan install:api
```

`install:api` installs Sanctum and creates `routes/api.php`. If the application is strictly API-only,
remove unused web route registration, views, and frontend dependencies as a separate, reviewed step.

Use these baseline constraints:

```json
{
  "require": {
    "php": "^8.3",
    "laravel/framework": "^13.0",
    "laravel/tinker": "^3.0"
  },
  "require-dev": {
    "laravel/boost": "^2.0",
    "pestphp/pest": "^4.0",
    "phpunit/phpunit": "^12.0"
  }
}
```

The project stack standard remains PHP 8.4, but Laravel 13 supports PHP 8.3 through 8.5. Keep local,
CI, container, and production PHP versions aligned.

## Upgrade Laravel 12 to 13

### 1. Prove package compatibility

- Inspect direct and transitive Laravel constraints with `composer why-not laravel/framework ^13.0`.
- Upgrade framework-coupled packages deliberately. This skill's baseline uses Boost 2, Pest 4,
  PHPUnit 12, Tinker 3, and Filament 5.
- Update the Laravel installer if it is used to create or refresh application scaffolding.

Laravel Boost 2 can guide the upgrade from a Laravel 12 application. After installing/updating Boost
as a development dependency, invoke `/upgrade-laravel-v13` in a supported coding client. Treat the
generated changes as an upgrade proposal: review the diff and run the same checks as a manual upgrade.

### 2. Update dependency constraints

Update the relevant constraints, then resolve them together:

```bash
composer update --with-all-dependencies
```

Do not hand-edit `composer.lock`. Review package removals, major upgrades, Composer scripts, and
published configuration changes before accepting the resolution.

### 3. Audit Laravel 13 behavior changes

Check each item that exists in the application:

| Surface | Laravel 13 check |
|---|---|
| Request forgery protection | Replace direct `VerifyCsrfToken` / `ValidateCsrfToken` references with `PreventRequestForgery`; the old names are deprecated aliases. Stateless API routes are unaffected, but web and Filament middleware/tests may be affected. |
| Cache safety | Keep `serializable_classes` false unless cached objects are intentional; allow-list only the required classes. |
| Cache/session naming | Framework fallback cache, Redis, and session names now use hyphenated suffixes. Set explicit prefixes/cookie names if continuity matters during rollout. |
| MySQL/MariaDB upserts | Pass a non-empty `uniqueBy`; Laravel 13 rejects an empty value. Ensure the database has matching primary/unique indexes. |
| Joined MySQL deletes | Review deletes that combine joins with `orderBy` or `limit`; Laravel 13 now compiles those clauses and the database may reject the resulting SQL instead of ignoring them. |
| Queue events | Replace `JobAttempted::$exceptionOccurred` with `JobAttempted::$exception`, and `QueueBusy::$connection` with `$connectionName`. |
| Custom queue drivers | Implement the newly declared queue-size contract methods when the application owns a driver. |
| Domain routing | Explicit-domain routes now take precedence over non-domain routes; test overlapping and catch-all domains. |
| Tests using `Str` factories | Re-register custom UUID, ULID, or random-string factories in each test/setup because Laravel resets them during teardown. |
| Container calls | Nullable class defaults passed through `Container::call` now remain `null` when no binding exists. |
| Model boot hooks | Do not instantiate the same model while it is still booting; Laravel 13 throws a `LogicException`. |

### 4. Adopt new APIs selectively

- Use `JsonApiResource` only for an explicit JSON:API contract. Existing `JsonResource` envelopes do
  not need to migrate.
- Use `Queue::route(...)` for central job-to-connection/queue defaults when it removes repeated
  dispatch configuration.
- Use Laravel 13 queue/controller attributes only when they improve the project's existing convention;
  supported property and route middleware patterns remain valid.
- Use `laravel/ai` for product AI features. Laravel's native vector columns and vector query methods
  require PostgreSQL with `pgvector`; they are not available on this skill's default MySQL stack.

## Verification

Run the project's real scripts when they exist. A typical Laravel 13 upgrade gate is:

```bash
composer validate --strict
php artisan about
php artisan route:list
php artisan test
composer lint
composer analyse
composer audit
```

Also exercise queue workers, scheduled tasks, auth/Filament flows, cache continuity, and deployment
health checks when those surfaces changed. Run the application on the same PHP minor used in
production.

## Never

- Never silently upgrade a framework major during unrelated work.
- Never claim Laravel 13 compatibility from a successful Composer resolution alone; run regression
  checks for the application surfaces above.
- Never pin today's patch version in the skill or application guidance; use `^13.0` plus a committed
  lockfile.
- Never run the Boost upgrade command without reviewing its changes.
- Never assume every Laravel ecosystem package supports Laravel 13; prove constraints first.
