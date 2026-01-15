# Life OS Dashboard — Product Requirements Document

> **Version:** 1.0 (Iteration 1)
> **Author:** Aditya Goyal
> **Date:** January 2025
> **Status:** Ready for Development

---

## Executive Summary

Life OS Dashboard is a web application that provides a visual interface for the Life OS personal life management system. It allows users to view, edit, and add items (tasks, events, ideas, reference) that are captured and processed by the existing Life OS AI pipeline.

**Core principle:** The dashboard is your command center. Quick capture gets things into the system; the dashboard is where you see everything, go deeper, and take control.

---

## Background

### What Exists Today

Life OS MVP is complete and working:
- Phone capture via Apple Shortcut → Cloud Function
- AI extraction with Gemini (categorization, dates, urgency, people)
- Storage in Google Sheets (Tasks, Events, Ideas, Reference tabs)
- Google Calendar sync for events
- Daily briefs via email

### Why Build the Dashboard

The current system captures and processes well, but:
- Viewing data requires opening Google Sheets
- Editing requires manual Sheets manipulation
- No unified view of everything
- Can't capture from desktop easily
- No visual representation of your "life state"

The dashboard solves this by providing a real UI on top of the existing system.

---

## Goals for Iteration 1

1. **See everything** — View all tasks, events, ideas, and reference items in an organized interface
2. **Edit directly** — Click into any item and modify it without touching the database directly
3. **Add from the app** — Capture new items via a text input that goes through the AI pipeline
4. **Real-time feel** — See new captures appear and get processed with minimal latency
5. **Mobile friendly** — Works on phone browsers, not just desktop

### Non-Goals for Iteration 1

- Threads (grouping related items) — Iteration 4
- Chat conversations with AI — Iteration 2/3
- Smart updates via natural language ("move it to Thursday") — Iteration 3
- Connections between items — Future
- Weekly review mode — Future
- Search — Future

---

## Technical Decisions

### Database: Supabase (Postgres)

**Migrating from Google Sheets to Supabase because:**
- Proper relational structure for future features (threads, connections)
- Built-in auth for future multi-user support
- Real-time subscriptions for instant UI updates
- Industry standard (better for portfolio)
- Better querying and performance

### Frontend: React + TypeScript + Vite

**Why:**
- Consistent with other projects (AI Training App)
- Claude Code is fluent in this stack
- Right level of complexity for the app
- Component-based structure supports future iterations

### Deployment: Vercel

**Why:**
- Simple deploy process (push to GitHub)
- Free tier is generous
- Great for frontend apps
- Can migrate to Cloud Run later if needed

### AI Processing: Existing Cloud Function

**The current Gemini-based processor stays.** The dashboard calls it for new captures. We update it to write to Supabase instead of Sheets.

---

## User Profile

**Primary User:** Aditya (the builder)

**Future User:** Girlfriend (eventually)

**Context:**
- Captures things throughout the day via phone
- Wants to review and organize during downtime
- Uses both desktop (evening review) and mobile (on the go)
- Prefers minimal friction—things should just work

---

## Information Architecture

### Sidebar Navigation

```
┌─────────────────┐
│  Life OS        │
├─────────────────┤
│  ◉ Today        │
│  ○ Tasks        │
│  ○ Events       │
│  ○ Ideas        │
│  ○ Reference    │
│  ○ Inbox        │  ← Infrastructure only, may hide in UI
└─────────────────┘
```

### Views

**Today** (Default landing page)
- Events happening today
- Tasks due today
- High urgency items (even if not due today)
- Quick snapshot of "what matters right now"

**Tasks**
- All tasks, sorted by urgency (high → medium → low)
- Shows: title, category, urgency indicator, due date (if set)
- Completed tasks are hidden (still in database)
- Filter by category (stretch goal)

**Events**
- All upcoming events, sorted by date (soonest first)
- Shows: title, category, date/time, people mentioned
- Past events are hidden by default

**Ideas**
- All ideas, grouped by subcategory (Books, Movies, Restaurants, Gifts, etc.)
- Shows: title, subcategory, created date
- No urgency or due dates for ideas

**Reference**
- All reference items, sorted by created date (newest first)
- Shows: title, category, created date
- Static information storage

**Inbox** (Infrastructure, UI TBD)
- Items that need manual review or couldn't be auto-categorized
- May be hidden in iteration 1 if AI handles everything confidently

---

