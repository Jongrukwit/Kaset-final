// ============================================================
// DISCORD CLONE — ADMIN USER MANAGEMENT CONTROLLER (Backend)
// แก้ไขค่าต่างๆ ในส่วนนี้เพื่อปรับแต่งระบบ Admin
// ============================================================

const DEFAULT_PAGE_SIZE = 20;           // จำนวน record ต่อหน้าสำหรับ admin list
const MAX_PAGE_SIZE = 100;              // จำนวน record สูงสุดต่อหน้า
const ADMIN_AUDIT_LOG_RETENTION_DAYS = 90;  // เก็บ audit log ไว้กี่วัน

// ============================================================
// ADMIN ROLE LEVELS (ระดับสิทธิ์ Admin ของระบบ)
// ============================================================

const SYSTEM_ROLES = {
  SUPER_ADMIN: "super_admin",  // สิทธิ์ทุกอย่าง รวมถึงแต่งตั้ง admin คนอื่น
  ADMIN: "admin",              // จัดการ user, guild, content
  MODERATOR: "moderator",      // ดู report, ban user, จัดการ content ไม่เหมาะสม
};

// สิทธิ์ที่แต่ละ role ทำได้
const ROLE_PERMISSIONS = {
  [SYSTEM_ROLES.SUPER_ADMIN]: ["*"],  // ทุกอย่าง
  [SYSTEM_ROLES.ADMIN]: [
    "users.list", "users.view", "users.update", "users.ban", "users.delete",
    "guilds.list", "guilds.view", "guilds.delete",
    "reports.list", "reports.view", "reports.resolve",
    "audit.view",
  ],
  [SYSTEM_ROLES.MODERATOR]: [
    "users.list", "users.view", "users.ban",
    "guilds.list", "guilds.view",
    "reports.list", "reports.view", "reports.resolve",
  ],
};

// ============================================================
// ROUTES DEFINITION
// ============================================================

// router.use("/admin", requireAuth, requireSystemAdmin);
// router.get("/admin/users", AdminController.listUsers);
// router.get("/admin/users/:userId", AdminController.getUser);
// router.patch("/admin/users/:userId", AdminController.updateUser);
// router.post("/admin/users/:userId/ban", AdminController.banUser);
// router.post("/admin/users/:userId/unban", AdminController.unbanUser);
// router.delete("/admin/users/:userId", AdminController.deleteUser);
// router.post("/admin/users/:userId/reset-password", AdminController.forceResetPassword);
// router.patch("/admin/users/:userId/role", AdminController.updateUserRole);
// router.get("/admin/guilds", AdminController.listGuilds);
// router.delete("/admin/guilds/:guildId", AdminController.forceDeleteGuild);
// router.get("/admin/reports", AdminController.listReports);
// router.patch("/admin/reports/:reportId", AdminController.resolveReport);
// router.get("/admin/audit-logs", AdminController.getAuditLogs);
// router.get("/admin/stats", AdminController.getSystemStats);

// ============================================================
// ADMIN CONTROLLER
// ============================================================

class AdminController {
  // GET /admin/users
  // Query: page, limit, search, status, role, banned, sort_by, sort_order
  // Response: { users: [...], total, page, total_pages }
  static async listUsers(req, res) {
    const {
      page = 1,
      limit = DEFAULT_PAGE_SIZE,
      search = "",
      status,           // online | idle | dnd | offline
      role,             // super_admin | admin | moderator | user
      banned,           // "true" | "false"
      sort_by = "created_at",   // created_at | username | last_seen
      sort_order = "desc",      // asc | desc
    } = req.query;

    const safeLimit = Math.min(Number(limit), MAX_PAGE_SIZE);
    const offset = (page - 1) * safeLimit;

    // SELECT u.id, u.username, u.display_name, u.email, u.avatar_url,
    //        u.status, u.system_role, u.is_banned, u.ban_reason,
    //        u.created_at, u.last_seen,
    //        COUNT(gm.guild_id) AS guild_count
    // FROM users u
    // LEFT JOIN guild_members gm ON gm.user_id = u.id
    // WHERE (search → u.username ILIKE '%search%' OR u.email ILIKE '%search%' OR u.display_name ILIKE '%search%')
    //   AND (status → u.status = $status)
    //   AND (role → u.system_role = $role)
    //   AND (banned → u.is_banned = $banned)
    // GROUP BY u.id
    // ORDER BY $sort_by $sort_order
    // LIMIT $safeLimit OFFSET $offset

    res.status(200).json({ users: [], total: 0, page: Number(page), total_pages: 0 });
  }

