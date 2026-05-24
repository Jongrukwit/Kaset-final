// ============================================================
// DISCORD CLONE — WEBSOCKET GATEWAY (Backend)
// แก้ไขค่าต่างๆ ในส่วนนี้เพื่อปรับแต่งพฤติกรรม WebSocket
// ============================================================

const HEARTBEAT_INTERVAL_MS = 30000;      // interval ส่ง ping (ms)
const HEARTBEAT_TIMEOUT_MS = 10000;       // timeout รอ pong ก่อน disconnect (ms)
const MAX_PAYLOAD_BYTES = 1024 * 1024;    // ขนาดสูงสุดของ WS message (1 MB)
const AUTH_TIMEOUT_MS = 5000;            // หน่วงเวลา authenticate หลัง connect (ms)

// ============================================================
// CLIENT EVENT TYPES (Client → Server)
// ============================================================

const CLIENT_EVENTS = {
  AUTHENTICATE: "authenticate",         // { token }
  JOIN_GUILD: "join_guild",            // { guild_id }
  LEAVE_GUILD: "leave_guild",          // { guild_id }
  JOIN_CHANNEL: "join_channel",        // { channel_id }
  LEAVE_CHANNEL: "leave_channel",      // { channel_id }
  TYPING_START: "typing_start",        // { channel_id }
  TYPING_STOP: "typing_stop",          // { channel_id }
  UPDATE_PRESENCE: "update_presence",  // { status, custom_status }

  // Voice
  VOICE_JOIN: "voice_join",            // { channel_id }
  VOICE_LEAVE: "voice_leave",          // { channel_id }
  VOICE_OFFER: "voice_offer",          // { to_user_id, sdp }
  VOICE_ANSWER: "voice_answer",        // { to_user_id, sdp }
  VOICE_ICE_CANDIDATE: "voice_ice_candidate", // { to_user_id, candidate }
  VOICE_MUTE: "voice_mute",           // { muted }
  VOICE_DEAFEN: "voice_deafen",       // { deafened }
  VOICE_VIDEO: "voice_video",         // { video_enabled }
  SCREEN_SHARE_START: "screen_share_start",   // { channel_id }
  SCREEN_SHARE_STOP: "screen_share_stop",     // { channel_id }
};

// ============================================================
// SERVER EVENT TYPES (Server → Client)
// ============================================================

const SERVER_EVENTS = {
  READY: "ready",
  ERROR: "error",

  // Messages
  MESSAGE_CREATE: "message_create",
  MESSAGE_UPDATE: "message_update",
  MESSAGE_DELETE: "message_delete",
  REACTION_ADD: "reaction_add",
  REACTION_REMOVE: "reaction_remove",

  // Typing
  TYPING_UPDATE: "typing_update",     // { channel_id, user_id, username, is_typing }

  // Guild
  GUILD_CREATE: "guild_create",
  GUILD_UPDATE: "guild_update",
  GUILD_DELETE: "guild_delete",
  MEMBER_JOIN: "member_join",
  MEMBER_LEAVE: "member_leave",
  MEMBER_UPDATE: "member_update",
  MEMBER_BAN: "member_ban",

  // Channel
  CHANNEL_CREATE: "channel_create",
  CHANNEL_UPDATE: "channel_update",
  CHANNEL_DELETE: "channel_delete",

  // Presence
  PRESENCE_UPDATE: "presence_update", // { user_id, status, custom_status }

  // Voice
  VOICE_USER_JOINED: "voice_user_joined",
  VOICE_USER_LEFT: "voice_user_left",
  VOICE_STATE_UPDATE: "voice_state_update",
  VOICE_OFFER_RECV: "voice_offer_recv",
  VOICE_ANSWER_RECV: "voice_answer_recv",
  VOICE_ICE_RECV: "voice_ice_recv",
};

// ============================================================
// CONNECTION STORE (In-memory — แทนที่ด้วย Redis ใน production)
// ============================================================

// โครงสร้างข้อมูลที่ใช้จัดการ connections
const ConnectionStore = {
  // Map ของ userId → Set of WebSocket connections (user อาจ login หลาย tab)
  userConnections: new Map(),         // { userId: Set<ws> }

  // Map ของ guildId → Set of userIds
  guildSubscriptions: new Map(),      // { guildId: Set<userId> }

  // Map ของ channelId → Set of userIds
  channelSubscriptions: new Map(),    // { channelId: Set<userId> }

  // Map ของ voiceChannelId → Set of userIds
  voiceChannels: new Map(),           // { channelId: Set<userId> }

  // Typing indicator timers
  typingTimers: new Map(),            // { `${channelId}:${userId}`: Timer }

  addConnection(userId, ws) { /* userId → ws */ },
  removeConnection(userId, ws) { /* cleanup */ },
  subscribeToGuild(userId, guildId) { /* เพิ่ม subscription */ },
  unsubscribeFromGuild(userId, guildId) { /* ลบ subscription */ },
  broadcastToGuild(guildId, event, data, excludeUserId = null) { /* ส่งไปยังทุก member ใน guild */ },
  broadcastToChannel(channelId, event, data, excludeUserId = null) { /* ส่งไปยัง channel */ },
  sendToUser(userId, event, data) { /* ส่งไปยัง user โดยตรง */ },
};

