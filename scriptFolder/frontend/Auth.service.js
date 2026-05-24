// ============================================================
// DISCORD CLONE — AUTH & USER STATE MANAGEMENT (Frontend)
// แก้ไขค่าต่างๆ ในส่วนนี้เพื่อปรับแต่งพฤติกรรมการ Auth
// ============================================================

const AUTH_ENDPOINTS = {
  LOGIN: "/auth/login",           // POST { email, password }
  REGISTER: "/auth/register",     // POST { username, email, password, display_name }
  LOGOUT: "/auth/logout",         // POST (ต้องการ access token)
  REFRESH: "/auth/refresh",       // POST { refresh_token }
  ME: "/auth/me",                 // GET (ดึงข้อมูล user ปัจจุบัน)
  FORGOT_PASSWORD: "/auth/forgot-password",   // POST { email }
  RESET_PASSWORD: "/auth/reset-password",     // POST { token, new_password }
};

const TOKEN_STORAGE_KEY = "discord_access_token";
const REFRESH_STORAGE_KEY = "discord_refresh_token";

// ============================================================
// AUTH SERVICE
// ============================================================

export class AuthService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async login(email, password) {
    const res = await this.api.post(AUTH_ENDPOINTS.LOGIN, { email, password });
    this._storeTokens(res.access_token, res.refresh_token);
    return res.user;
  }

  async register(username, email, password, displayName) {
    const res = await this.api.post(AUTH_ENDPOINTS.REGISTER, {
      username,
      email,
      password,
      display_name: displayName,
    });
    this._storeTokens(res.access_token, res.refresh_token);
    return res.user;
  }

  async logout() {
    await this.api.post(AUTH_ENDPOINTS.LOGOUT);
    this._clearTokens();
  }

  async refreshAccessToken() {
    const refreshToken = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (!refreshToken) throw new Error("No refresh token");
    const res = await this.api.post(AUTH_ENDPOINTS.REFRESH, {
      refresh_token: refreshToken,
    });
    this._storeTokens(res.access_token, res.refresh_token);
    return res.access_token;
  }

  async getCurrentUser() {
    return await this.api.get(AUTH_ENDPOINTS.ME);
  }

  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  getAccessToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  _storeTokens(accessToken, refreshToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
  }

  _clearTokens() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_STORAGE_KEY);
  }
}

// ============================================================
// USER STORE (Zustand / Redux slice concept)
// ============================================================

export const initialUserState = {
  currentUser: null,         // { id, username, display_name, avatar_url, email, status }
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const userActions = {
  SET_USER: "SET_USER",
  CLEAR_USER: "CLEAR_USER",
  SET_STATUS: "SET_STATUS",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  UPDATE_PROFILE: "UPDATE_PROFILE",
};

// ============================================================
// USER PROFILE SERVICE
// ============================================================

const PROFILE_ENDPOINTS = {
  UPDATE_PROFILE: "/users/me",            // PATCH { display_name, bio, avatar_url }
  UPDATE_AVATAR: "/users/me/avatar",      // POST (multipart/form-data, field: "avatar")
  UPDATE_STATUS: "/users/me/status",      // PATCH { status, custom_status }
  GET_USER: "/users/:userId",             // GET ข้อมูล user คนอื่น
};

export class UserProfileService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async updateProfile({ displayName, bio }) {
    return await this.api.patch(PROFILE_ENDPOINTS.UPDATE_PROFILE, {
      display_name: displayName,
      bio,
    });
  }

  async updateAvatar(file) {
    const form = new FormData();
    form.append("avatar", file);
    return await this.api.post(PROFILE_ENDPOINTS.UPDATE_AVATAR, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  async updateStatus(status, customStatus = "") {
    return await this.api.patch(PROFILE_ENDPOINTS.UPDATE_STATUS, {
      status,
      custom_status: customStatus,
    });
  }

  async getUserById(userId) {
    return await this.api.get(PROFILE_ENDPOINTS.GET_USER.replace(":userId", userId));
  }
}