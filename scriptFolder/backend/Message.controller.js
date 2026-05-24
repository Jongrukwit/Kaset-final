// ============================================================
// DISCORD CLONE — MESSAGE CONTROLLER (Backend)
// แก้ไขค่าต่างๆ ในส่วนนี้เพื่อปรับแต่งระบบข้อความ
// ============================================================

const MAX_MESSAGE_LENGTH = 2000;        // ความยาวสูงสุดของข้อความ (ตัวอักษร)
const DEFAULT_MESSAGE_LIMIT = 50;       // จำนวน message ที่ return ต่อครั้ง
const MAX_MESSAGE_LIMIT = 100;          // จำนวน message สูงสุดที่ request ได้
const MAX_ATTACHMENTS_PER_MSG = 10;     // จำนวน attachment สูงสุดต่อ message
const MAX_REACTIONS_PER_MSG = 20;       // จำนวน emoji reaction สูงสุดต่อ message
const MAX_BULK_DELETE = 100;            // จำนวน message สูงสุดที่ลบพร้อมกันได้
const BULK_DELETE_MAX_AGE_DAYS = 14;    // message เกิน N วันลบพร้อมกันไม่ได้

// ============================================================
// MESSAGE CONTROLLER
// ============================================================

class MessageController {
  // GET /channels/:channelId/messages
  // Permission: READ_MESSAGES
  // Query: before (message_id), after (message_id), limit (default 50, max 100)
  // Response: { messages: [message_objects], has_more: boolean }
  static async getMessages(req, res) {
    const { channelId } = req.params;
    const { before, after, limit = DEFAULT_MESSAGE_LIMIT } = req.query;
    const safeLimit = Math.min(Number(limit), MAX_MESSAGE_LIMIT);

    // 1. ตรวจสอบว่า user มี permission READ_MESSAGES ใน channel นี้
    // 2. สร้าง query:
    //    SELECT m.*, u.username, u.display_name, u.avatar_url,
    //           json_agg(a.*) AS attachments,
    //           json_agg(r.*) AS reactions
    //    FROM messages m
    //    JOIN users u ON m.author_id = u.id
    //    LEFT JOIN attachments a ON a.message_id = m.id
    //    LEFT JOIN message_reactions r ON r.message_id = m.id
    //    WHERE m.channel_id = $1
    //      AND (before IS NULL OR m.id < $2)  -- cursor pagination
    //      AND (after IS NULL OR m.id > $3)
    //    GROUP BY m.id, u.id
    //    ORDER BY m.created_at DESC
    //    LIMIT $4

    res.status(200).json({ messages: [], has_more: false });
  }

  // POST /channels/:channelId/messages
  // Permission: SEND_MESSAGES
  // Body: { content, attachments?: [attachment_ids], reply_to?: message_id }
  // Response: { message }
  static async sendMessage(req, res) {
    const { channelId } = req.params;
    const { content, attachments = [], reply_to } = req.body;
    const authorId = req.user.id;

    // 1. ตรวจสอบ permission: SEND_MESSAGES
    // 2. validate content length (<= MAX_MESSAGE_LENGTH)
    // 3. ตรวจสอบ attachments (<= MAX_ATTACHMENTS_PER_MSG)
    // 4. ถ้า reply_to → ตรวจสอบว่า message_id มีอยู่ในช่องเดียวกัน
    // 5. BEGIN TRANSACTION
    //    a. INSERT INTO messages (channel_id, author_id, content, reply_to_id) VALUES (...)
    //    b. ถ้ามี attachments → UPDATE attachments SET message_id=$1 WHERE id=ANY($2)
    // 6. COMMIT
    // 7. ดึง message พร้อม joins แล้ว return
    // 8. Emit MESSAGE_CREATE ผ่าน WebSocket ไปยังทุก user ใน channel
    // 9. อัปเดต last_message_id ใน channels table
    // 10. trigger notification ถ้ามี @mention

    res.status(201).json({ message: {} });
  }

