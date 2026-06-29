# Product Hunt Copywriting (the PH listing asset profile)

This is the **PH asset profile** the orchestrator hands to the `launch-copy` skill — the assets, hard
limits, voice, and compliance rule for a Product Hunt listing — **and the inline fallback** if `launch-copy`
isn't installed (draft directly from this). Load at Step 3. Every line binds to `.ulpi/launch/positioning.md`;
honor the limits in `field-specs.md`. PH's own guidance is blunt: lead with the **benefit**, be **specific**, **show
the product**, and keep the tone **humble and helpful** — *"marketing-speak doesn't usually resonate."*

**Profile to pass to `launch-copy`:** `voice` = benefit-led, concrete, no hype, humble + helpful;
`compliance` = never solicit upvotes; `assets` = tagline (≤60, 3–5 versions), description (≤500, 2),
gallery-headlines (1 per slide), first-comment (the skeleton below). The craft below is the fallback.

## Tagline (≤ 60 chars — the highest-leverage line)

The tagline is the click decision: it renders in the feed, emails, and embeds. PH's rule: *"a very short
description — no gimmicks or over-the-top language."* PH's own model example: **"Send your friends a
voicemail meow from a real cat"** — concrete, specific, instantly understood.

**Core formula (outcome-first, implementation-last):**
`[action verb] + [the outcome] + [for whom OR without the pain]`

Generate **3–5 options across distinct angles** so the user can choose (mark one recommended):

| Angle | Pattern | Example |
|-------|---------|---------|
| Outcome + timeframe | "[outcome] in [time]" | "Turn meeting notes into action items in 2 minutes" |
| Outcome without the pain | "[outcome] without [pain]" | "Ship client reports without manual spreadsheets" |
| Capability + audience | "[do X] for [who]" | "Design faster with a reusable component library" |
| Known-product positioning | "[BigProduct] alternative" / "[A] + [B] for [who]" | "Open-source Calendly alternative" · "Gumroad + Linktree alternative for creators" |
| Promise + credibility hook | "Never [pain] again, built by [who]" | "Never be late again, built by a team with ADHD" |

**Do:** lead with benefit/outcome; one number or concrete noun; understandable cold; **test it on 5
people who've never seen the product.**
**Don't:** name your stack ("a project management tool built with React"); empty superlatives ("the best
all-in-one platform"); buzzword soup; emojis/hyperbole.

Real strong taglines to calibrate against: *"Turn boring product images into beautiful photos with AI"*
(Pebblely) · *"Cut down meetings by 40% — interactive async video for work"* (Tape) · *"Ditch the grids,
create websites like you design graphics"* (WebWave).

## Gallery (treat it as a 4–6 slide pitch deck, not a screenshot dump)

PH's rule: *"avoid stock images and marketing fluff — show the product."* Specs from `field-specs.md`:
1270×760, 2+ required (4–6 recommended), first image = the social/OG preview.

**The proven slide sequence:**

1. **Hero / scroll-stopper** (also the social preview): what it is + who it's for, one line; a bold
   branded frame that reads instantly. Make it self-explanatory.
2. **Core workflow:** the main action / the "aha" — cropped, zoomed, annotated.
3. **Outcome:** the result or artifact the user walks away with.
4. **Proof:** a metric, testimonial, or named use case, on-brand.
5. **CTA:** a clean end card with the URL / offer.

**The Stackfix tactic (Product of the Week):** use **"benefit + hint" slides, not raw screenshots** —
pair each slide's one-line benefit headline with a *cropped, zoomed* piece of real UI or a clean mockup,
so each slide **sells a value and hints the mechanism**. Every headline is one outcome-led line readable
on mobile.

**Demo video (optional, recommended):** YouTube link only; 30–90s; **problem → demo → result**; 1080p
with captions so it works muted. ~53% of Product-of-the-Day winners since 2021 included a video. (This
skill writes the outline and shot-list; it does not render images or edit video.)

## The maker's first comment (near-mandatory)

PH's own data: **70% of Product-of-the-Day/Week/Month winners posted a maker first comment.** Pre-write
it and paste it within ~60 seconds of going live (a community convention, not an official rule). **Two
non-negotiables:** never ask for upvotes (see `policy-compliance.md`), and **end on a genuine question**
that invites replies.

**Skeleton (paste-ready — fill from `.ulpi/launch/positioning.md`):**

```
Hi PH! 👋 I'm <name>, one of the makers of <Product>.

WHY WE BUILT IT
We kept hitting <specific problem> — <one-sentence origin/personal story>. So we built <Product>
for <target user> who struggle with <problem>.

WHAT IT DOES (today)
• <Feature 1 — outcome-led, 5–7 words>
• <Feature 2>
• <Feature 3>

WHAT'S DIFFERENT
<1–2 sentences: your point of view / the one thing nobody else does>

WHERE WE'RE AT (honest)
<stage; what it can't do yet — candor builds trust>

PRICING / PH OFFER
<free / free plan / paid>. PH-only: <deal or code tied to TRYING, never to upvoting> 🎁

WHAT WE'D LOVE FEEDBACK ON
1. <specific question>
2. <specific question>

We'll be here all day answering everything — thanks for checking us out 🙏
<try-it / demo link>
```

**Tone:** humble + helpful, not marketing-speak. Strong real openers to study: *"Poor marketing is a
silent killer of great products."* (MakerBox) · *"I have personally been on the opposing side of legal
documents designed to confuse me."* (BetterLegal — first-person origin) · *"We believe creators should
get paid directly by the fans who love their work."* (Angelope — manifesto). End with a concrete CTA/link
so the comment keeps driving engagement after launch day. Reuse the comment as a blog post / social
thread.

## Description (≤ 500 chars — see `field-specs.md`)

Mirror the tagline's outcome, then add the "for whom" and one or two concrete capabilities. Front-load
the value (the feed and tagline do the click work).

```
<Product> is <category> that helps <who> <do the outcome>. <One or two concrete capabilities in
plain language>. <Optional: what makes it different OR a free/open-source hook>.
```

No hype, no buzzword soup — say what it is and does so a cold reader gets it.
