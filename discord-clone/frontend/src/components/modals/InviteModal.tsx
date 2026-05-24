import { useState } from 'react';
import { Server } from '../../types';
import { Copy, Check, X } from 'lucide-react';

interface Props { server: Server; onClose: () => void; }

export default function InviteModal({ server, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}/invite/${server.invite_code}`;

  const copy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#313338] rounded-xl w-full max-w-md mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Invite people to {server.name}</h2>
          <button onClick={onClose} className="text-discord-text-muted hover:text-white"><X size={20} /></button>
        </div>

        <p className="text-sm text-discord-text-muted mb-3">
          Share this link to invite people to your server.
        </p>

        <div className="flex gap-2">
          <div className="flex-1 bg-discord-bg-tertiary rounded-lg px-3 py-3 text-sm text-discord-text-normal font-mono truncate">
            {inviteLink}
          </div>
          <button
            onClick={copy}
            className={`flex items-center gap-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
              copied ? 'bg-discord-success text-white' : 'bg-discord-brand hover:bg-discord-brand-hover text-white'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-discord-bg-secondary rounded-lg">
          <p className="text-xs text-discord-text-muted">
            Invite code: <span className="font-mono font-bold text-discord-text-normal">{server.invite_code}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
