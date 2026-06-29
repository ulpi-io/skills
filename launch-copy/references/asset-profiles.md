# Asset Profiles

How to read the profile a caller passes, plus baseline profiles per channel for standalone use. When a
launch skill invokes you it passes the **authoritative** profile (with current limits) — use it verbatim.
These baselines are for running standalone; if a number might be stale, confirm against the platform skill
or the live form.

## Reading a profile

For each asset, you're given: `id`, `purpose`, `limit` (hard char/word cap), `versions` (how many angle
variants), and `notes` (format / skeleton / examples). Draft within the limit, in the profile's `voice`,
obeying every `compliance` rule. If a field is missing, infer a sensible default and **state it**.

## Product Hunt (baseline — the `launch-product-hunt` skill passes exact specs)

```
channel: product-hunt
voice: benefit-led, concrete, no hype; humble + helpful (not marketing-speak)
compliance: NEVER solicit upvotes; ask for feedback/comments instead. No "please upvote" anywhere.
assets:
  - id: tagline        limit: 60 chars   versions: 3–5   notes: outcome-first; PH's only rule = "no gimmicks/over-the-top". Count chars.
  - id: description    limit: 500 chars  versions: 2   notes: mirror the tagline outcome + who it's for + 1–2 concrete capabilities.
  - id: gallery-headlines  versions: 1   notes: one outcome-led headline per slide (hero→workflow→outcome→proof→CTA); the platform skill owns the shot-list.
  - id: first-comment  versions: 1   notes: fill the maker-comment skeleton below in PH voice; end on a genuine question; NEVER ask for upvotes.
```

**PH maker first-comment skeleton:** intro → why we built it (origin/problem) → what it does (3 outcome-led
bullets) → what's different → where we're at (honest) → pricing/PH offer (tied to *trying*, not voting) →
1–2 specific feedback questions → thanks + try-it link.

## Hacker News (baseline — the `launch-hacker-news` skill passes exact specs)

```
channel: hacker-news
voice: technical, humble, plain; NO hype, NO marketing-speak, NO emoji. Engineers smell spin instantly.
compliance: NEVER ask for upvotes or mobilize voters (HN penalizes this harder than PH). State facts, invite critique.
assets:
  - id: title    format: "Show HN: <thing> – <plain, literal description>"   notes: no clickbait, no "revolutionary". Say exactly what it is.
  - id: first-comment  versions: 1   notes: what it is, why you built it, the honest tradeoffs/limits, the stack, an explicit ask for feedback. Be ready to answer hard questions.
```

## Directory listings (baseline)

```
channel: directory
voice: clear, benefit-led, scannable
assets:
  - id: one-liner   limit: ~60 chars   versions: 4 (A/B/C/D — feature/benefit/comparison/audience)
  - id: short-desc  limit: 150–300 chars   versions: 2
  - id: long-desc   limit: 400–600 chars   versions: 2
  - id: tags        notes: 5–10 relevant category tags
```
For multi-platform directory copy, the dedicated directory-submission workflow owns the per-platform field
maps; this skill drafts the reusable A/B/C/D copy tiers it fills in.

## Landing hero (baseline)

```
channel: landing
voice: match the product's brand voice (see .ulpi/design/DESIGN.md if present)
assets:
  - id: hero-headline   versions: 4   notes: benefit-led; the single clearest value line.
  - id: subhead         versions: 2   notes: who it's for + the proof or the how.
  - id: primary-cta     versions: 3   notes: action verb; what happens next.
```

## If no profile is given

Standalone with no profile: ask the channel + product + assets, then build a profile from the matching
baseline above and proceed.