## Data Model

### Supabase Schema

#### Table: `users`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto-generated |
| email | text | Unique |
| name | text | Display name |
| created_at | timestamp | Auto-set |

#### Table: `items`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto-generated |
| user_id | uuid | Foreign key → users |
| type | enum | 'task', 'event', 'idea', 'reference' |
| title | text | Main display text |
| description | text | Longer description (nullable) |
| category | text | Car, Personal, Family, Finance, Health, Home, Work, Recruiting, Travel, Ideas, Reference |
| subcategory | text | For ideas: Books, Movies, TV, Restaurants, Articles, Gifts, Products, Places, Activities, Random |
| status | enum | 'not_started', 'in_progress', 'complete' |
| urgency | enum | 'low', 'medium', 'high' (nullable) |
| due_date | timestamp | Nullable |
| people_mentioned | text[] | Array of names |
| notes | text | User-added notes (nullable) |
| links | text[] | User-added URLs (nullable) |
| calendar_event_id | text | Google Calendar event ID for syncing |
| created_at | timestamp | Auto-set |
| updated_at | timestamp | Auto-updated |
| completed_at | timestamp | Set when status → complete |

#### Table: `threads` (Future — Iteration 4)

Not built in iteration 1. Schema documented for reference:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key → users |
| title | text | Thread name |
| goal | text | What you're trying to accomplish |
| status | enum | 'open', 'blocked', 'complete', 'abandoned' |
| created_at | timestamp | |
| updated_at | timestamp | |

#### Table: `thread_items` (Future — Iteration 4)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| thread_id | uuid | Foreign key → threads |
| item_id | uuid | Foreign key → items |
| order | integer | Position in thread |

---

## Features

### Feature 1: View Items by Type

**User Story:** As a user, I want to see all my tasks/events/ideas/reference items in organized lists.

**Acceptance Criteria:**
- Sidebar shows Tasks, Events, Ideas, Reference navigation
- Clicking each shows the filtered list
- Tasks sorted by urgency (high → low), then by due date
- Events sorted by date (soonest first)
- Ideas grouped by subcategory
- Reference sorted by created date (newest first)
- Completed items are hidden from view
- Each item shows: title, category, and relevant metadata

**UI Behavior:**
- List view with cards or rows
- Visual indicator for urgency (color or icon)
- Due date shown in human-readable format ("Tomorrow", "Jan 20", etc.)

### Feature 2: Today View

**User Story:** As a user, I want a single view of what matters today.

**Acceptance Criteria:**
- Shows events happening today (sorted by time)
- Shows tasks due today
- Shows high urgency tasks (even if not due today)
- Clear sections for each type
- Empty state if nothing is due

**UI Behavior:**
- This is the default landing page
- Clean, scannable layout
- Date displayed prominently ("Wednesday, January 15")

### Feature 3: Item Detail View

**User Story:** As a user, I want to click into any item and see/edit its full details.

**Acceptance Criteria:**
- Clicking an item opens a detail view (modal or slide-over panel)
- Shows all fields: title, description, category, status, urgency, due date, people, notes, links
- All fields are editable inline
- Save happens automatically or via explicit save button
- Can mark as complete from detail view
- Can delete item from detail view

**Editable Fields:**
- Title (text)
- Description (text area)
- Category (dropdown)
- Subcategory (dropdown, only for ideas)
- Status (dropdown: not started, in progress, complete)
- Urgency (dropdown: low, medium, high)
- Due date (date picker)
- Notes (text area)
- Links (add/remove URLs)

**Non-editable Fields:**
- Created date (display only)
- Updated date (display only)
- People mentioned (display only — extracted by AI)

### Feature 4: Quick Capture

**User Story:** As a user, I want to add new items from the dashboard without leaving the app.

**Acceptance Criteria:**
- Floating "+" button visible on all views
- Clicking opens a modal with a text input
- User types freeform text (like phone capture)
- Submit sends to AI processing pipeline
- Modal shows "Processing..." state
- On success, modal closes and item appears in appropriate list
- On error, show error message

**UI Behavior:**
- Floating action button (FAB) in bottom right corner
- Modal is simple: text area + submit button
- Optimistic UI: show "processing" item in list immediately
- When processing completes, item updates with real data

### Feature 5: Mark Complete

**User Story:** As a user, I want to quickly mark tasks as complete.

