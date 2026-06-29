# How Hacker News Works (ranking, /newest, second-chance, timing)

Load at Step 4 for timing and the front-page dynamics. HN deliberately does **not** publish its exact
algorithm; the FAQ is the authority and warns: *"You can't derive rank from votes and time alone."* Treat
every precise formula/constant below as **reverse-engineered from old source, not official.**

## Ranking (official shape + the reconstructed formula)

**Official (FAQ, verbatim):** *"The basic algorithm divides points by a power of the time since a story
was submitted. Comments in threads are ranked the same way. Other factors affecting rank include user
flags, anti-abuse software, software which demotes overheated discussions, account or site weighting, and
moderator action."*

**Reconstructed (NOT official — from old Arc source; constants have changed):**

```
score ≈ (points - 1)^0.8 / (age_in_hours + 2)^1.8 × penalties     # gravity ≈ 1.8
```

- **Age dominates:** the exponent on time (~1.8) is higher than on votes (~0.8), and a new post is treated
  as ~2 hours old at birth — so **votes that arrive *fast* are worth far more than the same votes arriving
  slowly**, and every post inevitably decays down over hours.
- **"Points" ≠ raw upvotes:** *"Some votes are dropped by anti-abuse software"* (FAQ), and the penalties
  above subtract further.
- **Reconstructed penalties** (mechanisms the FAQ confirms; exact numbers unverified): a **no-URL/self-post
  penalty** (text-only posts demoted), **domain/site penalties** (*"account or site weighting"*), and a
  **flamewar penalty** that demotes threads with far more comments than points (one old reconstruction:
  more comments than upvotes and ≥ ~40 comments).

## /newest → the front page

Every submission lands on **`/newest`** first; only **~10%** of stories reach the front page. The jump is
decided by **early upvote velocity in the first ~1–2 hours** (mechanically forced by the age-decay shape)
— plus a large dose of luck that HN and the community emphasize. HN does **not** publish velocity
thresholds (heuristics like "10 upvotes in 15 min" are secondary-blog estimates, not official). The
compliant lever is simply: post a genuinely good, tryable thing, post the first comment immediately, and be
present — never recruit the early votes (see `policy-compliance.md`).

## How a Show HN surfaces

A Show HN has **two surfaces**: it appears immediately on `/newest` and `/shownew`, but must clear a
**small points threshold** before it appears on the curated **`/show`** page (a gate regular stories don't
have), while still competing for the main front page via the ranking formula. A Show HN with a **working
demo URL is favored** over a pure text post (the no-URL penalty).

## The second-chance pool (the only sanctioned redo)

dang (verbatim): *"HN's second-chance pool is a way to give links a second chance at the front page.
Moderators and a small number of reviewers go through old submissions … These get put into a hopper from
which software randomly picks one every so often and lobs it randomly onto the lower part of the front
page."* (Running since late 2014; the re-upped story shows a **rolled-back timestamp**.)

- You may **suggest** a post (yours or, preferably, someone else's) by emailing **hn@ycombinator.com** —
  *"We love getting those requests and usually add them to the pool."*
- You **cannot game the placement** (it's random) — it's a human-curation step, not a knob. The pool is a
  live public page (`/pool`); email-invited reposts are at `/invited`. (Second-chance front-page upvotes
  count for roughly half karma.)

## Posting timing

- **US weekday mornings** are the consensus window — roughly **Tue–Thu, ~8–10am ET** — so the post gets
  maximum front-page daylight through the US workday. (Sources disagree ET vs PT; treat it as "US weekday
  morning.") **Weekends and Friday afternoons are weaker.**
- **HN's own stance: timing matters less than quality, and it's largely luck.** From the canonical "best
  time to post" thread: *"tl;dr it's down to luck."* The repost rule is the sanctioned "missed your window"
  remedy (see `show-hn-rules.md` / `postlaunch.md`) — not a reason to obsess over the minute.

## Flags & [dead]

- **[flagged]** — *"Users flagged the post as breaking the guidelines or otherwise not belonging on HN."*
  Enough flags demote it.
- **[dead]** — *"The post was killed by software, user flags, or moderators. Dead posts aren't displayed
  by default"* (visible only with `showdead`). Other users can **vouch** to restore a wrongly-killed post.
- The flamewar detector (*"software which demotes overheated discussions"*) is why a thread that turns into
  an argument sinks — keep your replies measured (see `first-comment.md`).
