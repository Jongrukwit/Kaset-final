// ============================================================
// DISCORD CLONE — SEARCH SERVICE (Frontend)
// แก้ไขค่าต่างๆ ในส่วนนี้เพื่อปรับแต่งระบบค้นหา
// ============================================================

const SEARCH_ENDPOINTS = {
  SEARCH_GUILDS: "/search/guilds",          // GET ?q=query&limit=10
  SEARCH_MESSAGES: "/search/messages",      // GET ?q=query&guild_id=&channel_id=&from=&before=&after=
  SEARCH_USERS: "/search/users",            // GET ?q=query&limit=10
};

const DEBOUNCE_DELAY_MS = 300;             // หน่วงเวลา debounce (ms)
const MIN_QUERY_LENGTH = 2;               // ความยาวขั้นต่ำก่อนเริ่มค้นหา
const DEFAULT_RESULT_LIMIT = 25;          // จำนวนผลลัพธ์สูงสุดต่อหมวด

export const SEARCH_FILTER_KEYS = {
  FROM_USER: "from",           // กรองตาม user ที่ส่ง
  IN_CHANNEL: "in",            // กรองตาม channel
  BEFORE_DATE: "before",       // กรองก่อนวันที่ (ISO string)
  AFTER_DATE: "after",         // กรองหลังวันที่ (ISO string)
  HAS: "has",                  // กรองตามเนื้อหา: "link"|"file"|"image"|"video"|"sound"
  PINNED: "pinned",            // กรองเฉพาะ pinned messages (boolean)
};

// ============================================================
// DEBOUNCE UTILITY
// ============================================================

function debounce(fn, delayMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

// ============================================================
// SEARCH SERVICE
// ============================================================

export class SearchService {
  constructor(apiClient) {
    this.api = apiClient;
    this._debouncedSearch = debounce(this._doSearch.bind(this), DEBOUNCE_DELAY_MS);
    this._currentQuery = "";
    this._onResultsCallback = null;
  }

  // ค้นหาแบบ realtime (ใช้สำหรับ search bar)
  search(query, filters = {}, onResults) {
    this._currentQuery = query;
    this._onResultsCallback = onResults;
    if (query.length < MIN_QUERY_LENGTH) {
      onResults({ guilds: [], messages: [], users: [] });
      return;
    }
    this._debouncedSearch(query, filters);
  }

  async _doSearch(query, filters) {
    const [guilds, messages, users] = await Promise.allSettled([
      this.searchGuilds(query),
      filters.searchMessages !== false
        ? this.searchMessages(query, filters)
        : Promise.resolve([]),
      this.searchUsers(query),
    ]);

    if (this._currentQuery !== query) return; // ยกเลิกถ้า query เปลี่ยนแล้ว

    this._onResultsCallback?.({
      guilds: guilds.status === "fulfilled" ? guilds.value : [],
      messages: messages.status === "fulfilled" ? messages.value : [],
      users: users.status === "fulfilled" ? users.value : [],
    });
  }

  async searchGuilds(query, limit = DEFAULT_RESULT_LIMIT) {
    const params = new URLSearchParams({ q: query, limit });
    return await this.api.get(`${SEARCH_ENDPOINTS.SEARCH_GUILDS}?${params}`);
  }

  // ค้นหา message ขั้นสูง (รองรับ filter ต่างๆ)
  async searchMessages(query, filters = {}, guildId = null, channelId = null) {
    const params = new URLSearchParams({ q: query, limit: DEFAULT_RESULT_LIMIT });
    if (guildId) params.set("guild_id", guildId);
    if (channelId) params.set("channel_id", channelId);
    if (filters[SEARCH_FILTER_KEYS.FROM_USER]) params.set("from", filters[SEARCH_FILTER_KEYS.FROM_USER]);
    if (filters[SEARCH_FILTER_KEYS.BEFORE_DATE]) params.set("before", filters[SEARCH_FILTER_KEYS.BEFORE_DATE]);
    if (filters[SEARCH_FILTER_KEYS.AFTER_DATE]) params.set("after", filters[SEARCH_FILTER_KEYS.AFTER_DATE]);
    if (filters[SEARCH_FILTER_KEYS.HAS]) params.set("has", filters[SEARCH_FILTER_KEYS.HAS]);
    if (filters[SEARCH_FILTER_KEYS.PINNED]) params.set("pinned", "true");
    return await this.api.get(`${SEARCH_ENDPOINTS.SEARCH_MESSAGES}?${params}`);
  }

  async searchUsers(query, limit = DEFAULT_RESULT_LIMIT) {
    const params = new URLSearchParams({ q: query, limit });
    return await this.api.get(`${SEARCH_ENDPOINTS.SEARCH_USERS}?${params}`);
  }
}

// ============================================================
// SEARCH STORE STATE SHAPE
// ============================================================

export const initialSearchState = {
  query: "",
  isSearching: false,
  results: {
    guilds: [],     // [{ id, name, icon_url, member_count }]
    messages: [],   // [{ id, content, author, channel, guild, created_at }]
    users: [],      // [{ id, username, display_name, avatar_url }]
  },
  activeFilters: {},  // { from, in, before, after, has, pinned }
  recentSearches: [], // string[] — บันทึกการค้นหาล่าสุด (max 10)
};