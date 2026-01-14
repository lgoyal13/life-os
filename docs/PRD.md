# Life OS — Product Requirements Document

## Vision

Life OS is a personal life management system that captures the chaos in your head and turns it into organized, actionable clarity. It's your second brain — but one that actually works because it removes the cognitive overhead of organizing, prioritizing, and remembering.

**The core principle:** You capture with minimal effort. The AI does the thinking. The system surfaces what matters when it matters.

---

## Problem Statement

You have a lot going on — car registration, doctor appointments, gifts to buy, friends to check in on, trips to plan, a job search to manage. It all lives in your head, creating low-grade anxiety and causing things to slip through the cracks.

You've tried systems before. They don't stick because:
- Too much friction to capture things in the moment
- Too much overhead to organize, categorize, and prioritize
- Out of sight = out of mind — if it's not in front of you, it doesn't exist
- No sense of urgency or consequences for procrastinating

**What has worked:** Automating your finances. Money moves automatically, you just check in occasionally. You want that same feeling for the rest of your life.

---

## User Profile

**Name:** Aditya (Luv)

**Context:**
- Strategy & Ops professional, technically capable (builds AI tools)
- Uses Claude Code for development projects
- Has Google Workspace (Calendar, Sheets, Gmail)
- iPhone user
- Morning coffee ritual — good time for a daily check-in
- Night before bed — good time for planning

**Behavioral patterns:**
- Captures ideas mentally but forgets specifics
- Avoids tasks by pushing them out of sight
- Responds well to urgency and consequences
- Prefers systems that run automatically with minimal input
- Motivated by things he builds himself

**Failure modes:**
- "I'll figure it out later" → never figures it out
- Vague mental notes → forgotten details
- No system → everything in head → anxiety

---

## Core Features (MVP)

### 1. Frictionless Capture

**What:** One-tap voice or text capture from phone that sends to an inbox.

**How:** Apple Shortcut → Google Sheet inbox

**User experience:**
- Tap shortcut, speak or type anything
- "Mom's birthday is Feb 15, need to get her a gift, maybe that candle shop"
- Done. No categorizing, no organizing, no decisions.

### 2. AI Processing

**What:** AI reads inbox items and extracts structure automatically.

**Extracts:**
- Type (Task, Event, Idea, Reference)
- Description (clean version)
- Category (Car, Personal, Family, etc.)
- Subcategory where applicable
- People mentioned (Dad, Anjali, Dobby, etc.)
- Due date (if mentioned or implied)
- Reminders (smart defaults based on urgency and type)
- Urgency (HIGH / MEDIUM / LOW)
- Consequences (stated or inferred)
- Source (who recommended, where you saw it)
- Clarification needed (flags vague items)

**Behavior:**
- If item is vague, AI asks clarifying questions immediately
- If user ignores or says "not sure," stores as-is and flags for daily brief
- Routes processed items to correct storage tabs

### 3. Smart Storage

**What:** Organized Google Sheet with tabs for different item types.

**Tabs:**
- **Inbox** — Raw captures, unprocessed
- **Tasks** — Actionable items with due dates
- **Events** — Calendar-worthy items with specific times
- **Ideas** — Someday/maybe, recommendations, things to explore
- **Reference** — Pointers to information (never stores sensitive data directly)

### 4. Calendar Integration

**What:** Time-bound items automatically create Google Calendar events.

**Capabilities:**
- Create events with reminders
- Edit events when details change
- Delete events when cancelled
- Smart reminder timing based on urgency and type

### 5. Daily Briefs

**What:** Two daily summaries pushed to you.

**8am Morning Brief — "What's today?"**
- Today's appointments with times
- Tasks due today
- High-urgency items needing attention
- Ends with: "Your focus today: [1-3 things]"
- Tone: Focused, scannable, execution-oriented

**11pm Night Brief — "What's ahead?"**
- Tomorrow's schedule
- This week's upcoming items
- Items you've been putting off
- Clarification questions for vague items
- Consequences approaching
- Lower-urgency stuff to consider
- Ends with: "Consider for tomorrow: [suggestions]"
- Tone: Reflective, planning-oriented