  // GET /admin/users/:userId
  // Response: { user, guilds, recent_activity }
  static async getUser(req, res) {
    const { userId } = req.params;

    // 1. SELECT user ทุก field (รวม email, ip_address ที่ซ่อนจาก public)
    // 2. SELECT guilds ที่ user อยู่
    // 3. SELECT 50 messages ล่าสุด (สำหรับดู activity)
    // 4. SELECT audit logs ที่เกี่ยวกับ user นี้

    res.status(200).json({ user: {}, guilds: [], recent_messages: [] });
  }

  // PATCH /admin/users/:userId
  // Permission: ADMIN
  // Body: { display_name?, email?, avatar_url? }
  static async updateUser(req, res) {
    const { userId } = req.params;
    const updates = req.body;

    // 1. validate updates
    // 2. UPDATE users SET ... WHERE id=$1
    // 3. บันทึก Audit Log: { action: "admin.user.update", target_id: userId, admin_id: req.user.id }

    res.status(200).json({ user: {} });
  }

  // POST /admin/users/:userId/ban
  // Permission: ADMIN | MODERATOR
  // Body: { reason, duration_days? } (null = permanent)
  static async banUser(req, res) {
    const { userId } = req.params;
    const { reason = "", duration_days = null } = req.body;
    const adminId = req.user.id;

    // 1. ตรวจสอบว่าไม่ ban SUPER_ADMIN
    // 2. UPDATE users SET is_banned=true, ban_reason=$1, banned_by=$2,
    //      ban_expires_at = duration_days ? now() + interval : null
    //    WHERE id=$3
    // 3. ปิด WebSocket connections ทั้งหมดของ user
    // 4. บันทึก Audit Log
    // 5. Emit force disconnect event ผ่าน WebSocket

    res.status(200).json({ success: true });
  }

  // POST /admin/users/:userId/unban
  static async unbanUser(req, res) {
    const { userId } = req.params;
    // UPDATE users SET is_banned=false, ban_reason=null, ban_expires_at=null WHERE id=$1
    // บันทึก Audit Log
    res.status(200).json({ success: true });
  }

  // DELETE /admin/users/:userId
  // Permission: SUPER_ADMIN เท่านั้น
  static async deleteUser(req, res) {
    const { userId } = req.params;

    // SOFT DELETE: ไม่ลบจริง แต่ mark ว่าลบแล้ว
    // UPDATE users SET
    //   is_deleted = true,
    //   deleted_at = now(),
    //   email = 'deleted_' + id + '@deleted.com',  -- anonymize
    //   username = 'deleted_user_' + id,
    //   display_name = 'Deleted User',
    //   avatar_url = null,
    //   password_hash = null
    // WHERE id=$1
    // บันทึก Audit Log

    res.status(200).json({ success: true });
  }

  // POST /admin/users/:userId/reset-password
  // Permission: ADMIN
  // Response: { temp_password } (ส่ง email ให้ user หรือ return สำหรับ manual)
  static async forceResetPassword(req, res) {
    const { userId } = req.params;
    // 1. สร้าง temp password (crypto.randomBytes(12).toString("hex"))
    // 2. bcrypt.hash temp password
    // 3. UPDATE users SET password_hash=$1, must_change_password=true WHERE id=$2
    // 4. Invalidate refresh tokens ทั้งหมด
    // 5. ส่ง email แจ้ง user
    // 6. บันทึก Audit Log
    res.status(200).json({ message: "Password reset email sent" });
  }

