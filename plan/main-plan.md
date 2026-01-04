# BlurRanker - Main Project Plan

## Overview
A multi-user, real-time ranking and betting application where players compete in sessions, get ranked per game, and track payments owed based on rankings.

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Database & Real-time**: Supabase (PostgreSQL + Realtime subscriptions)
- **Styling**: Tailwind CSS
- **State Management**: React Context + Supabase real-time subscriptions
- **Deployment**: Vercel (recommended)

## Core Data Model

```
Sessions
├── id (uuid)
├── name (string)
├── bet_amount (number)
├── creator_id (uuid)
├── status (active | archived)
├── created_at (timestamp)
└── archived_at (timestamp | null)

Players
├── id (uuid)
├── name (string)
├── device_id (string) -- localStorage identifier
├── created_at (timestamp)
└── last_seen (timestamp)

Session_Players (junction)
├── session_id (uuid)
├── player_id (uuid)
├── joined_at (timestamp)
└── is_creator (boolean)

Games
├── id (uuid)
├── session_id (uuid)
├── game_number (integer)
├── status (pending | completed)
├── created_at (timestamp)
└── completed_at (timestamp | null)

Rankings
├── id (uuid)
├── game_id (uuid)
├── player_id (uuid)
├── position (integer) -- 1 = first place
└── created_at (timestamp)

Game_Confirmations
├── game_id (uuid)
├── player_id (uuid)
└── confirmed_at (timestamp)

Payments
├── id (uuid)
├── session_id (uuid)
├── game_id (uuid | null) -- null for bulk payments
├── from_player_id (uuid)
├── to_player_id (uuid)
├── amount (number)
├── is_paid (boolean)
├── paid_at (timestamp | null)
└── created_at (timestamp)
```

## Phase Breakdown

Each phase follows this structure:
1. **pre-implementation.md** - Planning, tasks, deliverables
2. **Implementation** - Build the features
3. **Testing** - Manual and automated tests
4. **post-implementation.md** - Recap, lessons learned, issues found

---

### Phase 1: Foundation
- Project setup (Next.js, Supabase, Tailwind)
- Database schema creation
- Player identity system (localStorage + Supabase)
- Basic UI layout and navigation
- **Tests**: Player creation, returning user flow, Supabase connection

### Phase 2: Session Management
- Create session flow
- Session lobby (list all active sessions)
- Join session functionality
- Session detail view
- **Tests**: Session CRUD, joining sessions, real-time updates on session list

### Phase 3: Game Flow
- Game creation by session creator
- Ranking input interface
- Payment auto-calculation
- Result display and confirmation tracking
- **Tests**: Game creation, ranking submission, payment calculation accuracy, confirmation tracking

### Phase 4: Payment Tracking
- Per-game payment breakdown
- Session aggregate balances
- Mark payments as paid
- Payment history views
- **Tests**: Payment marking, balance calculations, history accuracy

### Phase 5: Stats & Leaderboards
- Per-session leaderboard
- All-time leaderboard
- Player statistics (wins, losses, net profit, win rate)
- Session archives
- **Tests**: Stat calculations, leaderboard ordering, archive functionality

### Phase 6: Polish & Edge Cases
- Handle players leaving mid-session
- Real-time presence indicators
- Error handling and loading states
- Mobile responsiveness
- Performance optimization
- **Tests**: Edge cases, error states, responsive layouts, load testing

## Key Technical Decisions

1. **Player Identity**: Device-based via localStorage UUID, linked to Supabase player record
2. **Real-time Strategy**: Supabase Realtime subscriptions on sessions, games, and payments tables
3. **No Authentication**: Players identified by device, not login (simpler for casual use)
4. **Payment Logic**: Calculated on game completion, stored as individual payment records for auditability

## File Structure (Planned)

```
src/
├── app/
│   ├── page.tsx                 -- Home/lobby
│   ├── session/
│   │   ├── create/page.tsx      -- Create session
│   │   └── [id]/
│   │       ├── page.tsx         -- Session detail
│   │       ├── game/[gameId]/page.tsx
│   │       └── payments/page.tsx
│   ├── player/
│   │   └── [id]/page.tsx        -- Player profile/stats
│   ├── leaderboard/page.tsx     -- All-time leaderboard
│   └── archives/page.tsx        -- Archived sessions
├── components/
│   ├── ui/                      -- Reusable UI components
│   ├── session/                 -- Session-specific components
│   ├── game/                    -- Game-specific components
│   └── player/                  -- Player-specific components
├── lib/
│   ├── supabase/
│   │   ├── client.ts            -- Supabase client
│   │   ├── server.ts            -- Server-side client
│   │   └── types.ts             -- Generated types
│   ├── hooks/                   -- Custom React hooks
│   └── utils/                   -- Utility functions
├── contexts/
│   └── PlayerContext.tsx        -- Current player context
└── types/
    └── index.ts                 -- TypeScript types
```