  // PATCH /channels/:channelId/messages/:messageId
  // Permission: เฉพาะ author หรือ MANAGE_MESSAGES
  // Body: { content }
  // Response: { message }
  static async editMessage(req, res) {
    const { channelId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // 1. SELECT message WHERE id=$1 AND channel_id=$2
    // 2. ตรวจสอบว่าเป็น author หรือ มี MANAGE_MESSAGES permission
    // 3. validate content length
    // 4. UPDATE messages SET content=$1, edited_at=now(), is_edited=true WHERE id=$2
    // 5. Emit MESSAGE_UPDATE ผ่าน WebSocket

    res.status(200).json({ message: {} });
  }

  // DELETE /channels/:channelId/messages/:messageId
  // Permission: เฉพาะ author หรือ MANAGE_MESSAGES
  static async deleteMessage(req, res) {
    const { channelId, messageId } = req.params;
    const userId = req.user.id;

    // 1. SELECT message WHERE id=$1 AND channel_id=$2
    // 2. ตรวจสอบ permission
    // 3. DELETE FROM messages WHERE id=$1
    // 4. DELETE FROM attachments WHERE message_id=$1
    // 5. Emit MESSAGE_DELETE ผ่าน WebSocket: { message_id, channel_id }

    res.status(204).send();
  }

  // DELETE /channels/:channelId/messages (bulk delete)
  // Permission: MANAGE_MESSAGES
  // Body: { message_ids: string[] }
  static async bulkDeleteMessages(req, res) {
    const { channelId } = req.params;
    const { message_ids } = req.body;

    // 1. ตรวจสอบ permission: MANAGE_MESSAGES
    // 2. message_ids.length <= MAX_BULK_DELETE
    // 3. กรอง message ที่เก่าเกิน BULK_DELETE_MAX_AGE_DAYS ออก
    // 4. DELETE FROM messages WHERE id=ANY($1) AND channel_id=$2
    // 5. Emit MESSAGE_DELETE events ผ่าน WebSocket

    res.status(200).json({ deleted_count: 0 });
  }

  // PUT /channels/:channelId/messages/:messageId/reactions/:emoji
  // Permission: ADD_REACTIONS
  static async addReaction(req, res) {
    const { channelId, messageId, emoji } = req.params;
    const userId = req.user.id;

    // 1. ตรวจสอบ permission
    // 2. นับ distinct emoji บน message (<= MAX_REACTIONS_PER_MSG)
    // 3. INSERT INTO message_reactions (message_id, user_id, emoji)
    //    ON CONFLICT (message_id, user_id, emoji) DO NOTHING
    // 4. Emit REACTION_ADD ผ่าน WebSocket

    res.status(200).json({ success: true });
  }

  // DELETE /channels/:channelId/messages/:messageId/reactions/:emoji
  static async removeReaction(req, res) {
    const { channelId, messageId, emoji } = req.params;
    const userId = req.user.id;

    // 1. DELETE FROM message_reactions
    //    WHERE message_id=$1 AND user_id=$2 AND emoji=$3
    // 2. Emit REACTION_REMOVE ผ่าน WebSocket

    res.status(204).send();
  }

  // PUT /channels/:channelId/pins/:messageId
  // Permission: MANAGE_MESSAGES
  static async pinMessage(req, res) {
    const { channelId, messageId } = req.params;
    // 1. ตรวจสอบ permission: MANAGE_MESSAGES
    // 2. UPDATE messages SET is_pinned=true WHERE id=$1 AND channel_id=$2
    // 3. Emit MESSAGE_PIN ผ่าน WebSocket
    res.status(200).json({ success: true });
  }

  // GET /channels/:channelId/pins
  static async getPinnedMessages(req, res) {
    const { channelId } = req.params;
    // SELECT * FROM messages WHERE channel_id=$1 AND is_pinned=true
    // ORDER BY created_at DESC
    res.status(200).json({ messages: [] });
  }

  // POST /channels/:channelId/attachments
  // Body: multipart/form-data (field: "file")
  // Response: { attachment }
  static async uploadAttachment(req, res) {
    const { channelId } = req.params;
    const file = req.file;

    // 1. ตรวจสอบ permission: SEND_MESSAGES
    // 2. ตรวจสอบ file size (<= MAX_FILE_SIZE_BYTES จาก config)
    // 3. ตรวจสอบ MIME type
    // 4. อัปโหลดผ่าน StorageService (local/s3/cloudinary ตาม STORAGE_CONFIG)
    // 5. INSERT INTO attachments (filename, url, size, content_type, channel_id)
    // 6. Return { id, filename, url, size, content_type }

    res.status(201).json({ attachment: {} });
  }
}

// ============================================================
// SEARCH CONTROLLER
// ============================================================

class SearchController {
  // GET /search/guilds?q=query&limit=10
  static async searchGuilds(req, res) {
    const { q, limit = 10 } = req.query;
    // SELECT id, name, icon_url, description, member_count
    // FROM guilds
    // WHERE name ILIKE $1 AND is_public=true
    // ORDER BY member_count DESC
    // LIMIT $2
    // $1 = `%${q}%`
    res.status(200).json({ guilds: [] });
  }

  // GET /search/messages?q=&guild_id=&channel_id=&from=&before=&after=&has=&pinned=
  static async searchMessages(req, res) {
    const { q, guild_id, channel_id, from, before, after, has, pinned } = req.query;
    const userId = req.user.id;

    // สร้าง dynamic WHERE clause:
    // WHERE m.channel_id IN (channels ที่ user มีสิทธิ์ READ_MESSAGES)
    //   AND (guild_id → กรองตาม guild)
    //   AND (channel_id → กรองตาม channel)
    //   AND m.content ILIKE '%q%'   หรือใช้ full-text search (tsvector)
    //   AND (from → author_id = user_id ของ from username)
    //   AND (before → m.created_at < before_date)
    //   AND (after → m.created_at > after_date)
    //   AND (has=link → m.content ILIKE '%http%')
    //   AND (has=image → EXISTS (SELECT 1 FROM attachments WHERE message_id=m.id AND content_type ILIKE 'image/%'))
    //   AND (pinned=true → m.is_pinned=true)
    // ORDER BY m.created_at DESC LIMIT 25

    res.status(200).json({ messages: [], total: 0 });
  }

  // GET /search/users?q=query&limit=10
  static async searchUsers(req, res) {
    const { q, limit = 10 } = req.query;
    // SELECT id, username, display_name, avatar_url
    // FROM users
    // WHERE (username ILIKE $1 OR display_name ILIKE $1)
    //   AND is_deleted=false
    // LIMIT $2
    res.status(200).json({ users: [] });
  }
}

module.exports = { MessageController, SearchController };