# Life OS — Daily Brief Templates

## Overview

Two briefs are generated daily:
- **Morning Brief (8am)** — Focused on today, action-oriented
- **Night Brief (11pm)** — Broader view, planning-oriented

---

## Morning Brief Template

**Subject line:** ☀️ Morning Brief — {Day of Week}, {Month} {Date}

```
☀️ MORNING BRIEF — {Day of Week}, {Month} {Date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TODAY'S SCHEDULE
────────────────
{For each event today, chronologically:}

{time} — {description}
         {location if present}
         {consequence if HIGH urgency: "⚠️ {consequence}"}

{If no events: "Nothing scheduled. Open day."}


MUST DO TODAY
─────────────
{For each HIGH urgency item or item due today:}

🚨 {description}
   {consequence if present}
   {sub-tasks if present, as checkboxes}

{For MEDIUM urgency items due today:}

□ {description}
  {brief context if helpful}

{If nothing due: "No deadlines today."}


🎯 TODAY'S FOCUS
────────────────
Based on what's on your plate, here's what matters most:

1. {Most impactful thing to do today}
2. {Second priority}
3. {Third priority, if applicable}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Have a good day.
```

---

## Morning Brief Example

```
☀️ MORNING BRIEF — Tuesday, January 14
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TODAY'S SCHEDULE
────────────────

4:10 PM — Car registration appointment at AAA Potrero Hill
          📍 Potrero Hill
          ⚠️ Your car almost got towed. Don't miss this.


MUST DO TODAY
─────────────

🚨 Car registration appointment
   Bring: ID, current registration, payment

□ Order craft supplies for Friday's event
  Event is in 3 days — order today for safe delivery

□ Confirm pizza headcount for Friday
  Need number of attendees to order right amount


🎯 TODAY'S FOCUS
────────────────
Based on what's on your plate, here's what matters most:

1. Get to AAA by 4:10 PM — this resolves your registration issue
2. Order the craft supplies — don't let Friday sneak up on you
3. Text event attendees to confirm headcount

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Have a good day.
```

---

## Night Brief Template

**Subject line:** 🌙 Night Brief — {Day of Week}, {Month} {Date}

```
🌙 NIGHT BRIEF — {Day of Week}, {Month} {Date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOMORROW
────────
{Day of week}, {Month} {Date}

{For each event tomorrow:}

{time} — {description}
         {location if present}

{If no events: "Nothing scheduled tomorrow."}


THIS WEEK
─────────
{For each item due in next 7 days, grouped by day:}

{Day of week} ({Date})
  • {description} {urgency indicator if HIGH: 🚨}
    {consequence if present}

{If nothing coming up: "Clear week ahead."}


NEEDS YOUR INPUT
────────────────
{For items with needs_clarification = true:}

You said: "{original raw text}"
→ {clarification question 1}
→ {clarification question 2}

{If none: Skip this section entirely}


BEEN SITTING ON
───────────────
{For items in inbox > 3 days or tasks repeatedly deferred:}

• {description} — added {X} days ago
  {gentle observation about why it might be stuck}

{If none: Skip this section entirely}


HEADS UP — CONSEQUENCES APPROACHING
───────────────────────────────────
{For items with consequences and deadlines in next 14 days:}

⚠️ {description}
   Due: {date}
   If you don't: {consequence}

{If none: Skip this section entirely}


CONSIDER FOR TOMORROW
─────────────────────
Based on your week and what's been sitting:

1. {Suggestion — something impactful they could tackle}
2. {Suggestion — maybe something they've been avoiding}
3. {Suggestion — optional, lower priority}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rest well. Tomorrow's got a plan.
```

---

## Night Brief Example

```
🌙 NIGHT BRIEF — Monday, January 13
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOMORROW
────────
Tuesday, January 14

4:10 PM — Car registration appointment at AAA Potrero Hill
          📍 Potrero Hill


THIS WEEK
─────────

Friday (Jan 17)
  • Event you're hosting 🚨
    Prep tasks: craft supplies, pizza order

Saturday (Jan 18)
  • Date day with Anjali
    Day is blocked

  • Check in on friend going through breakup

  • Call friend (time TBD)


NEEDS YOUR INPUT
────────────────

You said: "need to call my friend this weekend"
→ Which friend did you mean?
→ Any preferred time?

You said: "hosting an event on Friday"
→ What time is the event?
→ How many people are attending?


BEEN SITTING ON
───────────────

• Schedule car servicing — added 5 days ago
  Tahoe trip is approaching. Might be avoiding the hassle of calling shops?


HEADS UP — CONSEQUENCES APPROACHING
───────────────────────────────────

⚠️ Car registration appointment
   Due: Tomorrow, 4:10 PM
   If you miss it: Continued risk of towing/tickets

⚠️ Car servicing before Tahoe
   Due: ~Jan 25 (before trip)
   If you don't: Safety risk driving in snow with unserviced car


CONSIDER FOR TOMORROW
─────────────────────
Based on your week and what's been sitting:

1. After your DMV appointment, call a car service shop and book it
2. Text your event attendees to lock in the headcount
3. Think about what "calling your friend" meant — which one?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rest well. Tomorrow's got a plan.
```

---

## Formatting Guidelines

### Urgency Indicators
- 🚨 = HIGH urgency (use sparingly)
- ⚠️ = Has consequence or needs attention
- □ = Standard task checkbox
- • = List item

### Tone by Brief Type

**Morning:**
- Short sentences
- Action verbs
- "Do this" energy
- No fluff
- Max 2 minutes to read

**Night:**
- Slightly warmer
- Reflective
- "Here's what to think about"
- Can include gentle observations
- Max 4 minutes to read

### What NOT to Include

- Items with no deadline and LOW urgency (save for weekly review)
- Completed items
- Reference items (unless directly relevant)
- More than 5-6 items in any section (prioritize)

### Section Omission Rules

Skip entire sections if empty:
- "Needs Your Input" — only show if there are clarification items
- "Been Sitting On" — only show if there are stale items
- "Heads Up" — only show if there are consequence items approaching

This keeps briefs clean and scannable.

---

## Email Delivery Format

Briefs are sent as plain text emails for maximum compatibility and readability. No HTML formatting, no images. This ensures they're readable on any device and in any email client.

**From:** Life OS <your-email-or-alias>
**To:** {RECIPIENT_EMAIL from config}
**Subject:** {As specified above}
**Body:** {Brief content}

---

*Last updated: January 2026*
