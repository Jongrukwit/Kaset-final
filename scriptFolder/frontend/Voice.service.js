// ============================================================
// DISCORD CLONE — VOICE & VIDEO SERVICE (Frontend)
// แก้ไขค่าต่างๆ ในส่วนนี้เพื่อปรับแต่งระบบเสียงและกล้อง
// ============================================================

const ICE_SERVERS = [                               // STUN/TURN servers สำหรับ WebRTC
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:your-turn-server.com:3478",          // เปลี่ยนเป็น TURN server ของตัวเอง
    username: "your_turn_username",
    credential: "your_turn_credential",
  },
];

const DEFAULT_VIDEO_CONSTRAINTS = {                 // ค่าตั้งต้นสำหรับกล้อง
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
};

const DEFAULT_AUDIO_CONSTRAINTS = {                 // ค่าตั้งต้นสำหรับไมค์
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const VOICE_WEBSOCKET_EVENTS = {
  // Client → Server (ผ่าน main WebSocket)
  JOIN_VOICE: "voice_join",             // { channel_id }
  LEAVE_VOICE: "voice_leave",           // { channel_id }
  VOICE_OFFER: "voice_offer",           // { to_user_id, sdp }
  VOICE_ANSWER: "voice_answer",         // { to_user_id, sdp }
  VOICE_ICE_CANDIDATE: "voice_ice_candidate",  // { to_user_id, candidate }
  MUTE_TOGGLE: "voice_mute",           // { muted }
  DEAFEN_TOGGLE: "voice_deafen",       // { deafened }
  VIDEO_TOGGLE: "voice_video",         // { video_enabled }
  SCREEN_SHARE_START: "screen_share_start", // { channel_id }
  SCREEN_SHARE_STOP: "screen_share_stop",   // { channel_id }

  // Server → Client
  VOICE_USER_JOIN: "voice_user_joined",   // { user_id, channel_id }
  VOICE_USER_LEAVE: "voice_user_left",    // { user_id, channel_id }
  VOICE_OFFER_RECEIVED: "voice_offer_recv",   // { from_user_id, sdp }
  VOICE_ANSWER_RECEIVED: "voice_answer_recv", // { from_user_id, sdp }
  VOICE_ICE_RECEIVED: "voice_ice_recv",       // { from_user_id, candidate }
  VOICE_STATE_CHANGED: "voice_state_update",  // { user_id, muted, deafened, video }
};

// ============================================================
// WEBRTC PEER CONNECTION MANAGER
// ============================================================

export class RTCPeerManager {
  constructor(wsService, localStream) {
    this.ws = wsService;
    this.localStream = localStream;
    this.peers = {};   // { [userId]: RTCPeerConnection }
    this.remoteStreams = {};  // { [userId]: MediaStream }
    this._setupSignaling();
  }

  // สร้าง peer connection กับ user คนใหม่
  async createOffer(targetUserId) {
    const pc = this._createPeerConnection(targetUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.ws.send(VOICE_WEBSOCKET_EVENTS.VOICE_OFFER, {
      to_user_id: targetUserId,
      sdp: offer,
    });
  }

  async handleOffer(fromUserId, sdp) {
    const pc = this._createPeerConnection(fromUserId);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.ws.send(VOICE_WEBSOCKET_EVENTS.VOICE_ANSWER, {
      to_user_id: fromUserId,
      sdp: answer,
    });
  }

  async handleAnswer(fromUserId, sdp) {
    const pc = this.peers[fromUserId];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async handleIceCandidate(fromUserId, candidate) {
    const pc = this.peers[fromUserId];
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  removeUser(userId) {
    const pc = this.peers[userId];
    if (pc) {
      pc.close();
      delete this.peers[userId];
      delete this.remoteStreams[userId];
    }
  }

  closeAll() {
    Object.keys(this.peers).forEach((uid) => this.removeUser(uid));
  }

  _createPeerConnection(userId) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peers[userId] = pc;

    this.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream);
    });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.ws.send(VOICE_WEBSOCKET_EVENTS.VOICE_ICE_CANDIDATE, {
          to_user_id: userId,
          candidate,
        });
      }
    };

    pc.ontrack = ({ streams }) => {
      this.remoteStreams[userId] = streams[0];
      this.onRemoteStreamAdded?.(userId, streams[0]);
    };

    pc.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(userId, pc.connectionState);
    };

    return pc;
  }

  _setupSignaling() {
    this.ws.on(VOICE_WEBSOCKET_EVENTS.VOICE_OFFER_RECEIVED, ({ from_user_id, sdp }) => {
      this.handleOffer(from_user_id, sdp);
    });
    this.ws.on(VOICE_WEBSOCKET_EVENTS.VOICE_ANSWER_RECEIVED, ({ from_user_id, sdp }) => {
      this.handleAnswer(from_user_id, sdp);
    });
    this.ws.on(VOICE_WEBSOCKET_EVENTS.VOICE_ICE_RECEIVED, ({ from_user_id, candidate }) => {
      this.handleIceCandidate(from_user_id, candidate);
    });
  }
}

