-- ============================================================
-- DISCORD CLONE — DATABASE SCHEMA (PostgreSQL)
-- แก้ไข DEFAULT VALUES และ CONSTRAINTS ตามต้องการ
-- ============================================================

-- ============================================================
-- CONFIGURATION (แก้ไขตามต้องการ)
-- ============================================================

-- ชื่อ schema (ปกติใช้ public)
-- SET search_path TO public;

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- สร้าง UUID
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Full-text search แบบ trigram
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- ค้นหาโดยไม่คำนึง accent

-- ============================================================
-- USERS TABLE
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(32) NOT NULL UNIQUE,
    display_name    VARCHAR(32),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),
    avatar_url      TEXT,
    bio             TEXT DEFAULT '',
    status          VARCHAR(20) DEFAULT 'offline'
                      CHECK (status IN ('online','idle','dnd','invisible','offline')),
    custom_status   VARCHAR(128) DEFAULT '',
    system_role     VARCHAR(20) DEFAULT 'user'
                      CHECK (system_role IN ('super_admin','admin','moderator','user')),
    is_banned       BOOLEAN DEFAULT FALSE,
    ban_reason      TEXT,
    banned_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    ban_expires_at  TIMESTAMPTZ,
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    must_change_password BOOLEAN DEFAULT FALSE,
    email_verified  BOOLEAN DEFAULT FALSE,
    last_seen       TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users USING gin(username gin_trgm_ops);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_system_role ON users(system_role);

-- ============================================================
-- USER REFRESH TOKENS TABLE
-- ============================================================

CREATE TABLE user_refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON user_refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON user_refresh_tokens(token_hash);

-- ============================================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================================

CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GUILDS TABLE
-- ============================================================

