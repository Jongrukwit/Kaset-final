import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Channel } from '../../types';
import { Mic, MicOff, Headphones, Settings, PhoneOff } from 'lucide-react';

interface Props {
  voiceChannel: Channel | null;
  onLeaveVoice: () => void;
}

export default function UserPanel({ voiceChannel, onLeaveVoice }: Props) {
  const { user, logout } = useAuthStore();
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

  const avatarColor = '#5865f2';
  const initials = user.username?.slice(0, 1).toUpperCase() || '?';

  return (
    <div className="bg-[#232428] px-2 py-2 flex-shrink-0">
      {/* Voice connection indicator */}
      {voiceChannel && (
        <div className="mb-2 bg-[#1a1b1e] rounded-md p-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-discord-online animate-pulse" />
                <span className="text-xs font-semibold text-discord-online">Voice Connected</span>
              </div>
              <p className="text-xs text-discord-text-muted mt-0.5 truncate">#{voiceChannel.name}</p>
            </div>
            <button
              onClick={onLeaveVoice}
              className="p-1.5 rounded hover:bg-discord-danger/20 text-discord-text-muted hover:text-discord-danger transition-colors"
              title="Disconnect"
            >
              <PhoneOff size={14} />
            </button>
          </div>
        </div>
      )}

      {/* User info */}
      <div className="flex items-center gap-2">
        <div className="relative cursor-pointer" onClick={() => setShowMenu(!showMenu)}>
          {user.avatar_url ? (
            <img src={user.avatar_url} className="w-8 h-8 rounded-full" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: avatarColor }}>
              {initials}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-discord-online border-2 border-[#232428]" />
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowMenu(!showMenu)}>
          <p className="text-sm font-semibold text-white truncate leading-tight">{user.username}</p>
          <p className="text-xs text-discord-text-muted leading-tight">
            #{user.discriminator || '0000'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          <IconButton
            active={!muted}
            onClick={() => setMuted(v => !v)}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <MicOff size={16} /> : <Mic size={16} />}
          </IconButton>
          <IconButton
            active={!deafened}
            onClick={() => setDeafened(v => !v)}
            title={deafened ? 'Undeafen' : 'Deafen'}
          >
            <Headphones size={16} />
          </IconButton>
          <IconButton onClick={() => {}} title="User Settings">
            <Settings size={16} />
          </IconButton>
        </div>
      </div>

      {/* Context menu */}
      {showMenu && (
        <div className="absolute bottom-16 left-2 w-52 bg-[#111214] rounded-md shadow-xl z-50 p-1 animate-fade-in">
          <div className="px-3 py-2 border-b border-discord-bg-accent mb-1">
            <p className="text-sm font-semibold text-white">{user.username}</p>
            <p className="text-xs text-discord-text-muted">#{user.discriminator}</p>
          </div>
          <button
            onClick={() => { logout(); setShowMenu(false); }}
            className="w-full text-left px-3 py-2 text-discord-danger text-sm rounded hover:bg-discord-bg-hover"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

function IconButton({ children, onClick, title, active = true }: {
  children: React.ReactNode; onClick: () => void; title?: string; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'text-discord-interactive-normal hover:text-white hover:bg-discord-bg-hover'
          : 'text-discord-danger hover:bg-discord-bg-hover'
      }`}
    >
      {children}
    </button>
  );
}
