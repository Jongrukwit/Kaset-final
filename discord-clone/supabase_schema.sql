-- ============================================================
-- Discord Clone - Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  discriminator TEXT DEFAULT '0000',
  avatar_url TEXT,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online','idle','dnd','offline')),
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- SERVERS (Guilds)
-- ============================================================
CREATE TABLE IF NOT EXISTS servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server members can view" ON servers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM server_members WHERE server_id = servers.id AND user_id = auth.uid()
  ));
CREATE POLICY "Anyone can view server by invite" ON servers FOR SELECT USING (true);
CREATE POLICY "Owners can update" ON servers FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Authenticated users can create servers" ON servers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- SERVER MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS server_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner','admin','moderator','member')),
  nickname TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(server_id, user_id)
);

ALTER TABLE server_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view server members" ON server_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM server_members sm WHERE sm.server_id = server_members.server_id AND sm.user_id = auth.uid()
  ));
CREATE POLICY "Authenticated users can join" ON server_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave" ON server_members FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- CHANNELS
-- ============================================================
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','voice','announcement','forum')),
  topic TEXT,
  position INT DEFAULT 0,
  category TEXT DEFAULT 'CHANNELS',
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server members can view channels" ON channels FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM server_members WHERE server_id = channels.server_id AND user_id = auth.uid()
  ));
CREATE POLICY "Server owners/admins can manage channels" ON channels FOR ALL
  USING (EXISTS (
    SELECT 1 FROM server_members WHERE server_id = channels.server_id AND user_id = auth.uid() AND role IN ('owner','admin')
  ));

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_channel_id_created_at_idx ON messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_content_search_idx ON messages USING gin(to_tsvector('english', content));

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel members can read messages" ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM channels c
    JOIN server_members sm ON sm.server_id = c.server_id
    WHERE c.id = messages.channel_id AND sm.user_id = auth.uid()
  ));
CREATE POLICY "Channel members can send messages" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM channels c
      JOIN server_members sm ON sm.server_id = c.server_id
      WHERE c.id = channel_id AND sm.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can edit own messages" ON messages FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- REALTIME - Enable for live updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE server_members;

-- ============================================================
-- FUNCTION: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================
-- After registering your first user, you can run:
-- INSERT INTO servers (name, owner_id, invite_code, description)
-- VALUES ('My Server', '<your-user-id>', 'MYCODE1', 'A test server');
-- 
-- INSERT INTO channels (server_id, name, type, position, category)
-- VALUES ('<server-id>', 'general', 'text', 0, 'TEXT CHANNELS'),
--        ('<server-id>', 'off-topic', 'text', 1, 'TEXT CHANNELS'),
--        ('<server-id>', 'General', 'voice', 2, 'VOICE CHANNELS');
