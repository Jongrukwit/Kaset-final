// ============================================================
// DISCORD CLONE — GUILD & CHANNEL CONTROLLER (Backend)
// แก้ไขค่าต่างๆ ในส่วนนี้เพื่อปรับแต่งพฤติกรรม Guild
// ============================================================

const GUILD_NAME_MIN_LENGTH = 2;
const GUILD_NAME_MAX_LENGTH = 100;
const CHANNEL_NAME_MIN_LENGTH = 1;
const CHANNEL_NAME_MAX_LENGTH = 100;
const MAX_GUILDS_PER_USER = 100;          // จำนวน guild สูงสุดที่ user สร้างได้
const MAX_CHANNELS_PER_GUILD = 500;       // จำนวน channel สูงสุดต่อ guild
const MAX_CATEGORIES_PER_GUILD = 50;      // จำนวน category สูงสุดต่อ guild
const INVITE_EXPIRY_HOURS = 24;           // อายุ invite link (ชั่วโมง) — 0 = ไม่หมดอายุ
const DEFAULT_MAX_MEMBERS = 500000;       // จำนวนสมาชิกสูงสุดต่อ guild

const GUILD_PERMISSIONS = {
  ADMINISTRATOR: "administrator",         // สิทธิ์ทุกอย่าง
  MANAGE_GUILD: "manage_guild",           // แก้ไขข้อมูล guild
  MANAGE_CHANNELS: "manage_channels",     // สร้าง/แก้ไข/ลบ channel
  MANAGE_MEMBERS: "manage_members",       // จัดการสมาชิก
  MANAGE_ROLES: "manage_roles",           // จัดการ role
  KICK_MEMBERS: "kick_members",           // ไล่สมาชิก
  BAN_MEMBERS: "ban_members",             // แบนสมาชิก
  SEND_MESSAGES: "send_messages",         // ส่งข้อความ
  MANAGE_MESSAGES: "manage_messages",     // ลบ/แก้ไขข้อความของคนอื่น
  CONNECT_VOICE: "connect_voice",         // เข้า voice channel
  SPEAK: "speak",                         // พูดใน voice channel
  MUTE_MEMBERS: "mute_members",           // ปิดเสียงสมาชิก
  MOVE_MEMBERS: "move_members",           // ย้ายสมาชิกใน voice
  CREATE_INVITE: "create_invite",         // สร้าง invite link
  READ_MESSAGES: "read_messages",         // อ่านข้อความ
};

// ============================================================
// GUILD CONTROLLER
// ============================================================

class GuildController {
  // GET /guilds
  // Headers: Authorization (required)
  // Response: { guilds: [guild_objects] }
  static async listMyGuilds(req, res) {
    const userId = req.user.id;
    // SELECT g.* FROM guilds g
    // JOIN guild_members gm ON g.id = gm.guild_id
    // WHERE gm.user_id = $1
    // ORDER BY gm.joined_at ASC
    res.status(200).json({ guilds: [] });
  }

  // POST /guilds
  // Body: { name, icon?, description? } (multipart/form-data สำหรับ icon)
  // Response: { guild }
  static async createGuild(req, res) {
    const userId = req.user.id;
    const { name, description } = req.body;
    const iconFile = req.file;
    // 1. ตรวจสอบ guild count ของ user (MAX_GUILDS_PER_USER)
    // 2. validate name (GUILD_NAME_MIN_LENGTH, GUILD_NAME_MAX_LENGTH)
    // 3. อัปโหลด icon ถ้ามี → StorageService.upload(iconFile)
    // 4. BEGIN TRANSACTION
    //    a. INSERT INTO guilds (name, description, icon_url, owner_id) VALUES ($1,$2,$3,$4)
    //    b. INSERT INTO guild_members (guild_id, user_id, is_owner) VALUES ($1,$2,true)
    //    c. สร้าง default roles: "everyone", "admin"
    //    d. สร้าง default channels: "general" (text), "General" (voice)
    // 5. COMMIT
    // 6. Emit GUILD_CREATE event ผ่าน WebSocket ไปยัง user
    res.status(201).json({ guild: {} });
  }

  // GET /guilds/:guildId
  // Response: { guild }
  static async getGuild(req, res) {
    const { guildId } = req.params;
    // 1. ตรวจสอบว่า user เป็นสมาชิก guild นี้
    // 2. SELECT guild + categories + channels + member_count
    res.status(200).json({ guild: {} });
  }

  // PATCH /guilds/:guildId
  // Permission: MANAGE_GUILD
  // Body: { name?, description?, icon? }
  // Response: { guild }
  static async updateGuild(req, res) {
    const { guildId } = req.params;
    // 1. ตรวจสอบ permission: MANAGE_GUILD
    // 2. UPDATE guilds SET name=$1, description=$2, icon_url=$3 WHERE id=$4
    // 3. Emit GUILD_UPDATE ผ่าน WebSocket ไปยังทุก member
    res.status(200).json({ guild: {} });
  }

  // DELETE /guilds/:guildId
  // Permission: owner เท่านั้น
  static async deleteGuild(req, res) {
    const { guildId } = req.params;
    // 1. ตรวจสอบว่าเป็น owner
    // 2. BEGIN TRANSACTION
    //    a. DELETE messages ใน channels ทั้งหมด
    //    b. DELETE channels
    //    c. DELETE members
    //    d. DELETE roles
    //    e. DELETE guild
    // 3. COMMIT
    // 4. Emit GUILD_DELETE ผ่าน WebSocket
    res.status(204).send();
  }

