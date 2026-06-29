# Launch Copy Craft

The general rules behind every asset (Steps 1, 3, 4). Channel-specific limits live in
`asset-profiles.md`; the angle framework lives in `angles.md`.

## Ground it first (or it's worthless)

Copy that isn't grounded in the real product reads generic and the launch underperforms. Before drafting:

- Read `.ulpi/launch/positioning.md` if it exists; reuse it.
- Else **visit the live site** with the `browse` skill and pull the real headline, value prop, feature
  names, screenshots, and proof points; read the README / docs; read `project-context.md` (Sections 1–9)
  and `.ulpi/design/DESIGN.md` if present.
- Capture the **top 3 differentiators** in the user's own words, plus concrete proof (real users,
  numbers, funding, "as seen on") — only what's actually true.

**Never invent** features, metrics, customers, awards, or quotes. If you can't confirm it, leave it out.

## Lead with the benefit, not the mechanism

The reader cares about the outcome, not your stack. Convert features → outcomes:

| Feature (don't lead with) | Outcome (lead with) |
|---------------------------|---------------------|
| "Built with React + a vector DB" | "Find any doc in your workspace in seconds" |
| "AI-powered automation engine" | "Turn 2 hours of reporting into 2 minutes" |
| "Real-time collaborative editor" | "Stop emailing v7_final.docx around" |

Exception: a **technical audience** (e.g. Hacker News) wants the mechanism and the honest tradeoffs —
follow the voice the asset profile specifies.

## Be specific; pass the cold-read test

- One concrete noun or number beats three adjectives. "Cut meetings 40%" > "boost productivity".
- Name **who it's for** when it isn't obvious.
- **Cold-read test:** would someone who has never seen the product understand it from this line alone? A
  good gut-check: read it cold to a few people who've never seen the product. If they squint, rewrite.

## Banned slop tells (delete on sight)

- Empty superlatives: "the best", "revolutionary", "world-class", "next-generation", "seamless".
- Buzzword soup: "AI-powered synergy platform", "all-in-one solution that empowers".
- Stack-dropping in a benefit line: "a project management tool built with React".
- Vague who/what: a tagline that could describe any product in the category.
- Emoji and hype **when the voice forbids them** (most technical channels; PH taglines).
- Fabricated precision (made-up percentages or user counts).

## Honor limits and voice to the letter

- Every hard limit is a **hard** limit — count characters and stay under it. Over-limit copy is a defect.
- Match the requested voice exactly: "benefit-led, no hype" and "technical, humble, no marketing-speak"
  produce very different lines for the same product.
- If the profile carries a compliance rule (e.g. "never solicit upvotes", "no superlatives"), it overrides
  everything — scan the final draft for violations before returning.

## Always give options + a recommendation

Draft 3–4 versions across distinct angles (`angles.md`), not four rewordings of one. Mark one
**recommended** and say in one line why (e.g. "clearest cold-read; names the audience"). The user picks;
you make the pick easy.

## Reuse the work

Copy drafted here should be reusable: the first-comment/launch-post doubles as a blog post or social
thread; the long description seeds the directory listings. Write the product brief once to
`.ulpi/launch/positioning.md` and every channel and launch skill reuses it.
