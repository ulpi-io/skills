# HN Pre-Flight Gate (run before posting)

Run end to end at Step 6 and write the result into `CHECKLIST.md`. HN is **one-shot and unforgiving** —
do not post until every box can be honestly ticked. Several items are mechanical.

> If a single box can't be honestly ticked, it's not ready. Fix it, then re-run.

## A. The page survives the hug of death

- [ ] Landing/demo page is **static-friendly** (static-site generator or pre-rendered HTML), not a
      per-request DB/render/auth path.
- [ ] Behind a **CDN or HTTP cache**; verified a cache HIT on the exact URL you'll submit (`curl -I`).
- [ ] Lightweight (compressed/lazy images, no multi-MB hero; third-party widgets deferred/async).
- [ ] Load-tested to a few thousand concurrent reads (~1,000–2,000 req/s) without falling over.
- [ ] Tested from a **second network / mobile / incognito** — not just your laptop.

## B. Accessible without a wall (conversion + load)

- [ ] The demo/sandbox/repo is reachable with **ZERO signup, login, or email gate** (at least launch day).
- [ ] If it's a repo, the **README is the landing page** (clear, scannable, with a screenshot/gif).
- [ ] An honest "what it is" is clear above the fold in <10 seconds; a skeptical engineer can try the core
      value in under a minute.

## C. Title & post (anti-clickbait — mechanical)

- [ ] Title is exactly `Show HN: <name> – <plain, specific description>` (or, YC-only,
      `Launch HN: <Company> (YC SXX) – <tagline>`), **≤ 80 chars**.
- [ ] **Zero** hype: no ALL CAPS, no `!`, no "revolutionary/amazing/10x/game-changing", no editorializing.
- [ ] First comment is **ready** and pre-written: personal ("I built…"), what it does, why, the interesting
      technical bit, **honest limitations**, and one specific feedback ask.
- [ ] The post + first comment have **zero marketing-speak**; re-read and cut ~30% shorter.
- [ ] It's a real, non-trivial thing people can actually use — **not** a sign-up page, waitlist,
      newsletter, blog post, or quickly-generated one-off (it **qualifies** as a Show HN).

## D. Behavior & etiquette (zero tolerance — this is how you avoid a ban)

- [ ] You will **NOT** ask anyone (friends, team, Slack, Twitter, newsletter, users) to upvote or comment —
      **zero** solicitation. **Banned-phrase scan passes** across the post, first comment, and any sharing
      message (see `policy-compliance.md`).
- [ ] **No** friends posting booster comments; no vote ring; no "find my post" screenshots sent around;
      no sockpuppet/second accounts.
- [ ] **Not** coordinated with a press release / Product Hunt / other launch on the same day.
- [ ] You (or a teammate) are blocked off for **4–8 hours** to answer comments fast and in good faith.
- [ ] You will steel-man criticism, stay non-defensive, never snarky; **no AI-generated comments**.
- [ ] Posting at a high-traffic time you can fully attend (commonly ~8–9am US Eastern, early in the week).

## E. If it flops (sanctioned recovery only)

- [ ] You will **NOT** delete-and-repost and will **NOT** spam-repost.
- [ ] Plan: wait, improve the title/post/demo, and at most a small number of reposts (only if it never got
      real attention); optionally email `hn@ycombinator.com` for the second-chance pool — never gamed.

## Scored self-critique (calibrate — don't rubber-stamp)

Score 0–4 on each axis (4 = genuinely excellent; most real work lands 2–3): **title honesty & specificity ·
first-comment quality (technical, humble, limitations stated) · try-it friction (no wall) · page resilience ·
thread-readiness (availability + non-defensive plan) · compliance (zero solicitation)**.

- [ ] Total recorded (max 24). Any axis **≤ 2 → name the fix, apply it, re-score.**
- [ ] Revise-and-justify: for every change at this gate, state in one line WHAT changed and WHY. Do not
      post with an un-actioned axis ≤ 2 or any compliance/etiquette box unticked.