CREATE TABLE guilds (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    description     TEXT DEFAULT '',
    icon_url        TEXT,
    banner_url      TEXT,
    owner_id        UUID NOT NULL REFERENCES users(id),
    is_public       BOOLEAN DEFAULT TRUE,
    max_members     INT DEFAULT 500000,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guilds_owner ON guilds(owner_id);
CREATE INDEX idx_guilds_name ON guilds USING gin(name gin_trgm_ops);

-- ============================================================
-- GUILD MEMBERS TABLE
-- ============================================================

CREATE TABLE guild_members (
    guild_id    UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname    VARCHAR(32),
    is_owner    BOOLEAN DEFAULT FALSE,
    joined_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (guild_id, user_id)
);

CREATE INDEX idx_guild_members_user ON guild_members(user_id);
CREATE INDEX idx_guild_members_guild ON guild_members(guild_id);

-- ============================================================
-- GUILD ROLES TABLE
-- ============================================================

CREATE TABLE guild_roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id    UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    color       VARCHAR(7) DEFAULT '#99AAB5',    -- hex color
    permissions JSONB DEFAULT '[]',              -- array of permission strings
    position    INT DEFAULT 0,
    is_default  BOOLEAN DEFAULT FALSE,           -- @everyone role
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roles_guild ON guild_roles(guild_id);

-- ============================================================
-- MEMBER ROLES (many-to-many)
-- ============================================================

CREATE TABLE member_roles (
    guild_id    UUID NOT NULL,
    user_id     UUID NOT NULL,
    role_id     UUID NOT NULL REFERENCES guild_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (guild_id, user_id, role_id)
);

-- ============================================================
-- GUILD INVITES TABLE
-- ============================================================

CREATE TABLE guild_invites (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id    UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    code        VARCHAR(20) NOT NULL UNIQUE,
    created_by  UUID NOT NULL REFERENCES users(id),
    uses        INT DEFAULT 0,
    max_uses    INT,                             -- NULL = ไม่จำกัด
    expires_at  TIMESTAMPTZ,                     -- NULL = ไม่หมดอายุ
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invites_code ON guild_invites(code);

-- ============================================================
-- GUILD BANS TABLE
-- ============================================================

CREATE TABLE guild_bans (
    guild_id    UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      TEXT DEFAULT '',
    banned_by   UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (guild_id, user_id)
);

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id    UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    position    INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_guild ON categories(guild_id);

-- ============================================================
-- CHANNELS TABLE
-- ============================================================

CREATE TABLE channels (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id        UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(20) DEFAULT 'text'
                      CHECK (type IN ('text','voice','announcement','stage')),
    topic           TEXT DEFAULT '',
    position        INT DEFAULT 0,
    is_nsfw         BOOLEAN DEFAULT FALSE,
    last_message_id UUID,                       -- FK ไป messages (add constraint ทีหลัง)
    bitrate         INT DEFAULT 64000,          -- สำหรับ voice channel (bps)
    user_limit      INT DEFAULT 0,              -- 0 = ไม่จำกัด
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_channels_guild ON channels(guild_id);
CREATE INDEX idx_channels_category ON channels(category_id);

-- ============================================================
-- MESSAGES TABLE
-- ============================================================

CREATE TABLE messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    content     VARCHAR(2000) NOT NULL DEFAULT '',
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_edited   BOOLEAN DEFAULT FALSE,
    edited_at   TIMESTAMPTZ,
    is_pinned   BOOLEAN DEFAULT FALSE,
    is_deleted  BOOLEAN DEFAULT FALSE,          -- soft delete
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_author ON messages(author_id);
CREATE INDEX idx_messages_content ON messages USING gin(content gin_trgm_ops);  -- สำหรับ search

-- Update last_message_id ใน channels อัตโนมัติ
CREATE OR REPLACE FUNCTION update_channel_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE channels SET last_message_id = NEW.id WHERE id = NEW.channel_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_channel_last_message();

-- ============================================================
-- ATTACHMENTS TABLE
-- ============================================================

CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id      UUID REFERENCES messages(id) ON DELETE CASCADE,
    channel_id      UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    filename        VARCHAR(255) NOT NULL,
    url             TEXT NOT NULL,
    size_bytes      BIGINT NOT NULL,
    content_type    VARCHAR(100) NOT NULL,
    width           INT,                        -- สำหรับ image
    height          INT,                        -- สำหรับ image
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_message ON attachments(message_id);

-- ============================================================
-- MESSAGE REACTIONS TABLE
-- ============================================================

CREATE TABLE message_reactions (
    message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji       VARCHAR(50) NOT NULL,           -- unicode emoji หรือ :name:
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON message_reactions(message_id);

-- ============================================================
-- VOICE STATES TABLE (สถานะ voice ปัจจุบันของ user)
-- ============================================================

CREATE TABLE voice_states (
    guild_id        UUID REFERENCES guilds(id) ON DELETE CASCADE,
    channel_id      UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_muted        BOOLEAN DEFAULT FALSE,
    is_deafened     BOOLEAN DEFAULT FALSE,
    is_video_on     BOOLEAN DEFAULT FALSE,
    is_screen_share BOOLEAN DEFAULT FALSE,
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id)                       -- user อยู่ได้แค่ 1 voice channel
);

CREATE INDEX idx_voice_states_channel ON voice_states(channel_id);

-- ============================================================
-- ADMIN AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id    UUID NOT NULL REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,          -- เช่น "admin.user.ban"
    target_id   UUID,                           -- id ของ target (user, guild, etc.)
    target_type VARCHAR(50),                    -- "user" | "guild" | "message" | etc.
    metadata    JSONB DEFAULT '{}',             -- ข้อมูลเพิ่มเติม
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- SYSTEM REPORTS TABLE (user report content ไม่เหมาะสม)
-- ============================================================

CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id     UUID NOT NULL REFERENCES users(id),
    target_type     VARCHAR(20) NOT NULL CHECK (target_type IN ('message','user','guild')),
    target_id       UUID NOT NULL,
    reason          VARCHAR(100) NOT NULL,
    description     TEXT DEFAULT '',
    status          VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending','reviewing','resolved','dismissed')),
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_target ON reports(target_id);