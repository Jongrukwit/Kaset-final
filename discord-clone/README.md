# Discord Clone 🎮

Full-stack Discord clone with real-time messaging and WebRTC voice/video.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (Discord color system) |
| State | Zustand |
| Backend | Node.js + Express + TypeScript |
| Real-time | Socket.io (chat) + WebRTC (voice/video) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |

## Features ✅

- **Authentication** — Register / Login / Logout
- **Server System** — Create servers, join via invite code, server list
- **Channels** — Text channels, Voice channels (by category)
- **Real-time Messaging** — Send, edit, delete messages (via Socket.io)
- **Infinite Scroll** — Messages load on scroll up
- **Search** — Search messages in a channel by keyword
- **Voice & Video** — WebRTC P2P voice/video in voice channels
- **Typing Indicator** — Live typing notifications
- **Member List** — See online members in server
- **Status System** — Online/Offline tracking

---

## Setup

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase_schema.sql`
3. Copy your **Project URL** and keys from Settings → API

### 2. Backend `.env`

```bash
cd backend
cp .env.example .env
```

Fill in:
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...   # service_role key
JWT_SECRET=any-random-secret
PORT=4000
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend `.env`

```bash
cd frontend
cp .env.example .env
```

Fill in:
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...   # anon key (public)
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

### 4. Install & Run

```bash
# Install all dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Run both servers
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

---

## Project Structure

```
discord-clone/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── layout/       # ServerList, ChannelSidebar, UserPanel, MembersPanel
│       │   ├── chat/         # ChatArea, MessageItem, MessageInput, SearchBar
│       │   ├── voice/        # VoiceArea (WebRTC)
│       │   └── modals/       # InviteModal, CreateServerModal, JoinServerModal
│       ├── pages/            # AuthPage, MainApp
│       ├── store/            # Zustand stores
│       ├── lib/              # api.ts, socket.ts, supabase.ts
│       └── types/            # TypeScript types
└── backend/
    └── src/
        ├── routes/           # auth, servers, channels, messages
        ├── socket/           # Socket.io + WebRTC signaling
        ├── middleware/       # Auth middleware
        └── lib/              # Supabase client
```

---

## Adding Data Manually (as specified in requirements)

Use Supabase Table Editor or SQL to add servers/channels:

```sql
-- Add a server (after creating a user account)
INSERT INTO servers (name, owner_id, invite_code, description)
VALUES ('Gaming Hub', '<your-user-id>', 'GAME01', 'A server for gamers');

-- Add member
INSERT INTO server_members (server_id, user_id, role)
VALUES ('<server-id>', '<your-user-id>', 'owner');

-- Add channels
INSERT INTO channels (server_id, name, type, position, category) VALUES
('<server-id>', 'general', 'text', 0, 'TEXT CHANNELS'),
('<server-id>', 'announcements', 'text', 1, 'TEXT CHANNELS'),
('<server-id>', 'General', 'voice', 2, 'VOICE CHANNELS'),
('<server-id>', 'Gaming', 'voice', 3, 'VOICE CHANNELS');
```

---

## Scoring Checklist (โจทย์)

| Feature | Status |
|---------|--------|
| Server/Guild display | ✅ |
| Channel list (text + voice) | ✅ |
| Real-time text messaging | ✅ |
| Edit messages | ✅ |
| Delete messages | ✅ |
| Message history + Infinite scroll | ✅ |
| Join server via Invite Code | ✅ |
| Server join preview | ✅ |
| Search messages | ✅ |
| Voice channel (WebRTC) | ✅ |
| Video in voice channel | ✅ |
| Online member list | ✅ |
| User profile + status | ✅ |
| React framework | ✅ |
| Tailwind CSS | ✅ |
| Responsive design | ✅ |
| Saved to Database | ✅ |
