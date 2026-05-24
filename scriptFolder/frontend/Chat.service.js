// ============================================================
// DISCORD CLONE — REAL-TIME CHAT SERVICE (Frontend)
// แก้ไขค่าต่างๆ ในส่วนนี้เพื่อปรับแต่งระบบแชท
// ============================================================

const CHAT_ENDPOINTS = {
  GET_MESSAGES: "/channels/:channelId/messages",     // GET (query: before, after, limit)
  SEND_MESSAGE: "/channels/:channelId/messages",     // POST { content, attachments, reply_to }
  EDIT_MESSAGE: "/channels/:channelId/messages/:messageId",  // PATCH { content }
  DELETE_MESSAGE: "/channels/:channelId/messages/:messageId", // DELETE
  PIN_MESSAGE: "/channels/:channelId/pins/:messageId",        // PUT
  UNPIN_MESSAGE: "/channels/:channelId/pins/:messageId",      // DELETE
  GET_PINS: "/channels/:channelId/pins",             // GET
  ADD_REACTION: "/channels/:channelId/messages/:messageId/reactions/:emoji",   // PUT
  REMOVE_REACTION: "/channels/:channelId/messages/:messageId/reactions/:emoji", // DELETE
  UPLOAD_ATTACHMENT: "/channels/:channelId/attachments",  // POST multipart/form-data
};

const MAX_MESSAGE_LENGTH = 2000;       // ความยาวสูงสุดของข้อความ (ตัวอักษร)
const MESSAGE_LOAD_LIMIT = 50;         // จำนวน message ที่โหลดต่อครั้ง
const TYPING_TIMEOUT_MS = 3000;        // หน่วงเวลา typing indicator (ms)

// ============================================================
// WEBSOCKET EVENTS (ชื่อ event ที่ใช้ communicate กับ server)
// ============================================================

export const WS_EVENTS = {
  // Client → Server
  AUTHENTICATE: "authenticate",         // { token }
  JOIN_GUILD: "join_guild",            // { guild_id }
  LEAVE_GUILD: "leave_guild",          // { guild_id }
  JOIN_CHANNEL: "join_channel",        // { channel_id }
  LEAVE_CHANNEL: "leave_channel",      // { channel_id }
  TYPING_START: "typing_start",        // { channel_id }
  TYPING_STOP: "typing_stop",          // { channel_id }
  UPDATE_PRESENCE: "update_presence",  // { status, custom_status }

  // Server → Client
  READY: "ready",                      // เมื่อ connection พร้อม
  MESSAGE_CREATE: "message_create",    // { message }
  MESSAGE_UPDATE: "message_update",    // { message }
  MESSAGE_DELETE: "message_delete",    // { message_id, channel_id }
  TYPING_UPDATE: "typing_update",      // { channel_id, user_id, is_typing }
  MEMBER_UPDATE: "member_update",      // { guild_id, member }
  PRESENCE_UPDATE: "presence_update", // { user_id, status }
  GUILD_CREATE: "guild_create",        // { guild }
  GUILD_DELETE: "guild_delete",        // { guild_id }
  CHANNEL_CREATE: "channel_create",   // { channel }
  CHANNEL_UPDATE: "channel_update",   // { channel }
  CHANNEL_DELETE: "channel_delete",   // { channel_id }
  VOICE_STATE_UPDATE: "voice_state_update",  // { user_id, channel_id, muted, deafened }
  ERROR: "error",                      // { code, message }
};

// ============================================================
// WEBSOCKET SERVICE
// ============================================================

export class WebSocketService {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.socket = null;
    this.listeners = {};       // { eventName: [callbacks] }
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;      // จำนวนครั้งสูงสุดที่ reconnect
    this.reconnectDelayMs = 2000;       // หน่วงเวลาก่อน reconnect (ms)
  }

  connect(accessToken) {
    this.socket = new WebSocket(`${this.wsUrl}?token=${accessToken}`);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this._emit(WS_EVENTS.READY, {});
    };

    this.socket.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      this._emit(type, data);
    };

    this.socket.onclose = () => {
      this._handleDisconnect(accessToken);
    };

    this.socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(event, data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: event, data }));
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => this.off(event, callback);  // unsubscribe fn
  }

  off(event, callback) {
    this.listeners[event] = (this.listeners[event] || []).filter(
      (cb) => cb !== callback
    );
  }

  _emit(event, data) {
    (this.listeners[event] || []).forEach((cb) => cb(data));
  }

  _handleDisconnect(accessToken) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(accessToken);
      }, this.reconnectDelayMs * this.reconnectAttempts);
    }
  }

  sendTypingStart(channelId) {
    this.send(WS_EVENTS.TYPING_START, { channel_id: channelId });
  }

  sendTypingStop(channelId) {
    this.send(WS_EVENTS.TYPING_STOP, { channel_id: channelId });
  }
}

// ============================================================
// CHAT SERVICE (HTTP)
// ============================================================

export class ChatService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async getMessages(channelId, { before, after, limit = MESSAGE_LOAD_LIMIT } = {}) {
    const params = new URLSearchParams({ limit });
    if (before) params.set("before", before);
    if (after) params.set("after", after);
    const url = `${CHAT_ENDPOINTS.GET_MESSAGES.replace(":channelId", channelId)}?${params}`;
    return await this.api.get(url);
  }

  async sendMessage(channelId, { content, attachments = [], replyTo = null }) {
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`ข้อความยาวเกิน ${MAX_MESSAGE_LENGTH} ตัวอักษร`);
    }
    return await this.api.post(
      CHAT_ENDPOINTS.SEND_MESSAGE.replace(":channelId", channelId),
      { content, attachments, reply_to: replyTo }
    );
  }

  async editMessage(channelId, messageId, content) {
    return await this.api.patch(
      CHAT_ENDPOINTS.EDIT_MESSAGE
        .replace(":channelId", channelId)
        .replace(":messageId", messageId),
      { content }
    );
  }

  async deleteMessage(channelId, messageId) {
    return await this.api.delete(
      CHAT_ENDPOINTS.DELETE_MESSAGE
        .replace(":channelId", channelId)
        .replace(":messageId", messageId)
    );
  }

  async addReaction(channelId, messageId, emoji) {
    return await this.api.put(
      CHAT_ENDPOINTS.ADD_REACTION
        .replace(":channelId", channelId)
        .replace(":messageId", messageId)
        .replace(":emoji", encodeURIComponent(emoji))
    );
  }

  async removeReaction(channelId, messageId, emoji) {
    return await this.api.delete(
      CHAT_ENDPOINTS.REMOVE_REACTION
        .replace(":channelId", channelId)
        .replace(":messageId", messageId)
        .replace(":emoji", encodeURIComponent(emoji))
    );
  }

  async uploadAttachment(channelId, file) {
    const form = new FormData();
    form.append("file", file);
    return await this.api.post(
      CHAT_ENDPOINTS.UPLOAD_ATTACHMENT.replace(":channelId", channelId),
      form
    );
  }
}

// ============================================================
// CHAT STORE STATE SHAPE
// ============================================================

export const initialChatState = {
  messages: {},          // { [channelId]: [message_objects] }
  hasMore: {},           // { [channelId]: boolean }
  typingUsers: {},       // { [channelId]: [{ userId, username }] }
  isLoading: {},         // { [channelId]: boolean }
  draftMessages: {},     // { [channelId]: string } — ข้อความที่ยังไม่ได้ส่ง
  replyingTo: null,      // message object ที่กำลัง reply
};