# The Founder's First Comment + Thread Engagement (the whole game on HN)

Load at Steps 3–4. The title gets you clicked; **the first comment and how you handle the thread decide
whether the post lives.** HN's Show HN guideline makes presence a contract: *"The project must be
something you've worked on personally and which you're around to discuss."*

## The first comment

Write it **before you submit** and post it as the first reply the moment the post is live. It's an honest,
technical *"I built this because…"* note — **not a pitch.** The hard rule, repeated by HN veterans: drop
anything that sounds like marketing or sales — *"using marketing or sales language is an instant turnoff,"*
and a post that reads like an ad *"will be treated like merely an ad."* First person, factual, **no emoji,
no superlatives** ("revolutionary", "the best", "game-changing"), no growth-hacky framing. **Stating your
own limitations first** disarms the most predictable critiques and signals you're an engineer.

**Skeleton (paste-ready — fill from `.ulpi/launch/positioning.md`):**

```
Hi HN. I built [NAME], [one plain sentence: what it is and what it does].

Why I built it: [the real problem you hit — 2–3 honest sentences: the itch, the tools you tried, why
they didn't work for you. First person. No "best"/"revolutionary".]

How it works / stack: [2–4 sentences. The actual stack and one or two interesting technical decisions
or constraints. e.g. "Go, single static binary, SQLite, no external deps. The tricky part was X, solved
by Y."]

What it does NOT do yet / known limitations: [2–4 real limitations, bluntly. e.g. "No auth yet. Only
tested on Linux. Degrades past N rows because Z."]

It's [open source / free to try] here: [link]. You can try it without signing up: [link or one-liner].

I'd love feedback on [ONE specific thing you're genuinely unsure about — e.g. the security model, the
API shape, behavior under concurrent load]. Happy to answer any questions.
```

Two real models worth studying: **Plausible Analytics** (HN id 24696145) — first-person backstory + a
concrete Elixir/Phoenix/ClickHouse stack + factual details over hype, and when challenged on accuracy the
founder engaged the *strongest* version of the critique and named the privacy-vs-accuracy tradeoff rather
than defending. **Show HN: a fake SMTP server** (id 41024358) — short, zero marketing, opened with *"Looking
for feedback, especially on the security side,"* then conceded limitations and acted on them in-thread.

## Be present in the early window

Be intensely present for roughly the **first 1–2 hours** and reply to essentially every substantive
comment, positive or negative. (HN itself says there's *no magic timing* — don't chase a specific minute;
the point is to be genuinely responsive while the community is deciding whether to engage.) **Reply like a
human — never paste AI-generated/edited replies** (Guidelines: *"Don't post generated text or AI-edited
text. HN is for conversation between humans."*). Treat every critique as free senior-engineer code review.

## Responding to criticism (non-defensive — the launch is won or lost here)

Mirror HN's own norms: *"Be kind. Don't be snarky. Converse curiously; don't cross-examine."* · *"Please
respond to the strongest plausible interpretation … Assume good faith."* · *"Comments should get more
thoughtful and substantive, not less, as a topic gets more divisive."* · *"Don't feed egregious comments
by replying; flag them instead."*

| When the comment is… | Do this |
|----------------------|---------|
| **Valid criticism** | Concede fast and visibly: *"You're right — [restate their point]. That's a real limitation. [why it's that way / what you plan]."* Never argue a point you know is correct. |
| **A misunderstanding / tradeoff** | Reply to the argument with reasoning, not defensiveness: *"The reason it works that way is [data]. The tradeoff is [honest cost]. For X that's right; for Y you'd want Z."* |
| **Simply not your audience** | Politely say so: *"Fair — [NAME] is aimed at [user/use-case], so if you have [their setup] it probably isn't for you. Appreciate you taking a look."* No fight. |
| **Hostile / a shallow dismissal** | Answer only the substantive kernel calmly, or don't reply (flag if it crosses the line). Never match the tone. As the thread heats up, get *more* measured. |

**Never** get into a status fight, accuse anyone of not understanding/not reading, or insinuate
astroturfing/shilling — that's separately against the guidelines, and **never orchestrate booster comments
from friends** (easily spotted, read as astroturfing, and against the rules — see `policy-compliance.md`).

## In comments, HN asks the community to be respectful too

The Show HN page tells commenters: *"Be respectful. Anyone sharing work is making a contribution, however
modest… When someone is learning, help them learn more. When something isn't good, you needn't pretend
that it is, but don't be gratuitously negative."* You can't invoke this — the moderators enforce it — but
it's the tone to model in your own replies.
