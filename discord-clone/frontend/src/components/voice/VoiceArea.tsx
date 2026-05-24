import { useState, useEffect, useRef, useCallback } from 'react';
import { Channel, Server, VoiceUser } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { getSocket } from '../../lib/socket';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, Monitor, Users } from 'lucide-react';

interface Props {
  channel: Channel;
  server: Server;
  isConnected: boolean;
  onJoin: () => void;
}

export default function VoiceArea({ channel, server, isConnected, onJoin }: Props) {
  const { user } = useAuthStore();
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const socket = getSocket();
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const createPeer = useCallback((socketId: string, stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('webrtc_ice_candidate', { to: socketId, candidate });
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      streamsRef.current.set(socketId, remoteStream);
      const videoEl = remoteVideosRef.current.get(socketId);
      if (videoEl) videoEl.srcObject = remoteStream;
      setVoiceUsers(prev => prev.map(u => u.socketId === socketId ? { ...u } : u));
    };

    peersRef.current.set(socketId, pc);
    return pc;
  }, [socket]);

  const startMedia = useCallback(async (withVideo = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo,
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (e) {
      // Audio only fallback
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        return stream;
      } catch { return null; }
    }
  }, []);

  useEffect(() => {
    if (!isConnected) {
      // Cleanup when disconnected
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
      localStream?.getTracks().forEach(t => t.stop());
      setLocalStream(null);
      setVoiceUsers([]);
      return;
    }

    let stream: MediaStream | null = null;

    const init = async () => {
      stream = await startMedia(false);
      socket.emit('join_voice', { channelId: channel.id });
    };

    const onPeers = async ({ peers }: { peers: VoiceUser[] }) => {
      if (!stream) return;
      for (const peer of peers) {
        const pc = createPeer(peer.socketId, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { to: peer.socketId, offer });
      }
    };

    const onUserJoined = (user: VoiceUser) => {
      setVoiceUsers(prev => [...prev.filter(u => u.socketId !== user.socketId), user]);
    };

    const onUserLeft = ({ socketId }: { socketId: string }) => {
      peersRef.current.get(socketId)?.close();
      peersRef.current.delete(socketId);
      streamsRef.current.delete(socketId);
      setVoiceUsers(prev => prev.filter(u => u.socketId !== socketId));
    };

    const onMembers = ({ members }: { members: VoiceUser[] }) => {
      setVoiceUsers(members.filter(m => m.socketId !== socket.id));
    };

    const onOffer = async ({ from, offer }: any) => {
      if (!stream) return;
      const pc = createPeer(from, stream);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { to: from, answer });
    };

    const onAnswer = async ({ from, answer }: any) => {
      await peersRef.current.get(from)?.setRemoteDescription(answer);
    };

    const onIce = async ({ from, candidate }: any) => {
      await peersRef.current.get(from)?.addIceCandidate(candidate);
    };

    init();

    socket.on('voice_peers', onPeers);
    socket.on('voice_user_joined', onUserJoined);
    socket.on('voice_user_left', onUserLeft);
    socket.on('voice_channel_members', onMembers);
    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice_candidate', onIce);

    return () => {
      socket.off('voice_peers', onPeers);
      socket.off('voice_user_joined', onUserJoined);
      socket.off('voice_user_left', onUserLeft);
      socket.off('voice_channel_members', onMembers);
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice_candidate', onIce);
    };
  }, [isConnected, channel.id]);

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(v => !v);
  };

  const toggleVideo = async () => {
    if (!videoOn) {
      const stream = await startMedia(true);
      if (stream) {
        setVideoOn(true);
        // Update existing peer connections with video track
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          peersRef.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
            else pc.addTrack(videoTrack, stream);
          });
        }
      }
    } else {
      localStream?.getVideoTracks().forEach(t => { t.enabled = false; t.stop(); });
      setVideoOn(false);
    }
  };

  // Not connected view
  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-discord-bg-primary">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-discord-bg-secondary flex items-center justify-center mb-4 mx-auto">
            <Volume2 size={36} className="text-discord-text-muted" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{channel.name}</h2>
          <p className="text-discord-text-muted text-sm mb-6">
            Voice Channel — {server.name}
          </p>

          <button
            onClick={onJoin}
            className="px-8 py-3 bg-discord-online hover:bg-discord-online/80 text-white font-semibold rounded-md transition-colors"
          >
            Join Voice Channel
          </button>
        </div>

        {voiceUsers.length > 0 && (
          <div className="text-sm text-discord-text-muted flex items-center gap-2">
            <Users size={14} />
            {voiceUsers.length} user{voiceUsers.length !== 1 ? 's' : ''} in channel
          </div>
        )}
      </div>
    );
  }

  // Connected view
  const allUsers = [
    { socketId: 'local', userId: user?.id || '', username: user?.username || 'You', avatar_url: user?.avatar_url, muted },
    ...voiceUsers,
  ];

  return (
    <div className="flex-1 flex flex-col bg-discord-bg-primary">
      {/* Header */}
      <div className="flex items-center px-4 h-12 border-b border-discord-bg-tertiary flex-shrink-0">
        <Volume2 size={18} className="text-discord-online mr-2" />
        <span className="font-semibold text-white">{channel.name}</span>
        <div className="ml-2 text-xs text-discord-online font-medium">● Voice Connected</div>
      </div>

      {/* Video grid */}
      <div className="flex-1 flex flex-wrap gap-4 p-6 overflow-y-auto items-center justify-center">
        {/* Local video */}
        <div className="relative bg-discord-bg-secondary rounded-xl overflow-hidden" style={{ width: 280, height: 210 }}>
          {videoOn ? (
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-discord-brand flex items-center justify-center text-white text-2xl font-bold">
                {user?.username?.slice(0, 1).toUpperCase()}
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded">
            {muted && <MicOff size={12} className="text-discord-danger" />}
            <span className="text-white text-xs font-medium">{user?.username} (You)</span>
          </div>
        </div>

        {/* Remote users */}
        {voiceUsers.map(vu => (
          <div key={vu.socketId} className="relative bg-discord-bg-secondary rounded-xl overflow-hidden" style={{ width: 280, height: 210 }}>
            <video
              ref={el => { if (el) { remoteVideosRef.current.set(vu.socketId, el); const s = streamsRef.current.get(vu.socketId); if (s) el.srcObject = s; } }}
              autoPlay playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {!streamsRef.current.has(vu.socketId) && (
                <div className="w-16 h-16 rounded-full bg-discord-brand flex items-center justify-center text-white text-2xl font-bold">
                  {vu.username?.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded">
              <span className="text-white text-xs font-medium">{vu.username}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 py-4 border-t border-discord-bg-tertiary bg-discord-bg-secondary flex-shrink-0">
        <ControlBtn onClick={toggleMute} active={!muted} danger={muted}>
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </ControlBtn>
        <ControlBtn onClick={toggleVideo} active={videoOn}>
          {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </ControlBtn>
        <ControlBtn onClick={() => {}} active={false}>
          <Monitor size={20} />
        </ControlBtn>
        <div className="w-px h-8 bg-discord-bg-accent" />
        <button
          onClick={onJoin}
          className="flex items-center gap-2 px-4 py-2 bg-discord-danger hover:bg-discord-danger/80 text-white rounded-md font-medium text-sm transition-colors"
        >
          <PhoneOff size={16} />
          Disconnect
        </button>
      </div>
    </div>
  );
}

function ControlBtn({ children, onClick, active, danger }: {
  children: React.ReactNode; onClick: () => void; active: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
        ${danger ? 'bg-discord-danger/20 text-discord-danger hover:bg-discord-danger hover:text-white'
          : active ? 'bg-discord-bg-accent text-white hover:bg-discord-bg-hover'
          : 'bg-discord-bg-accent text-discord-text-muted hover:text-white hover:bg-discord-bg-hover'
        }
      `}
    >
      {children}
    </button>
  );
}