  // PATCH /admin/users/:userId/role
  // Permission: SUPER_ADMIN เท่านั้น
  // Body: { role: "super_admin" | "admin" | "moderator" | "user" }
  static async updateUserRole(req, res) {
    const { userId } = req.params;
    const { role } = req.body;

    // 1. ตรวจสอบว่า role อยู่ใน SYSTEM_ROLES
    // 2. ป้องกันการ downgrade SUPER_ADMIN ตัวเอง
    // 3. UPDATE users SET system_role=$1 WHERE id=$2
    // 4. บันทึก Audit Log

    res.status(200).json({ success: true });
  }

  // GET /admin/guilds
  // Query: page, limit, search, sort_by
  static async listGuilds(req, res) {
    const { page = 1, limit = DEFAULT_PAGE_SIZE, search = "" } = req.query;
    // SELECT g.*, u.username AS owner_username,
    //        COUNT(gm.user_id) AS member_count,
    //        COUNT(c.id) AS channel_count
    // FROM guilds g
    // JOIN users u ON g.owner_id = u.id
    // LEFT JOIN guild_members gm ON gm.guild_id = g.id
    // LEFT JOIN channels c ON c.guild_id = g.id
    // WHERE g.name ILIKE '%search%'
    // GROUP BY g.id, u.username
    // LIMIT $limit OFFSET $offset
    res.status(200).json({ guilds: [], total: 0 });
  }

  // DELETE /admin/guilds/:guildId (force delete)
  // Permission: ADMIN
  static async forceDeleteGuild(req, res) {
    const { guildId } = req.params;
    const { reason = "" } = req.body;
    // 1. บันทึก Audit Log ก่อน delete
    // 2. DELETE cascade: messages → channels → members → roles → guild
    // 3. Notify owner ผ่าน WebSocket/email
    res.status(200).json({ success: true });
  }

  // GET /admin/audit-logs
  // Query: page, limit, admin_id, action, target_id, from, to
  static async getAuditLogs(req, res) {
    const { page = 1, limit = DEFAULT_PAGE_SIZE, admin_id, action, from, to } = req.query;

    // SELECT al.*, u.username AS admin_username
    // FROM audit_logs al
    // JOIN users u ON al.admin_id = u.id
    // WHERE (admin_id → al.admin_id = $admin_id)
    //   AND (action → al.action = $action)
    //   AND (from → al.created_at >= $from)
    //   AND (to → al.created_at <= $to)
    // ORDER BY al.created_at DESC
    // LIMIT $limit OFFSET $offset

    res.status(200).json({ logs: [], total: 0 });
  }

  // GET /admin/stats
  // Response: ข้อมูลสถิติระบบ
  static async getSystemStats(req, res) {
    // SELECT ข้อมูลทั้งหมดใน transaction เดียว:
    // - total_users, active_users_today, new_users_this_month
    // - total_guilds, total_channels
    // - total_messages, messages_today
    // - online_users (count จาก WebSocket store)
    // - storage_used (sum ของ attachments.size)
    // - top_guilds_by_members
    // - daily_active_users (7 วันย้อนหลัง)
    res.status(200).json({ stats: {} });
  }
}

// ============================================================
// AUDIT LOG HELPER
// ============================================================

async function createAuditLog(db, { adminId, action, targetId, targetType, metadata = {} }) {
  // INSERT INTO audit_logs (admin_id, action, target_id, target_type, metadata, created_at)
  // VALUES ($1, $2, $3, $4, $5, now())
  // ตัวอย่าง action: "admin.user.ban", "admin.user.delete", "admin.guild.delete", "admin.role.update"
}

module.exports = { AdminController, SYSTEM_ROLES, ROLE_PERMISSIONS, createAuditLog };