# Phase 1: Foundation - Pre-Implementation Plan

## Objective
Set up the project infrastructure, database schema, and player identity system.

## Prerequisites
- Node.js 18+ installed
- Supabase account created
- Git initialized

## Tasks

### 1.1 Project Initialization

**Create Next.js project with Tailwind:**
```bash
npx create-next-app@latest blurranker --typescript --tailwind --eslint --app --src-dir
```

**Install dependencies:**
```bash
npm install @supabase/supabase-js @supabase/ssr uuid
npm install -D @types/uuid supabase
```

**Files to create:**
- `.env.local` - Supabase credentials
- `src/lib/supabase/client.ts` - Browser client
- `src/lib/supabase/server.ts` - Server client
- `src/lib/supabase/middleware.ts` - Middleware helper

---

### 1.2 Supabase Setup

**Create new Supabase project** via dashboard.

**Database schema (SQL to run in Supabase SQL editor):**

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Players table
create table players (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  device_id text unique not null,
  created_at timestamptz default now(),
  last_seen timestamptz default now()
);

-- Sessions table
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  bet_amount numeric(10,2) not null check (bet_amount > 0),
  creator_id uuid references players(id) not null,
  status text default 'active' check (status in ('active', 'archived')),
  created_at timestamptz default now(),
  archived_at timestamptz
);

