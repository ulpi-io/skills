# After Posting: the Spike, Failure Modes, the Second-Chance Pool

Load at Step 7. When a Show HN climbs, two things hit at once — a fast traffic spike (the "hug of death")
and a live, skeptical audience. Both are mostly won **before** you post.

## Survive the spike (the hug of death)

A front-page post typically climbs from `/newest` in ~1–2h, peaks ~3h after submission, plateaus through
hours 3–9, then decays — commonly **5,000–50,000 visitors over ~48h** (one documented case: ~15k–24k over
20h; order-of-magnitude, not a guarantee). Your page must absorb a few thousand concurrent reads:

- Serve a **static/pre-rendered, cacheable** page behind a CDN/HTTP cache — not a per-request DB/render or
  auth path. (A Hugo+Varnish/CDN setup served ~1,600–2,300 req/s at >99% cache hit on one cheap node; the
  bottleneck was the network, not the box.)
- Keep it **lightweight** (compressed/lazy images, deferred third-party widgets); test from a second
  network / mobile / incognito, and load-test to ~1,000–2,000 req/s before posting.

## Convert it for what HN actually gives you

HN traffic **converts poorly** by funnel standards (~78% bounce, often <1% signup). The win is **feedback,
credibility, backlinks, and a few high-quality leads** (a "strong" dev-tool launch is often ~10–20
high-value leads / 72h), not raw signups. Two rules:

- **No signup/login wall** — Show HN: make it easy to try *"without barriers such as signups or emails"*;
  Launch HN: *"Remove signup barriers, at least for launch day — you'll get more and better feedback."* A
  wall kills conversion **and** concentrates the spike on your slowest, least-cacheable code.
- Give a frictionless try-it path (live demo / sandbox / a README that *is* the landing page) and capture
  the few high-intent users (`launch-analytics` measures this).

## If it flops (sanctioned recovery only)

Sinking on `/newest` is common. The etiquette is strict:

- **Do NOT delete-and-repost** — *"Please don't delete and repost. Deletion is for things that shouldn't
  have been submitted in the first place."* And don't spam-repost.
- The FAQ allows only *"a small number of reposts"* and only if a story *"[has] not had significant
  attention in the last year or so."*
- The **second-chance pool** is the only sanctioned redo: dang describes it as *"a way to give links a
  second chance at the front page"* — reviewers comb old submissions *"in the spirit of the site"* and
  software *"randomly picks one… and lobs it randomly onto the lower part of the front page"* (titles/
  timestamps refreshed). You can email **hn@ycombinator.com** to ask them to consider a post, but **you
  cannot game it** — its whole purpose is anti-repetition.
- Practical move after a flop: **wait, improve** the title/post/demo from what you learned, and try once
  more another day — not a barrage.

## The biggest failure modes (avoid every one)

- **Asking for upvotes / mobilizing a vote ring** — the top reputation-killer. Launch HN: *"Make sure your
  friends don't post booster comments. That's not allowed on HN"* — *"It is the worst mistake you can make
  on HN!"* Note: some popular launch guides tell you to text friends a screenshot so they can find and
  upvote your post — **that is a vote ring; it's a trap, not a tactic** (see `policy-compliance.md`).
- **Clickbait / marketing-speak titles** — a technical crowd sees through them, and HN strips hype from
  titles. Use a plain, specific, descriptive title (works: *"Show HN: PromptTools – open-source tools for
  evaluating LLMs and vector DBs"*; flops: the salesy rewrite).
- **Launching unfinished or with a broken/inaccessible demo** — wastes the one shot.
- **Going silent or defensive in the thread** — Launch HN: *"reply when comments start appearing… don't
  leave the thread for long without answering."* Be present, answer fast, steel-man criticism, never snarky;
  no AI-generated comments.
- **Coordinating with press/PR/other launches** — Launch HN: *"Don't coordinate your HN launch with other
  events, e.g. press articles."* It looks manufactured and dilutes the organic thread.

> See `preflight-gate.md` for the full readiness checklist that turns these into a go/no-go.
