import { useState } from 'react';
import { Server, Channel } from '../../types';
import { ChevronDown, Hash, Volume2, Settings, Lock } from 'lucide-react';
import InviteModal from '../modals/InviteModal';

interface Props {
  server: Server;
  selectedChannel: Channel | null;
  onSelectChannel: (c: Channel) => void;
  onJoinVoice: (c: Channel) => void;
  voiceChannelId?: string;
  voiceBottom: React.ReactNode;
}

export default function ChannelSidebar({ server, selectedChannel, onSelectChannel, onJoinVoice, voiceChannelId, voiceBottom }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const channels = server.channels || [];
  const categories = [...new Set(channels.map(c => c.category || 'CHANNELS'))];

  const toggle = (cat: string) => setCollapsed(p => ({ ...p, [cat]: !p[cat] }));

  return (
    <div className="w-60 min-w-[240px] bg-discord-sidebar flex flex-col">
      {/* Server header */}
      <div
        className="flex items-center justify-between px-4 h-12 border-b border-discord-bg-tertiary cursor-pointer hover:bg-discord-bg-hover transition-colors"
        onClick={() => setShowSettings(!showSettings)}
      >
        <span className="font-semibold text-white truncate">{server.name}</span>
        <ChevronDown size={16} className="text-discord-interactive-normal flex-shrink-0" />
      </div>

      {/* Server settings dropdown */}
      {showSettings && (
        <div className="absolute top-12 left-72 w-52 bg-[#111214] rounded-md shadow-xl z-50 p-1 animate-fade-in">
          <button
            onClick={() => { setShowInvite(true); setShowSettings(false); }}
            className="w-full text-left px-3 py-2 text-discord-text-link text-sm rounded hover:bg-discord-bg-hover"
          >
            Invite People
          </button>
          <div className="h-px bg-discord-bg-accent my-1" />
          <div className="px-3 py-2 text-xs text-discord-text-muted">
            Invite Code: <span className="font-mono text-white">{server.invite_code}</span>
          </div>
        </div>
      )}

      {/* Channels */}
      <div className="flex-1 overflow-y-auto py-2 messages-scroll">
        {categories.map(cat => {
          const catChannels = channels.filter(c => (c.category || 'CHANNELS') === cat);
          const isCollapsed = collapsed[cat];
          return (
            <div key={cat} className="mb-1">
              {/* Category header */}
              <button
                onClick={() => toggle(cat)}
                className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold text-discord-text-muted uppercase tracking-wide hover:text-discord-interactive-hover group"
              >
                <svg
                  className={`w-2.5 h-2.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                  viewBox="0 0 24 24" fill="currentColor"
                >
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span className="truncate">{cat}</span>
                <svg
                  className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100"
                  viewBox="0 0 24 24" fill="currentColor"
                >
                  <path d="M20 11.0011H13V4.00107C13 3.44907 12.553 3.00107 12 3.00107C11.447 3.00107 11 3.44907 11 4.00107V11.0011H4C3.447 11.0011 3 11.4491 3 12.0011C3 12.5531 3.447 13.0011 4 13.0011H11V20.0011C11 20.5531 11.447 21.0011 12 21.0011C12.553 21.0011 13 20.5531 13 20.0011V13.0011H20C20.553 13.0011 21 12.5531 21 12.0011C21 11.4491 20.553 11.0011 20 11.0011Z"/>
                </svg>
              </button>

              {/* Channels in category */}
              {!isCollapsed && catChannels.map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  selected={selectedChannel?.id === channel.id}
                  inVoice={voiceChannelId === channel.id}
                  onClick={() => channel.type === 'voice' ? onJoinVoice(channel) : onSelectChannel(channel)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* User panel at bottom */}
      {voiceBottom}

      {/* Invite modal */}
      {showInvite && <InviteModal server={server} onClose={() => setShowInvite(false)} />}
    </div>
  );
}

function ChannelItem({ channel, selected, inVoice, onClick }: {
  channel: Channel; selected: boolean; inVoice: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 w-full mx-1 px-2 py-1.5 rounded text-sm group transition-colors
        ${selected
          ? 'bg-discord-bg-hover text-discord-interactive-active'
          : 'text-discord-channel-text hover:bg-discord-bg-hover hover:text-discord-channel-hover'
        }
        ${inVoice ? 'text-discord-online' : ''}
      `}
      style={{ width: 'calc(100% - 8px)' }}
    >
      {channel.type === 'text' ? (
        <Hash size={16} className="flex-shrink-0 opacity-70" />
      ) : (
        <Volume2 size={16} className="flex-shrink-0 opacity-70" />
      )}
      <span className="truncate">{channel.name}</span>
      {inVoice && (
        <span className="ml-auto text-xs text-discord-online font-medium">●</span>
      )}
      <Settings
        size={14}
        className="ml-auto opacity-0 group-hover:opacity-70 flex-shrink-0 hover:text-white hover:opacity-100"
      />
    </button>
  );
}