---

## Category Structure

### Top-Level Categories

| Category | What goes here |
|----------|----------------|
| **Car** | Registration, service, parking, insurance, tickets |
| **Personal** | Your own social plans, self-care, hobbies, personal todos |
| **Family** | Parents, Anjali, Dobby, relatives, family events |
| **Finance** | Bills, subscriptions, payments, money decisions |
| **Health** | Doctor, dentist, medications, fitness |
| **Home** | Apartment, utilities, repairs, household |
| **Work** | Job tasks, reminders, meetings |
| **Recruiting** | Job search, interviews, applications, prep, resources |
| **Travel** | Trips, flights, itineraries, bookings, packing |
| **Ideas** | Recommendations, someday/maybe, things to explore |
| **Reference** | Pointers to information stored elsewhere |

### Ideas Subcategories

Books, Movies, TV, Restaurants, Articles, Gifts, Products, Places, Activities, Random

### People Tags

Extracted automatically from any item. Examples: Dad, Mom, Anjali, Dobby, James, etc.

These are tags, not categories — an item can be Category: Family, Subcategory: Event, People: [Dad, Mom].

---

## Smart Reminder Logic

Reminders are set automatically based on:

| Factor | Logic |
|--------|-------|
| **Urgency: HIGH** | Multiple reminders: 1 week before + 1 day before + morning of |
| **Urgency: MEDIUM** | Standard: 1-2 days before |
| **Urgency: LOW** | Light: morning of, or just in weekly review |
| **Type: Appointment** | 2 hours before (travel buffer) |
| **Type: Deadline** | 1 week before (first alert) + 1 day before (urgent) |
| **Type: Task with dependency** | Remind with lead time (e.g., "order pizza" = day before event) |
| **Has consequence** | Extra reminder weight, surfaces more prominently |

---

## Clarification Flow

When input is vague:

1. AI immediately asks clarifying question(s)
2. User can answer → item updated with details
3. User says "not sure" or ignores → item stored as-is, flagged
4. Flagged items appear in Night Brief: "You said X — can you clarify?"

This prevents blocking capture while ensuring vague things get addressed.

---

## Reference Items (Pointers Only)

Reference items store **descriptions and locations**, never actual sensitive data.

| User says | System stores |
|-----------|---------------|
| "Car registration stuff" | "Car registration → glove box or DMV email" |
| "Bank info" | "Bank account → 1Password 'Chase Checking'" |
| "Passport for travel" | "Passport → physical passport or 1Password" |

When surfaced in briefs: *"Don't forget registration → check glove box"*

---

## Success Criteria

**Week 1:**
- Successfully captured 10+ items via phone shortcut
- AI correctly categorized 80%+ of items
- Received and read daily briefs

**Week 2:**
- Calendar events created automatically
- Used the system every day
- At least one item completed that would have been forgotten otherwise

**Month 1:**
- System is habitual — checking briefs is part of routine
- Trust established — you believe things won't slip through cracks
- Reduced mental load — less anxiety about forgetting things

---

## Future Features (Parked for v2+)

These are documented but explicitly out of scope for MVP:

- **Query interface** — Ask questions about your data ("what gift ideas for Anjali?")
- **Email parsing** — Auto-extract bills, itineraries, subscriptions from Gmail
- **Weekly review** — Longer-form summary with trends and patterns
- **Habit tracking** — Recurring items with streak tracking
- **Voice responses** — AI responds via voice, not just text
- **Mobile app** — Native app instead of shortcut + sheet
- **Multi-user** — Friends and family can use it too

---

## Constraints

- **Privacy:** No sensitive data stored in system. Pointers only for anything confidential.
- **Simplicity:** MVP must be buildable in a weekend. No over-engineering.
- **Usability:** If it takes more than 10 seconds to capture, it's too slow.
- **Reliability:** Must work consistently. Flaky = won't get used.

---

*Last updated: January 2026*