-- Session players junction
create table session_players (
  session_id uuid references sessions(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  joined_at timestamptz default now(),
  is_creator boolean default false,
  primary key (session_id, player_id)
);

-- Games table
create table games (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade not null,
  game_number integer not null,
  status text default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz default now(),
  completed_at timestamptz,
  unique (session_id, game_number)
);

-- Rankings table
create table rankings (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references games(id) on delete cascade not null,
  player_id uuid references players(id) not null,
  position integer not null check (position > 0),
  created_at timestamptz default now(),
  unique (game_id, player_id),
  unique (game_id, position)
);

-- Game confirmations
create table game_confirmations (
  game_id uuid references games(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  confirmed_at timestamptz default now(),
  primary key (game_id, player_id)
);

-- Payments table
create table payments (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade not null,
  game_id uuid references games(id) on delete set null,
  from_player_id uuid references players(id) not null,
  to_player_id uuid references players(id) not null,
  amount numeric(10,2) not null check (amount > 0),
  is_paid boolean default false,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_sessions_status on sessions(status);
create index idx_sessions_creator on sessions(creator_id);
create index idx_games_session on games(session_id);
create index idx_rankings_game on rankings(game_id);
create index idx_rankings_player on rankings(player_id);
create index idx_payments_session on payments(session_id);
create index idx_payments_from on payments(from_player_id);
create index idx_payments_to on payments(to_player_id);
create index idx_players_device on players(device_id);
```

**Enable Realtime (run in SQL editor):**
```sql
-- Enable realtime for relevant tables
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table session_players;
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table rankings;
alter publication supabase_realtime add table game_confirmations;
alter publication supabase_realtime add table payments;
```

**Row Level Security (RLS) - permissive for now:**
```sql
-- Enable RLS but allow all operations (no auth)
alter table players enable row level security;
alter table sessions enable row level security;
alter table session_players enable row level security;
alter table games enable row level security;
alter table rankings enable row level security;
alter table game_confirmations enable row level security;
alter table payments enable row level security;

-- Permissive policies (anyone can do anything)
create policy "Allow all" on players for all using (true) with check (true);
create policy "Allow all" on sessions for all using (true) with check (true);
create policy "Allow all" on session_players for all using (true) with check (true);
create policy "Allow all" on games for all using (true) with check (true);
create policy "Allow all" on rankings for all using (true) with check (true);
create policy "Allow all" on game_confirmations for all using (true) with check (true);
create policy "Allow all" on payments for all using (true) with check (true);
```

---

### 1.3 Player Identity System

**localStorage strategy:**
- On first visit: generate UUID, store in localStorage as `blurranker_device_id`
- Create player record in Supabase with auto-generated name
- On return visit: read device_id, fetch player, show "Continue as [name]?"

**Files to create:**

`src/lib/player.ts`:
- `getOrCreateDeviceId()` - manages localStorage UUID
- `generatePlayerName()` - creates fun default names
- `getOrCreatePlayer()` - fetches or creates player in Supabase

`src/contexts/PlayerContext.tsx`:
- React context providing current player
- Handles loading state
- Provides player update function

`src/components/player/PlayerSetup.tsx`:
- "Continue as [name]?" prompt for returning users
- Name input for new users
- "Change name" option

---

### 1.4 Base UI Layout

**Tailwind config customization:**
- Define color palette (primary, secondary, accent)
- Set up dark mode (optional)

**Layout components:**

`src/app/layout.tsx`:
- Wrap with PlayerContext provider
- Basic HTML structure
- Global styles

`src/components/ui/Header.tsx`:
- App title/logo
- Current player name display
- Navigation links

`src/components/ui/Container.tsx`:
- Consistent page wrapper
- Max-width, padding

`src/components/ui/Button.tsx`:
- Reusable button with variants (primary, secondary, danger)

`src/components/ui/Card.tsx`:
- Content container with shadow/border

`src/components/ui/Input.tsx`:
- Styled input field

`src/components/ui/Loading.tsx`:
- Loading spinner/skeleton

---

### 1.5 Home Page (Placeholder)

`src/app/page.tsx`:
- Show current player info
- Placeholder buttons for "Create Session" and "Join Session"
- Will be expanded in Phase 2

---

## Deliverables Checklist

- [ ] Next.js project created with TypeScript and Tailwind
- [ ] Supabase project created and configured
- [ ] All database tables created with proper constraints
- [ ] Realtime enabled on all tables
- [ ] RLS policies in place
- [ ] Supabase client configured (browser + server)
- [ ] Player identity system working (localStorage + Supabase)
- [ ] PlayerContext providing current player app-wide
- [ ] "Continue as [name]?" flow working for returning users
- [ ] Base UI components created (Button, Card, Input, etc.)
- [ ] Header with player name display
- [ ] Home page showing player info

---

## Testing Plan

### Manual Tests

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| M1.1 | New user flow | 1. Clear localStorage 2. Visit site 3. Enter name or skip | Player created in Supabase with correct name/device_id |
| M1.2 | Returning user flow | 1. Visit site with existing device_id | "Continue as [name]?" prompt appears |
| M1.3 | Continue as same user | 1. Click "Yes" on continue prompt | Same player loaded, no new record |
| M1.4 | Change name | 1. Click change name 2. Enter new name 3. Save | Name updated in Supabase |
| M1.5 | Auto-generated name | 1. Clear localStorage 2. Visit site 3. Skip name input | Player created with auto-generated name |
| M1.6 | Multiple devices | 1. Open in two different browsers | Two different players created |
| M1.7 | Page refresh persistence | 1. Create player 2. Refresh page | Same player loaded |
| M1.8 | Supabase connection | 1. Check browser console | No connection errors |

### Automated Tests (Jest + React Testing Library)

```
src/__tests__/
├── lib/
│   ├── player.test.ts           -- Unit tests for player utilities
│   └── supabase.test.ts         -- Supabase client tests
├── components/
│   └── player/
│       └── PlayerSetup.test.tsx -- Component tests
└── integration/
    └── player-flow.test.ts      -- End-to-end player creation
```

**Test cases to implement:**

```typescript
// player.test.ts
describe('getOrCreateDeviceId', () => {
  it('generates new UUID if none exists')
  it('returns existing UUID if present')
  it('stores UUID in localStorage')
})

describe('generatePlayerName', () => {
  it('returns a non-empty string')
  it('generates different names on each call')
})

// PlayerSetup.test.tsx
describe('PlayerSetup', () => {
  it('shows name input for new users')
  it('shows continue prompt for returning users')
  it('calls onComplete with player data')
  it('validates name input')
})
```

### Database Verification

After implementation, verify in Supabase dashboard:
- [ ] All 7 tables created with correct columns
- [ ] Indexes created
- [ ] RLS enabled with permissive policies
- [ ] Realtime enabled (check Realtime tab)
- [ ] Test insert/select on players table works

### Real-time Subscription Test

```typescript
// Manual test in browser console
const { data, error } = await supabase
  .channel('test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, (payload) => {
    console.log('Change received!', payload)
  })
  .subscribe()

// Then insert a player in another tab/Supabase dashboard
// Should see console log
```

---

## Notes

- No authentication in Phase 1 - device-based identity only
- RLS is permissive for simplicity; can tighten later if needed
- Focus on getting the foundation solid before adding features
- All tests must pass before marking phase complete

---

## Post-Implementation

After completing this phase, create `post-implementation.md` with:
- What was actually built vs planned
- Any deviations from the plan
- Issues encountered and how they were resolved
- Lessons learned
- Test results summary
- Screenshots of working features
- Time spent (optional)
