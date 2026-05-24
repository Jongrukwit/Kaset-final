// ============================================================
// DISCORD CLONE — GUILD & CHANNEL SERVICE (Frontend)
// แก้ไขค่าต่างๆ ในส่วนนี้เพื่อปรับแต่งพฤติกรรม Guild/Channel
// ============================================================

const GUILD_ENDPOINTS = {
  LIST_GUILDS: "/guilds",                             // GET รายการ guild ของ user
  CREATE_GUILD: "/guilds",                            // POST { name, icon, description }
  GET_GUILD: "/guilds/:guildId",                      // GET ข้อมูล guild
  UPDATE_GUILD: "/guilds/:guildId",                   // PATCH { name, icon, description }
  DELETE_GUILD: "/guilds/:guildId",                   // DELETE
  JOIN_GUILD: "/guilds/join",                         // POST { invite_code }
  LEAVE_GUILD: "/guilds/:guildId/leave",              // POST
  GET_INVITE: "/guilds/:guildId/invite",              // GET สร้าง invite link
  GET_MEMBERS: "/guilds/:guildId/members",            // GET รายชื่อสมาชิก (query: page, limit)
  UPDATE_MEMBER: "/guilds/:guildId/members/:userId",  // PATCH { nickname, roles }
  KICK_MEMBER: "/guilds/:guildId/members/:userId",    // DELETE
  BAN_MEMBER: "/guilds/:guildId/bans/:userId",        // PUT { reason }
  UNBAN_MEMBER: "/guilds/:guildId/bans/:userId",      // DELETE
};

const CHANNEL_ENDPOINTS = {
  LIST_CHANNELS: "/guilds/:guildId/channels",         // GET รายการ channel ใน guild
  CREATE_CHANNEL: "/guilds/:guildId/channels",        // POST { name, type, category_id, position }
  GET_CHANNEL: "/channels/:channelId",                // GET ข้อมูล channel
  UPDATE_CHANNEL: "/channels/:channelId",             // PATCH { name, topic, position }
  DELETE_CHANNEL: "/channels/:channelId",             // DELETE
  REORDER_CHANNELS: "/guilds/:guildId/channels/reorder", // PUT [{ id, position }]
  CREATE_CATEGORY: "/guilds/:guildId/categories",     // POST { name, position }
  UPDATE_CATEGORY: "/guilds/:guildId/categories/:categoryId", // PATCH { name, position }
  DELETE_CATEGORY: "/guilds/:guildId/categories/:categoryId", // DELETE
};

// ============================================================
// GUILD SERVICE
// ============================================================

export class GuildService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async listMyGuilds() {
    return await this.api.get(GUILD_ENDPOINTS.LIST_GUILDS);
  }

  async getGuild(guildId) {
    return await this.api.get(GUILD_ENDPOINTS.GET_GUILD.replace(":guildId", guildId));
  }

  async createGuild(name, icon = null, description = "") {
    const form = new FormData();
    form.append("name", name);
    form.append("description", description);
    if (icon) form.append("icon", icon);
    return await this.api.post(GUILD_ENDPOINTS.CREATE_GUILD, form);
  }

  async updateGuild(guildId, updates) {
    return await this.api.patch(
      GUILD_ENDPOINTS.UPDATE_GUILD.replace(":guildId", guildId),
      updates
    );
  }

  async deleteGuild(guildId) {
    return await this.api.delete(GUILD_ENDPOINTS.DELETE_GUILD.replace(":guildId", guildId));
  }

  async joinGuildByInvite(inviteCode) {
    return await this.api.post(GUILD_ENDPOINTS.JOIN_GUILD, { invite_code: inviteCode });
  }

  async leaveGuild(guildId) {
    return await this.api.post(GUILD_ENDPOINTS.LEAVE_GUILD.replace(":guildId", guildId));
  }

  async generateInviteLink(guildId) {
    return await this.api.get(GUILD_ENDPOINTS.GET_INVITE.replace(":guildId", guildId));
  }

  async getMembers(guildId, page = 1, limit = 100) {
    return await this.api.get(
      `${GUILD_ENDPOINTS.GET_MEMBERS.replace(":guildId", guildId)}?page=${page}&limit=${limit}`
    );
  }

  async kickMember(guildId, userId) {
    return await this.api.delete(
      GUILD_ENDPOINTS.KICK_MEMBER.replace(":guildId", guildId).replace(":userId", userId)
    );
  }

  async banMember(guildId, userId, reason = "") {
    return await this.api.put(
      GUILD_ENDPOINTS.BAN_MEMBER.replace(":guildId", guildId).replace(":userId", userId),
      { reason }
    );
  }
}

// ============================================================
// CHANNEL SERVICE
// ============================================================

export class ChannelService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async listChannels(guildId) {
    return await this.api.get(
      CHANNEL_ENDPOINTS.LIST_CHANNELS.replace(":guildId", guildId)
    );
  }

  async getChannel(channelId) {
    return await this.api.get(
      CHANNEL_ENDPOINTS.GET_CHANNEL.replace(":channelId", channelId)
    );
  }

  async createChannel(guildId, { name, type, categoryId, position = 0 }) {
    return await this.api.post(
      CHANNEL_ENDPOINTS.CREATE_CHANNEL.replace(":guildId", guildId),
      { name, type, category_id: categoryId, position }
    );
  }

  async updateChannel(channelId, updates) {
    return await this.api.patch(
      CHANNEL_ENDPOINTS.UPDATE_CHANNEL.replace(":channelId", channelId),
      updates
    );
  }

  async deleteChannel(channelId) {
    return await this.api.delete(
      CHANNEL_ENDPOINTS.DELETE_CHANNEL.replace(":channelId", channelId)
    );
  }

  async reorderChannels(guildId, channelOrders) {
    // channelOrders: [{ id: "channel_id", position: 0 }, ...]
    return await this.api.put(
      CHANNEL_ENDPOINTS.REORDER_CHANNELS.replace(":guildId", guildId),
      channelOrders
    );
  }

  async createCategory(guildId, name, position = 0) {
    return await this.api.post(
      CHANNEL_ENDPOINTS.CREATE_CATEGORY.replace(":guildId", guildId),
      { name, position }
    );
  }
}

// ============================================================
// GUILD STORE STATE SHAPE
// ============================================================

export const initialGuildState = {
  guilds: [],              // รายการ guild ทั้งหมดของ user [{ id, name, icon_url, ... }]
  activeGuildId: null,     // guild ที่ user กำลังอยู่
  activeChannelId: null,   // channel ที่ user กำลังอยู่
  channels: {},            // { [guildId]: [channel_objects] }
  categories: {},          // { [guildId]: [category_objects] }
  members: {},             // { [guildId]: [member_objects] }
  isLoading: false,
  error: null,
};