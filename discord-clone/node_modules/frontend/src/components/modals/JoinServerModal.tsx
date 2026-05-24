import { useState } from 'react';
import { api } from '../../lib/api';
import { Server } from '../../types';
import { X, Link } from 'lucide-react';

interface Props { onClose: () => void; onJoined: (s: Server) => void; }

export default function JoinServerModal({ onClose, onJoined }: Props) {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const extractCode = (input: string) => {
    // Handle full invite links like http://localhost:5173/invite/ABC123
    const match = input.match(/(?:invite\/)?([A-Z0-9]{6,8})$/i);
    return match ? match[1].toUpperCase() : input.trim().toUpperCase();
  };

  const handlePreview = async () => {
    const inviteCode = extractCode(code);
    if (!inviteCode) return;
    setPreviewing(true);
    setError('');
    try {
      const data = await api.get(`/api/servers/invite/${inviteCode}`);
      setPreview(data);
    } catch {
      setError('Invalid invite code or link. Please check and try again.');
      setPreview(null);
    } finally { setPreviewing(false); }
  };

  const handleJoin = async () => {
    const inviteCode = extractCode(code);
    setLoading(true);
    try {
      const { server } = await api.post('/api/servers/join', { invite_code: inviteCode });
      onJoined(server);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#313338] rounded-xl w-full max-w-sm mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-discord-bg-accent">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white">Join a Server</h2>
            <button onClick={onClose} className="text-discord-text-muted hover:text-white"><X size={20} /></button>
          </div>
          <p className="text-discord-text-muted text-sm">Enter an invite below to join an existing server.</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">
              Invite Link or Code <span className="text-discord-danger">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-text-muted" />
                <input
                  type="text"
                  value={code}
                  onChange={e => { setCode(e.target.value); setPreview(null); setError(''); }}
                  className="w-full bg-discord-bg-tertiary text-white rounded-md pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-discord-brand"
                  placeholder="https://discord.gg/... or ABC123"
                  onKeyDown={e => e.key === 'Enter' && handlePreview()}
                />
              </div>
              <button
                onClick={handlePreview}
                disabled={!code.trim() || previewing}
                className="px-3 py-2 bg-discord-bg-accent hover:bg-discord-bg-hover text-white rounded-md text-sm disabled:opacity-50 transition-colors"
              >
                {previewing ? '...' : 'Preview'}
              </button>
            </div>
          </div>

          {error && <p className="text-discord-danger text-sm">{error}</p>}

          {/* Server preview */}
          {preview && (
            <div className="bg-discord-bg-secondary rounded-xl overflow-hidden border border-discord-bg-accent">
              <div className="h-16 bg-gradient-to-r from-discord-brand to-purple-600" />
              <div className="px-4 pb-4">
                <div className="w-14 h-14 rounded-xl bg-discord-bg-accent -mt-7 mb-2 flex items-center justify-center border-4 border-discord-bg-secondary overflow-hidden">
                  {preview.icon_url ? (
                    <img src={preview.icon_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-white font-bold text-lg">{preview.name?.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <h3 className="text-white font-bold">{preview.name}</h3>
                {preview.description && <p className="text-discord-text-muted text-sm mt-1">{preview.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-discord-text-muted">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-discord-online inline-block" />
                    {preview.member_count} Members
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button onClick={onClose} className="px-4 py-2 text-white hover:underline">Back</button>
            <button
              onClick={handleJoin}
              disabled={!preview || loading}
              className="px-6 py-2 bg-discord-brand hover:bg-discord-brand-hover text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Joining...' : 'Join Server'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
