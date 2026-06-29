# Post-Launch (after the 24-hour window)

Load at Step 8. The window closes at midnight PT, but the leverage starts the next morning. The recurring
finding across every recent source: **Product Hunt is a distribution/visibility event, not a conversion
channel** — "most founders celebrate their ranking and watch MRR stay at zero." The job now is to (a) lock
in the social proof, (b) convert the warm spike into owned assets, and (c) keep the listing and product
alive. Treat the launch as the first touchpoint in a 30-day system.

## Lock in social proof — badge & embeds (days 1–2)

If you were featured / won Product of the Day/Week/Month / placed top-5, PH emails you and a badge appears
on your post. Claim the embed from your post (the down-arrow by the title, or the **Embed** option by the
share buttons); pick a theme (light/dark/neutral) and badge type — **Featured** (any featured launch) or
**Top Post** (top-5 for the day/week). The badge is a **live SVG served by PH** that keeps your upvote
count current — put it above the fold on your homepage, in your email signature, deck, and app-store /
landing pages. *"#1 Product of the Day"* is gold with customers, partners, and investors.

```html
<!-- Featured / Product of the Day badge (theme=light|dark|neutral) -->
<a href="https://www.producthunt.com/posts/YOUR_POST_SLUG?utm_source=badge-featured&utm_medium=badge" target="_blank">
  <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=YOUR_POST_ID&theme=light"
       alt="YourProduct - your tagline | Product Hunt" width="250" height="54" style="width:250px;height:54px;" />
</a>
<!-- Top Post badge if you placed top-5 (period=daily|weekly): use top-post-badge.svg?post_id=...&theme=light&period=daily -->
```

(There are also 7 named profile badges — Top Product, Gemologist, Veteran, Buddy System, Contributor,
Thought Leader, Tastemaker — plus secret ones; nice-to-have, not load-bearing.)

## Extend the reach — leaderboards, newsletters, Orbit

- **Leaderboards:** Day / Week (Mon–Sun) / Month are ranked by **"highest number of points"** — upvotes
  **plus** engagement (comments, shares). Engagement you generate *after* the first hours still feeds Week
  and Month placement, so **keep the thread alive all day and through the week.**
- **Newsletters (four):** **The Leaderboard** (daily, Mon–Fri), **The Roundup** (weekly recap, Sunday),
  **The Frontier** (weekly AI, Tuesday), and **The Breakpoint** (weekly developer tools, Wednesday).
  Editors curate from the homepage each morning; you can pitch **editorial@producthunt.co** (note the
  **.co**). A feature delivers a second traffic wave days after launch.
- **Orbit Awards (the Golden Kitty replacement):** **quarterly, category-based**, driven by **verified
  reviews** (extra weight on detailed and founder reviews) and hands-on testing — **not launch-day
  upvotes.** So the path to year-round recognition is getting into the **right category** and **driving
  high-quality reviews in the weeks after launch.**

## Convert the traffic spike (days 0–3 — where launches win or lose)

Day 1–3 drives ~60–75% of total PH traffic. The failure mode is almost never "PH didn't send traffic" —
it's that the **landing page / onboarding didn't convert it**. (Directional, founder-reported benchmarks,
not PH data: ~8–15% of day-1 visitors sign up; ~30–50% of signups activate within 7 days.) So:

- Make signup/trial the **obvious, low-friction first action** — everyone from PH is warm.
- Fire a **welcome email immediately** that drives to the product's "aha moment"; strip onboarding friction.
- Consider a **PH-specific landing path or launch-week offer** (available to all — never tied to a vote).
- Build a **retargeting audience** from the spike; bring visitors back with follow-ups/ads.
- Wire this with the `launch-analytics` skill so you actually see signups by source, not just upvotes.

## Thank-yous & repurposing (days 1–14)

- **Thank supporters personally** — individual replies/DMs to upvoters and commenters (not a generic
  "thanks!") build partnerships. Post a **public thank-you** in your thread crediting the PH team, your
  supporters, commenters, and even your critics; name the feedback themes you're acting on.
- **Repurpose while fresh:** turn your intro + best comments into a case study/blog post; publish a
  "we won Product of the Day" social post tagging supporters; pitch the launch story to relevant
  newsletters/podcasts. For **press, the window is ~2 weeks** — lead with a concrete proof point (rank,
  votes, signups), not "we launched".

## Ongoing presence & re-launching

- Keep the listing alive: reply to every comment, support other launches, ship visibly. Under the Orbit
  regime, **actively cultivate reviews** (detailed + founder) — they drive category leaderboards long
  after launch day.
- **Re-launch rules (official):** wait **at least 6 months** between posts for the same product/company
  **and** have a **significant update** (a new mobile app or a complete redesign with new functionality
  qualifies; new UIs, pricing changes, or minor tweaks do **not**). Request early approval at
  **hello@producthunt.com** for major/pivot-level changes. A re-launch **starts fresh — votes don't carry
  over.**

## If it's flopping (contingency)

Rank slipping or low traffic is not the moment to break the rules. **Do not** panic-blast, buy votes, or
beg — that risks the post. Instead: keep replying to every comment (engagement still feeds Week/Month),
fire a held-back outreach wave, post a "midday update" comment summarizing real feedback, and lean into
**genuine conversation**. A modest rank with a live thread and converted signups beats a higher rank you
got removed for gaming. Remember the real prize is the traffic, the emails, and the social proof — not the
badge.