// ============================================================
// WEBSOCKET GATEWAY CLASS
// ============================================================

class WebSocketGateway {
  constructor(httpServer, jwtVerify, db) {
    this.jwtVerify = jwtVerify;
    this.db = db;
    this.store = ConnectionStore;
    // this.wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_PAYLOAD_BYTES });
    // this.wss.on("connection", this.handleConnection.bind(this));
  }

  handleConnection(ws, req) {
    ws.isAuthenticated = false;
    ws.userId = null;

    // AUTH TIMEOUT — บังคับ authenticate ภายใน AUTH_TIMEOUT_MS
    const authTimeout = setTimeout(() => {
      if (!ws.isAuthenticated) ws.close(4001, "Authentication timeout");
    }, AUTH_TIMEOUT_MS);

    ws.on("message", (raw) => this._handleMessage(ws, raw, authTimeout));
    ws.on("close", () => this._handleClose(ws));
    ws.on("pong", () => (ws.isAlive = true));

    // Setup heartbeat
    this._startHeartbeat(ws);
  }

  async _handleMessage(ws, raw, authTimeout) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return this._send(ws, SERVER_EVENTS.ERROR, { code: 4002, message: "Invalid JSON" });
    }

    const { type, data } = parsed;

    // ต้อง authenticate ก่อน
    if (!ws.isAuthenticated && type !== CLIENT_EVENTS.AUTHENTICATE) {
      return this._send(ws, SERVER_EVENTS.ERROR, { code: 4003, message: "Not authenticated" });
    }

    switch (type) {
      case CLIENT_EVENTS.AUTHENTICATE:
        await this._handleAuthenticate(ws, data, authTimeout);
        break;
      case CLIENT_EVENTS.JOIN_GUILD:
        await this._handleJoinGuild(ws, data.guild_id);
        break;
      case CLIENT_EVENTS.LEAVE_GUILD:
        this._handleLeaveGuild(ws, data.guild_id);
        break;
      case CLIENT_EVENTS.TYPING_START:
        this._handleTypingStart(ws, data.channel_id);
        break;
      case CLIENT_EVENTS.TYPING_STOP:
        this._handleTypingStop(ws, data.channel_id);
        break;
      case CLIENT_EVENTS.UPDATE_PRESENCE:
        await this._handlePresenceUpdate(ws, data);
        break;
      case CLIENT_EVENTS.VOICE_JOIN:
        await this._handleVoiceJoin(ws, data.channel_id);
        break;
      case CLIENT_EVENTS.VOICE_LEAVE:
        this._handleVoiceLeave(ws, data.channel_id);
        break;
      case CLIENT_EVENTS.VOICE_OFFER:
      case CLIENT_EVENTS.VOICE_ANSWER:
      case CLIENT_EVENTS.VOICE_ICE_CANDIDATE:
        this._forwardVoiceSignal(ws, type, data);
        break;
      case CLIENT_EVENTS.VOICE_MUTE:
      case CLIENT_EVENTS.VOICE_DEAFEN:
      case CLIENT_EVENTS.VOICE_VIDEO:
        this._handleVoiceStateChange(ws, type, data);
        break;
      default:
        this._send(ws, SERVER_EVENTS.ERROR, { code: 4004, message: "Unknown event" });
    }
  }

  async _handleAuthenticate(ws, { token }, authTimeout) {
    try {
      const decoded = await this.jwtVerify(token);
      const user = await this.db.getUserById(decoded.sub);
      if (!user) throw new Error("User not found");

      ws.isAuthenticated = true;
      ws.userId = user.id;
      ws.user = user;
      clearTimeout(authTimeout);

      // เพิ่ม connection ลง store
      this.store.addConnection(user.id, ws);

      // Subscribe ไปยัง guilds ทั้งหมดของ user
      const guilds = await this.db.getUserGuilds(user.id);
      guilds.forEach((g) => this.store.subscribeToGuild(user.id, g.id));

      // อัปเดต presence
      await this.db.updateUserStatus(user.id, "online");
      this.store.broadcastPresence(user.id, "online");

      this._send(ws, SERVER_EVENTS.READY, { user, guilds });
    } catch (err) {
      ws.close(4001, "Authentication failed");
    }
  }

  async _handleJoinGuild(ws, guildId) {
    // ตรวจสอบว่า user เป็นสมาชิก guild
    const isMember = await this.db.isGuildMember(ws.userId, guildId);
    if (!isMember) return;
    this.store.subscribeToGuild(ws.userId, guildId);
  }

  _handleLeaveGuild(ws, guildId) {
    this.store.unsubscribeFromGuild(ws.userId, guildId);
  }

  _handleTypingStart(ws, channelId) {
    const key = `${channelId}:${ws.userId}`;
    // ยกเลิก timer เดิม (ถ้ามี)
    clearTimeout(this.store.typingTimers.get(key));
    // Broadcast typing indicator
    this.store.broadcastToChannel(channelId, SERVER_EVENTS.TYPING_UPDATE, {
      channel_id: channelId,
      user_id: ws.userId,
      username: ws.user.display_name,
      is_typing: true,
    }, ws.userId);
    // ตั้ง timer หยุด typing อัตโนมัติ
    const timer = setTimeout(() => {
      this._handleTypingStop(ws, channelId);
    }, 5000); // หยุด typing อัตโนมัติใน 5 วินาที
    this.store.typingTimers.set(key, timer);
  }

  _handleTypingStop(ws, channelId) {
    const key = `${channelId}:${ws.userId}`;
    clearTimeout(this.store.typingTimers.get(key));
    this.store.typingTimers.delete(key);
    this.store.broadcastToChannel(channelId, SERVER_EVENTS.TYPING_UPDATE, {
      channel_id: channelId,
      user_id: ws.userId,
      is_typing: false,
    }, ws.userId);
  }

  async _handlePresenceUpdate(ws, { status, custom_status }) {
    await this.db.updateUserStatus(ws.userId, status, custom_status);
    // Broadcast ไปยัง mutual guilds
    this.store.broadcastPresence(ws.userId, status, custom_status);
  }

  async _handleVoiceJoin(ws, channelId) {
    // 1. ตรวจสอบ permission: CONNECT_VOICE
    // 2. เพิ่มลง voice channel
    this.store.voiceChannels.get(channelId)?.add(ws.userId);
    // 3. แจ้ง users อื่นใน voice channel
    this.store.broadcastToChannel(channelId, SERVER_EVENTS.VOICE_USER_JOINED, {
      user_id: ws.userId, channel_id: channelId,
    });
    // 4. ส่งรายชื่อ users ที่อยู่ใน voice channel ให้ user ที่เพิ่งเข้า
  }

  _handleVoiceLeave(ws, channelId) {
    this.store.voiceChannels.get(channelId)?.delete(ws.userId);
    this.store.broadcastToChannel(channelId, SERVER_EVENTS.VOICE_USER_LEFT, {
      user_id: ws.userId, channel_id: channelId,
    });
  }

  _forwardVoiceSignal(ws, type, { to_user_id, sdp, candidate }) {
    // ส่ง WebRTC signal ไปยัง user ปลายทางโดยตรง
    const eventMap = {
      [CLIENT_EVENTS.VOICE_OFFER]: SERVER_EVENTS.VOICE_OFFER_RECV,
      [CLIENT_EVENTS.VOICE_ANSWER]: SERVER_EVENTS.VOICE_ANSWER_RECV,
      [CLIENT_EVENTS.VOICE_ICE_CANDIDATE]: SERVER_EVENTS.VOICE_ICE_RECV,
    };
    this.store.sendToUser(to_user_id, eventMap[type], {
      from_user_id: ws.userId, sdp, candidate,
    });
  }

  _handleVoiceStateChange(ws, type, data) {
    // Broadcast voice state ไปยัง channel
    // ค้นหา voice channel ที่ user อยู่ปัจจุบัน
    const stateUpdate = {
      user_id: ws.userId,
      muted: data.muted,
      deafened: data.deafened,
      video: data.video_enabled,
    };
    // broadcastToChannel ไปยัง voice channel ปัจจุบัน
  }

  _handleClose(ws) {
    if (!ws.userId) return;
    this.store.removeConnection(ws.userId, ws);
    // ถ้า user ไม่มี connection อื่นแล้ว
    // → อัปเดต status = "offline"
    // → broadcast presence offline
    // → ออกจาก voice channel ถ้ายังอยู่
  }

  _send(ws, event, data) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify({ type: event, data }));
    }
  }

  _startHeartbeat(ws) {
    ws.isAlive = true;
    const interval = setInterval(() => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    }, HEARTBEAT_INTERVAL_MS);
    ws.on("close", () => clearInterval(interval));
  }
}

module.exports = { WebSocketGateway, CLIENT_EVENTS, SERVER_EVENTS };