  // POST /guilds/join
  // Body: { invite_code }
  // Response: { guild }
  static async joinByInvite(req, res) {
    const { invite_code } = req.body;
    const userId = req.user.id;
    // 1. SELECT invite WHERE code=$1 AND (expires_at IS NULL OR expires_at > now())
    // 2. ตรวจสอบว่า user ไม่ได้เป็นสมาชิกอยู่แล้ว
    // 3. ตรวจสอบ member count < max_members
    // 4. INSERT INTO guild_members (guild_id, user_id) VALUES ($1,$2)
    // 5. อัปเดต invite uses count
    // 6. Return guild data
    res.status(200).json({ guild: {} });
  }

  // GET /guilds/:guildId/invite
  // Permission: CREATE_INVITE
  // Response: { invite_code, expires_at }
  static async getInviteLink(req, res) {
    const { guildId } = req.params;
    // 1. ตรวจสอบ permission: CREATE_INVITE
    // 2. สร้าง invite code (nanoid หรือ crypto.randomBytes)
    // 3. INSERT INTO guild_invites (guild_id, code, created_by, expires_at)
    //    expires_at = INVITE_EXPIRY_HOURS === 0 ? null : now() + interval
    // 4. Return { invite_code, invite_url, expires_at }
    res.status(200).json({ invite_code: "" });
  }

  // GET /guilds/:guildId/members
  // Query: page, limit (default 100)
  static async getMembers(req, res) {
    const { guildId } = req.params;
    const { page = 1, limit = 100 } = req.query;
    // SELECT gm.*, u.username, u.display_name, u.avatar_url, u.status
    // FROM guild_members gm
    // JOIN users u ON gm.user_id = u.id
    // WHERE gm.guild_id = $1
    // ORDER BY u.username ASC
    // LIMIT $2 OFFSET $3
    res.status(200).json({ members: [], total: 0 });
  }

  // DELETE /guilds/:guildId/members/:userId  (kick)
  // Permission: KICK_MEMBERS
  static async kickMember(req, res) {
    const { guildId, userId } = req.params;
    // 1. ตรวจสอบ permission: KICK_MEMBERS
    // 2. ตรวจสอบว่าไม่ได้ kick owner หรือ admin
    // 3. DELETE FROM guild_members WHERE guild_id=$1 AND user_id=$2
    // 4. Emit MEMBER_REMOVE event ผ่าน WebSocket
    res.status(204).send();
  }

  // PUT /guilds/:guildId/bans/:userId
  // Permission: BAN_MEMBERS
  // Body: { reason? }
  static async banMember(req, res) {
    const { guildId, userId } = req.params;
    const { reason = "" } = req.body;
    // 1. ตรวจสอบ permission: BAN_MEMBERS
    // 2. DELETE FROM guild_members WHERE guild_id=$1 AND user_id=$2
    // 3. INSERT INTO guild_bans (guild_id, user_id, reason, banned_by, created_at)
    // 4. Emit BAN event ผ่าน WebSocket
    res.status(200).json({ success: true });
  }
}

// ============================================================
// CHANNEL CONTROLLER
// ============================================================

class ChannelController {
  // GET /guilds/:guildId/channels
  static async listChannels(req, res) {
    const { guildId } = req.params;
    // SELECT channels + categories สำหรับ guild นี้
    // ตรวจสอบ permission ของ user สำหรับแต่ละ channel (read_messages)
    // Response: { categories: [...channels grouped by category] }
    res.status(200).json({ channels: [], categories: [] });
  }

  // POST /guilds/:guildId/channels
  // Permission: MANAGE_CHANNELS
  // Body: { name, type, category_id?, position?, topic? }
  static async createChannel(req, res) {
    const { guildId } = req.params;
    const { name, type, category_id, position = 0, topic = "" } = req.body;
    // 1. ตรวจสอบ permission: MANAGE_CHANNELS
    // 2. ตรวจสอบจำนวน channel (MAX_CHANNELS_PER_GUILD)
    // 3. validate name (CHANNEL_NAME_MIN_LENGTH, CHANNEL_NAME_MAX_LENGTH)
    // 4. INSERT INTO channels (guild_id, name, type, category_id, position, topic)
    // 5. Emit CHANNEL_CREATE ผ่าน WebSocket
    res.status(201).json({ channel: {} });
  }

  // PATCH /channels/:channelId
  // Permission: MANAGE_CHANNELS
  // Body: { name?, topic?, position? }
  static async updateChannel(req, res) {
    const { channelId } = req.params;
    // 1. ตรวจสอบ permission: MANAGE_CHANNELS
    // 2. UPDATE channels SET ... WHERE id=$1
    // 3. Emit CHANNEL_UPDATE ผ่าน WebSocket
    res.status(200).json({ channel: {} });
  }

  // DELETE /channels/:channelId
  // Permission: MANAGE_CHANNELS
  static async deleteChannel(req, res) {
    const { channelId } = req.params;
    // 1. ตรวจสอบ permission: MANAGE_CHANNELS
    // 2. BEGIN TRANSACTION
    //    a. DELETE messages WHERE channel_id=$1
    //    b. DELETE channels WHERE id=$1
    // 3. COMMIT
    // 4. Emit CHANNEL_DELETE ผ่าน WebSocket
    res.status(204).send();
  }

  // PUT /guilds/:guildId/channels/reorder
  // Permission: MANAGE_CHANNELS
  // Body: [{ id, position }]
  static async reorderChannels(req, res) {
    const orders = req.body;
    // BEGIN TRANSACTION
    // UPDATE channels SET position=$1 WHERE id=$2 สำหรับแต่ละ item
    // COMMIT
    // Emit CHANNEL_UPDATE ผ่าน WebSocket
    res.status(200).json({ success: true });
  }
}

module.exports = { GuildController, ChannelController, GUILD_PERMISSIONS };