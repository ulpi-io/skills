# UTM Scheme + Event Tracking

The attribution kit (Steps 1–4). UTM parameters are universal (any analytics tool reads them); the event
snippets below are GA4 — adapt to the project's real stack and **verify gtag syntax against current Google
docs** before pasting.

## UTM convention

One scheme, **lowercase, hyphenated**, no spaces, **no PII**:

| Param | Meaning | Example values |
|-------|---------|----------------|
| `utm_source` | the platform | `producthunt`, `hackernews` |
| `utm_medium` | the placement type | `launch`, `maker-comment`, `email`, `social`, `community` |
| `utm_campaign` | this specific launch | `ph-launch-2026-06` |
| `utm_content` | the exact link instance | `x-thread`, `linkedin`, `wave1-email`, `gallery-cta`, `maker-comment-link` |

## Per-link UTM map (tag every place a link appears)

| Where the link lives | Example tagged URL |
|----------------------|--------------------|
| Listing / gallery CTA | `https://site.com/?utm_source=producthunt&utm_medium=launch&utm_campaign=ph-launch-2026-06&utm_content=gallery-cta` |
| Maker first comment | `…&utm_medium=maker-comment&utm_content=maker-comment-link` |
| Launch-day email (wave 1) | `…&utm_medium=email&utm_content=wave1-email` |
| X / Twitter thread | `…&utm_medium=social&utm_content=x-thread` |
| LinkedIn post | `…&utm_medium=social&utm_content=linkedin` |
| Community heads-up | `…&utm_medium=community&utm_content=<community-name>` |

Hand these tagged links back to the listing and outreach skills so nothing ships untagged. Keep
`utm_source`/`utm_campaign` constant across the whole launch; vary `utm_medium`/`utm_content` per placement.

## The conversion funnel & events

Track the funnel to durable outcomes, not just visits:

| Step | Event | Notes |
|------|-------|-------|
| Visit | `page_view` | automatic in GA4 — carries the UTMs as traffic source |
| Signup | `sign_up` | GA4 recommended event; **mark as a conversion / key event** |
| Activation | a custom event, e.g. `activated` / `first_<value-action>` | the first real value moment; **mark as a conversion** |

## Wiring (GA4 / gtag — verify against current docs, adapt to the stack)

Fire the conversion events at the real moments (not on page load). Pattern:

```js
// on successful signup
gtag('event', 'sign_up', { method: 'producthunt-launch' });

// on the first activation moment (define what "activated" means for this product)
gtag('event', 'activated', { source: 'producthunt' });
```

- No PII in params (no email/name/id).
- Don't double-fire `page_view` or duplicate an existing tag manager — extend what's there.
- If the stack is Plausible/Fathom/PostHog, use its event API instead; the UTM scheme is unchanged.
- Respect the project's consent gating; don't bypass it.

## Validate & read out

- **Validate before launch:** GA4 **DebugView** (or **Realtime**) — trigger a signup on staging and
  confirm `sign_up`/`activated` fire with the right params; click a tagged link and confirm the
  source/medium resolve.
- **Read out after:** in GA4, segment by **Session source / medium** = `producthunt / *` to see launch
  traffic; view `sign_up` and activation conversions by source to get the **durable** result (emails +
  activated users), and the funnel conversion rate — the numbers that matter more than the upvote count.