**Acceptance Criteria:**
- Checkbox or button on each task in list view
- Clicking marks status as 'complete'
- Item disappears from list view (with subtle animation)
- Item remains in database with completed_at timestamp
- Can also mark complete from detail view

**Technical Notes:**
- Set `status = 'complete'` and `completed_at = NOW()`
- Default list queries filter out `status = 'complete'`

### Feature 6: Calendar Sync

**User Story:** As a user, when I edit an event's date/time, it should update in Google Calendar.

**Acceptance Criteria:**
- Events have calendar_event_id linking to Google Calendar
- When due_date is edited on an event, API call updates Google Calendar
- Sync is one-way for iteration 1 (app → calendar)
- Show success/error feedback after sync

**Technical Notes:**
- Use existing Google Calendar API integration
- Only events have calendar sync, not tasks

### Feature 7: Responsive Design

**User Story:** As a user, I want to use the dashboard on my phone browser.

**Acceptance Criteria:**
- Sidebar collapses to hamburger menu on mobile
- List views are single-column on mobile
- Detail view is full-screen modal on mobile
- Capture FAB is easily tappable on mobile
- All touch targets are minimum 44x44px

---

## UI/UX Specifications

### Layout

**Desktop (>768px):**
```
┌─────────────────────────────────────────────────────────┐
│  Life OS                                    [User/Menu] │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  Today     │   [Content Area - List View]               │
│  Tasks     │                                            │
│  Events    │   ┌─────────────────────────────────┐      │
│  Ideas     │   │ Item Card                       │      │
│  Reference │   │ Title, category, urgency, date  │      │
│            │   └─────────────────────────────────┘      │
│            │                                            │
│            │   ┌─────────────────────────────────┐      │
│            │   │ Item Card                       │      │
│            │   └─────────────────────────────────┘      │
│            │                                            │
│            │                                     [+]    │
└────────────┴────────────────────────────────────────────┘
```

**Mobile (<768px):**
```
┌─────────────────────────┐
│  ☰  Life OS      [User] │
├─────────────────────────┤
│                         │
│  [Content Area]         │
│                         │
│  ┌───────────────────┐  │
│  │ Item Card         │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Item Card         │  │
│  └───────────────────┘  │
│                         │
│                   [+]   │
└─────────────────────────┘
```

### Visual Design

**Style Direction:**
- Clean, minimal interface
- Light mode (dark mode can be future enhancement)
- Subtle shadows for cards
- Clear visual hierarchy
- Consistent spacing (8px grid)

**Color Usage:**
- Urgency high: Red/orange indicator
- Urgency medium: Yellow indicator
- Urgency low: Gray/muted indicator
- Category could have subtle color coding (optional)

**Typography:**
- System fonts for performance
- Clear size hierarchy (title > metadata > timestamps)

### Empty States

**No items in a view:**
- Simple illustration or icon
- Message: "No [tasks/events/ideas] yet"
- CTA: "Add your first [item type]" → opens capture modal

**Today view with nothing due:**
- Positive message: "Nothing urgent today 🎉"
- Show count of upcoming items: "You have X tasks and Y events coming up"

---

## Technical Implementation

### Project Structure

```
life-os/
├── src/                    # Existing Python backend
├── web/                    # NEW: Dashboard frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── MobileNav.tsx
│   │   │   ├── Items/
│   │   │   │   ├── ItemCard.tsx
│   │   │   │   ├── ItemList.tsx
│   │   │   │   ├── ItemDetail.tsx
│   │   │   │   └── ItemForm.tsx
│   │   │   ├── Capture/
│   │   │   │   ├── CaptureButton.tsx
│   │   │   │   └── CaptureModal.tsx
│   │   │   └── Common/
│   │   │       ├── Badge.tsx
│   │   │       ├── Button.tsx
│   │   │       └── Modal.tsx
│   │   ├── pages/
│   │   │   ├── Today.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── Events.tsx
│   │   │   ├── Ideas.tsx
│   │   │   └── Reference.tsx
│   │   ├── hooks/
│   │   │   ├── useItems.ts
│   │   │   ├── useCapture.ts
│   │   │   └── useSupabase.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   ├── api.ts
│   │   │   └── types.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docs/
├── config/
└── README.md
```

### API Endpoints Needed

**From existing Cloud Function (update to use Supabase):**
- `POST /capture` — Process freeform text, create item in Supabase

