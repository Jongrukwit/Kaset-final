// ============================================================
// DISCORD CLONE — AUTH ROUTES & CONTROLLER (Backend)
// แก้ไขค่าต่างๆ ในส่วนนี้เพื่อปรับแต่งระบบ Authentication
// ============================================================

const BCRYPT_SALT_ROUNDS = 12;                  // รอบการ hash รหัสผ่าน (ยิ่งมาก = ปลอดภัย แต่ช้า)
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 32;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const DISPLAY_NAME_MAX_LENGTH = 32;

const PASSWORD_RESET_EXPIRY_MINUTES = 15;       // อายุ link รีเซ็ตรหัสผ่าน (นาที)
const EMAIL_VERIFY_EXPIRY_HOURS = 24;           // อายุ link ยืนยัน email (ชั่วโมง)

// ============================================================
// VALIDATION SCHEMAS (ใช้กับ Joi หรือ Zod)
// ============================================================

const REGISTER_SCHEMA = {
  username: { type: "string", min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH, regex: /^[a-zA-Z0-9_.-]+$/ },
  email: { type: "email", required: true },
  password: { type: "string", min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH },
  display_name: { type: "string", max: DISPLAY_NAME_MAX_LENGTH, optional: true },
};

const LOGIN_SCHEMA = {
  email: { type: "email", required: true },
  password: { type: "string", required: true },
};

// ============================================================
// ROUTES DEFINITION
// ============================================================

// Express router example:
// const router = require("express").Router();
// router.post("/auth/login", AuthController.login);
// router.post("/auth/register", AuthController.register);
// router.post("/auth/logout", requireAuth, AuthController.logout);
// router.post("/auth/refresh", AuthController.refreshToken);
// router.get("/auth/me", requireAuth, AuthController.me);
// router.post("/auth/forgot-password", AuthController.forgotPassword);
// router.post("/auth/reset-password", AuthController.resetPassword);
// module.exports = router;

// ============================================================
// AUTH CONTROLLER
// ============================================================

class AuthController {
  // POST /auth/register
  // Body: { username, email, password, display_name? }
  // Response: { user, access_token, refresh_token }
  static async register(req, res) {
    const { username, email, password, display_name } = req.body;
    // 1. Validate input ตาม REGISTER_SCHEMA
    // 2. ตรวจสอบว่า email/username ซ้ำหรือไม่ → SELECT * FROM users WHERE email=$1 OR username=$2
    // 3. hash password ด้วย bcrypt (BCRYPT_SALT_ROUNDS)
    // 4. INSERT user ลง DB → id, username, email, password_hash, display_name, created_at
    // 5. สร้าง access_token และ refresh_token (JWT)
    // 6. บันทึก refresh_token ลง DB (user_refresh_tokens table)
    // 7. Return { user: { id, username, display_name, avatar_url, status }, access_token, refresh_token }
    res.status(201).json({ message: "register stub" });
  }

  // POST /auth/login
  // Body: { email, password }
  // Response: { user, access_token, refresh_token }
  static async login(req, res) {
    const { email, password } = req.body;
    // 1. Validate input ตาม LOGIN_SCHEMA
    // 2. SELECT user WHERE email=$1
    // 3. ตรวจสอบว่า user มีอยู่ ถ้าไม่มี return 401
    // 4. bcrypt.compare(password, user.password_hash) ถ้าไม่ตรง return 401
    // 5. สร้าง access_token และ refresh_token (JWT)
    // 6. บันทึก/อัปเดต refresh_token ลง DB
    // 7. อัปเดต last_seen และ status → "online"
    // 8. Return { user, access_token, refresh_token }
    res.status(200).json({ message: "login stub" });
  }

  // POST /auth/logout
  // Headers: Authorization: Bearer <access_token>
  // Response: { success: true }
  static async logout(req, res) {
    const userId = req.user.id;
    // 1. DELETE refresh_token จาก DB สำหรับ user นี้
    // 2. อัปเดต status → "offline", last_seen = now()
    // 3. Broadcast presence update ผ่าน WebSocket
    // 4. Return { success: true }
    res.status(200).json({ success: true });
  }

  // POST /auth/refresh
  // Body: { refresh_token }
  // Response: { access_token, refresh_token }
  static async refreshToken(req, res) {
    const { refresh_token } = req.body;
    // 1. verify refresh_token ด้วย JWT_REFRESH_SECRET
    // 2. ตรวจสอบ token ใน DB ว่ายังใช้ได้อยู่
    // 3. สร้าง access_token ใหม่
    // 4. หมุนเวียน refresh_token (สร้างใหม่, ลบอัน)
    // 5. Return { access_token, refresh_token }
    res.status(200).json({ message: "refresh stub" });
  }

  // GET /auth/me
  // Headers: Authorization: Bearer <access_token>
  // Response: { user }
  static async me(req, res) {
    // req.user ถูก set โดย requireAuth middleware แล้ว
    // SELECT user + guilds ที่ join อยู่
    res.status(200).json({ user: req.user });
  }

  // POST /auth/forgot-password
  // Body: { email }
  // Response: { message: "Email sent" }
  static async forgotPassword(req, res) {
    const { email } = req.body;
    // 1. SELECT user WHERE email=$1
    // 2. สร้าง reset token (crypto.randomBytes) อายุ PASSWORD_RESET_EXPIRY_MINUTES
    // 3. บันทึก token hash ลง DB
    // 4. ส่ง email พร้อม reset link
    // 5. Return { message: "หากมี account อีเมลจะถูกส่งไป" } (อย่าบอกว่า email มีหรือไม่มี)
    res.status(200).json({ message: "email sent stub" });
  }

  // POST /auth/reset-password
  // Body: { token, new_password }
  // Response: { success: true }
  static async resetPassword(req, res) {
    const { token, new_password } = req.body;
    // 1. hash token แล้ว SELECT จาก DB
    // 2. ตรวจสอบว่า token ยังไม่หมดอายุ
    // 3. bcrypt.hash(new_password, BCRYPT_SALT_ROUNDS)
    // 4. UPDATE user SET password_hash=$1
    // 5. DELETE token จาก DB
    // 6. Invalidate refresh tokens ทั้งหมดของ user (บังคับ login ใหม่)
    res.status(200).json({ success: true });
  }
}

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

// requireAuth — ตรวจสอบ JWT และใส่ req.user
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  // 1. jwt.verify(token, JWT_ACCESS_SECRET)
  // 2. SELECT user WHERE id = decoded.sub
  // 3. ถ้า user ไม่มีหรือถูก ban → return 401
  // 4. req.user = user
  // 5. next()
}

// requireAdmin — ตรวจสอบว่า user เป็น admin ระดับ system
async function requireSystemAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// requireGuildPermission — ตรวจสอบ permission ใน guild
function requireGuildPermission(permission) {
  return async (req, res, next) => {
    const guildId = req.params.guildId;
    const userId = req.user.id;
    // 1. SELECT member + roles WHERE guild_id=$1 AND user_id=$2
    // 2. ตรวจสอบว่า role มี permission ที่ต้องการ
    // 3. ถ้ามี → next(), ถ้าไม่มี → return 403
  };
}

module.exports = { AuthController, requireAuth, requireSystemAdmin, requireGuildPermission };