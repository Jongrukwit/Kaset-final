// ============================================================
// DISCORD CLONE — BACKEND SERVER CONFIGURATION
// แก้ไขค่าต่างๆ ในส่วนนี้เพื่อปรับแต่งระบบ backend
// ============================================================

require("dotenv").config();

const SERVER_CONFIG = {
  PORT: process.env.PORT || 4000,                   // port ของ server
  NODE_ENV: process.env.NODE_ENV || "development",  // environment: development | production
  API_VERSION: "v1",                                // เวอร์ชัน API (ใช้ใน prefix: /api/v1)
  CORS_ORIGINS: process.env.CORS_ORIGINS             // origins ที่อนุญาต (คั่นด้วย ,)
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:3000", "http://localhost:5173"],
};

const DATABASE_CONFIG = {
  HOST: process.env.DB_HOST || "localhost",
  PORT: process.env.DB_PORT || 5432,
  NAME: process.env.DB_NAME || "discord_clone",
  USER: process.env.DB_USER || "postgres",
  PASSWORD: process.env.DB_PASSWORD || "password",
  POOL_MIN: 2,                                      // จำนวน connection pool ขั้นต่ำ
  POOL_MAX: 10,                                     // จำนวน connection pool สูงสุด
};

const REDIS_CONFIG = {
  HOST: process.env.REDIS_HOST || "localhost",
  PORT: process.env.REDIS_PORT || 6379,
  PASSWORD: process.env.REDIS_PASSWORD || "",
  DB: process.env.REDIS_DB || 0,
  SESSION_TTL_SECONDS: 86400,                       // อายุ session ใน Redis (วินาที)
};

const JWT_CONFIG = {
  ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "change_this_access_secret_key",
  REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "change_this_refresh_secret_key",
  ACCESS_EXPIRY: "1h",                              // อายุ access token
  REFRESH_EXPIRY: "30d",                            // อายุ refresh token
};

const STORAGE_CONFIG = {
  PROVIDER: process.env.STORAGE_PROVIDER || "local", // "local" | "s3" | "cloudinary"
  LOCAL_UPLOAD_DIR: "./uploads",                      // โฟลเดอร์สำหรับ local storage
  // AWS S3 settings (ใช้เมื่อ PROVIDER=s3)
  S3_BUCKET: process.env.S3_BUCKET || "",
  S3_REGION: process.env.S3_REGION || "ap-southeast-1",
  S3_ACCESS_KEY: process.env.AWS_ACCESS_KEY || "",
  S3_SECRET_KEY: process.env.AWS_SECRET_KEY || "",
  // Cloudinary settings (ใช้เมื่อ PROVIDER=cloudinary)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
  // ข้อจำกัดไฟล์
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024,             // 25 MB
  ALLOWED_MIME_TYPES: [
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "video/mp4", "audio/mpeg",
    "application/pdf", "text/plain", "application/zip",
  ],
};

const RATE_LIMIT_CONFIG = {
  GLOBAL_WINDOW_MS: 15 * 60 * 1000,              // หน้าต่างเวลา (15 นาที)
  GLOBAL_MAX_REQUESTS: 300,                       // จำนวน request สูงสุดต่อ window
  AUTH_WINDOW_MS: 60 * 60 * 1000,                // หน้าต่างเวลาสำหรับ auth (1 ชั่วโมง)
  AUTH_MAX_REQUESTS: 20,                          // จำนวน auth request สูงสุดต่อ window
  MESSAGE_WINDOW_MS: 5 * 1000,                   // หน้าต่างเวลาสำหรับส่ง message (5 วินาที)
  MESSAGE_MAX_REQUESTS: 5,                        // จำนวน message สูงสุดต่อ window
};

const WEBSOCKET_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 30000,                  // interval ส่ง ping (ms)
  HEARTBEAT_TIMEOUT_MS: 10000,                   // timeout รอ pong ก่อน disconnect (ms)
  MAX_PAYLOAD_BYTES: 1024 * 1024,               // ขนาดสูงสุดของ WS message (1 MB)
};

module.exports = {
  SERVER_CONFIG,
  DATABASE_CONFIG,
  REDIS_CONFIG,
  JWT_CONFIG,
  STORAGE_CONFIG,
  RATE_LIMIT_CONFIG,
  WEBSOCKET_CONFIG,
};