**New endpoints (can be Supabase client direct or edge functions):**
- Items are read/written directly via Supabase client
- Calendar sync may need a small edge function or Cloud Function update

### Environment Variables

**Frontend (.env):**
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CAPTURE_API_URL=your-cloud-function-url
```

### Supabase Setup

1. Create new Supabase project
2. Create tables per schema above
3. Set up Row Level Security (RLS) policies:
   - Users can only read/write their own items
   - For iteration 1 with single user, can be permissive
4. Enable Realtime for `items` table
5. Generate TypeScript types from schema

### Migration from Google Sheets

1. Export existing Sheets data
2. Transform to match new schema
3. Import into Supabase
4. Update Cloud Function to write to Supabase
5. Verify data integrity
6. Deprecate Sheets writes (keep as backup initially)

---

## Future Iterations (Out of Scope)

Documented here for context. **Do not build in iteration 1.**

### Iteration 2: Chat in the App
- Chat input in addition to capture modal
- Conversation history
- AI responses in chat
- Foundation for smart updates

### Iteration 3: Smart Updates via Chat
- Natural language editing ("move it to Thursday")
- AI recognizes update intent vs. new capture
- Clarifying questions when ambiguous
- Modifications to existing items via conversation

### Iteration 4: Threads
- Group related items into threads
- Thread status and progress tracking
- Items can belong to threads
- Lightweight linking (auto-promote to thread when complexity emerges)
- Thread detail view with ordered steps

### Iteration 5: Polish and Power Features
- Add images/attachments to items
- Weekly review mode
- Connections between items (outside threads)
- Search across everything
- Dark mode
- Notifications/reminders
- Proactive nudges from AI
- 30-day auto-archive for completed items

---

## Success Criteria

Iteration 1 is complete when:

1. ✅ Dashboard displays all items from Supabase (tasks, events, ideas, reference)
2. ✅ Today view shows relevant items for the current day
3. ✅ Can click into any item and see full details
4. ✅ Can edit any field on an item and save changes
5. ✅ Can mark items as complete (disappears from view)
6. ✅ Can add new items via capture modal (processed by AI)
7. ✅ New items appear in the correct list after processing
8. ✅ Event date changes sync to Google Calendar
9. ✅ Works on mobile browser (responsive)
10. ✅ Deployed and accessible via URL

---

## Open Questions

1. **Inbox behavior:** Show in sidebar or hide until needed? Current recommendation: build infrastructure, hide from UI until we see if items ever fail to categorize.

2. **Category filter:** Should list views have a category filter dropdown? Recommendation: Nice to have, not required for iteration 1.

3. **Bulk actions:** Select multiple items to mark complete or delete? Recommendation: Future iteration.

4. **Undo:** If you mark something complete accidentally, can you undo? Recommendation: For iteration 1, user can find item in database. Future: add "Recently completed" view.

---

## Appendix: Category Reference

**Top-level categories:**
- Car
- Personal
- Family
- Finance
- Health
- Home
- Work
- Recruiting
- Travel
- Ideas
- Reference

**Idea subcategories:**
- Books
- Movies
- TV
- Restaurants
- Articles
- Gifts
- Products
- Places
- Activities
- Random

**People (extracted automatically):**
- Dad
- Mom
- Anjali (girlfriend)
- Dobby (dog)
- Others as detected

---

## Appendix: User Flows

### Flow 1: Daily Check-in

1. User opens dashboard (lands on Today view)
2. Sees events for today, tasks due today, urgent items
3. Checks off a task → disappears from view
4. Clicks into an event to review details
5. Closes dashboard

### Flow 2: Adding a New Item

1. User clicks [+] floating button
2. Modal opens with text input
3. User types: "Call the dentist to reschedule filling appointment"
4. Clicks Submit
5. Modal shows "Processing..."
6. Processing completes → modal closes
7. Task appears in Tasks list (categorized as Health, urgency assigned)

### Flow 3: Editing an Item

1. User navigates to Tasks
2. Clicks on "Car registration renewal"
3. Detail panel opens
4. User changes due date from Jan 20 to Jan 25
5. User adds note: "Remember to bring proof of insurance"
6. Changes auto-save (or user clicks Save)
7. If event, calendar syncs

### Flow 4: Mobile Quick Capture

1. User opens dashboard on phone
2. Taps [+] button
3. Types quick thought
4. Submits
5. Sees confirmation
6. Closes browser

---

*End of PRD*