// ============================================================
// VOICE CHANNEL SERVICE (UI-level)
// ============================================================

export class VoiceChannelService {
  constructor(wsService) {
    this.ws = wsService;
    this.localStream = null;
    this.screenStream = null;
    this.peerManager = null;
    this.activeChannelId = null;
    this.isMuted = false;
    this.isDeafened = false;
    this.isVideoOn = false;
    this.isSharingScreen = false;
  }

  async joinVoiceChannel(channelId) {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: DEFAULT_AUDIO_CONSTRAINTS,
      video: false,
    });

    this.peerManager = new RTCPeerManager(this.ws, this.localStream);
    this.activeChannelId = channelId;
    this.ws.send(VOICE_WEBSOCKET_EVENTS.JOIN_VOICE, { channel_id: channelId });

    this.ws.on(VOICE_WEBSOCKET_EVENTS.VOICE_USER_JOIN, ({ user_id }) => {
      this.peerManager.createOffer(user_id);
    });
    this.ws.on(VOICE_WEBSOCKET_EVENTS.VOICE_USER_LEAVE, ({ user_id }) => {
      this.peerManager.removeUser(user_id);
    });

    return this.localStream;
  }

  async enableVideo() {
    const videoStream = await navigator.mediaDevices.getUserMedia({
      video: DEFAULT_VIDEO_CONSTRAINTS,
    });
    const videoTrack = videoStream.getVideoTracks()[0];
    // แทนที่ video track ใน peer connections ทั้งหมด
    Object.values(this.peerManager.peers).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(videoTrack);
      else pc.addTrack(videoTrack, this.localStream);
    });
    this.isVideoOn = true;
    this.ws.send(VOICE_WEBSOCKET_EVENTS.VIDEO_TOGGLE, { video_enabled: true });
    return videoTrack;
  }

  disableVideo() {
    this.localStream?.getVideoTracks().forEach((t) => t.stop());
    this.isVideoOn = false;
    this.ws.send(VOICE_WEBSOCKET_EVENTS.VIDEO_TOGGLE, { video_enabled: false });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !this.isMuted));
    this.ws.send(VOICE_WEBSOCKET_EVENTS.MUTE_TOGGLE, { muted: this.isMuted });
    return this.isMuted;
  }

  toggleDeafen() {
    this.isDeafened = !this.isDeafened;
    // ปิด/เปิด remote audio
    Object.values(this.peerManager?.remoteStreams || {}).forEach((stream) => {
      stream.getAudioTracks().forEach((t) => (t.enabled = !this.isDeafened));
    });
    this.ws.send(VOICE_WEBSOCKET_EVENTS.DEAFEN_TOGGLE, { deafened: this.isDeafened });
    return this.isDeafened;
  }

  async startScreenShare() {
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = this.screenStream.getVideoTracks()[0];
    Object.values(this.peerManager.peers).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);
    });
    this.isSharingScreen = true;
    this.ws.send(VOICE_WEBSOCKET_EVENTS.SCREEN_SHARE_START, {
      channel_id: this.activeChannelId,
    });
    screenTrack.onended = () => this.stopScreenShare();
    return screenTrack;
  }

  stopScreenShare() {
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.isSharingScreen = false;
    this.ws.send(VOICE_WEBSOCKET_EVENTS.SCREEN_SHARE_STOP, {
      channel_id: this.activeChannelId,
    });
  }

  leaveVoiceChannel() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.peerManager?.closeAll();
    this.ws.send(VOICE_WEBSOCKET_EVENTS.LEAVE_VOICE, {
      channel_id: this.activeChannelId,
    });
    this.activeChannelId = null;
    this.localStream = null;
    this.screenStream = null;
    this.isMuted = false;
    this.isDeafened = false;
    this.isVideoOn = false;
    this.isSharingScreen = false;
  }
}

// ============================================================
// VOICE STORE STATE SHAPE
// ============================================================

export const initialVoiceState = {
  activeVoiceChannelId: null,    // channel ที่กำลัง join อยู่
  voiceMembers: {},              // { [channelId]: [{ userId, muted, deafened, video }] }
  isMuted: false,
  isDeafened: false,
  isVideoOn: false,
  isSharingScreen: false,
  localStream: null,
  remoteStreams: {},             // { [userId]: MediaStream }
};