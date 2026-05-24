import { useState } from 'react';
import { api } from '../../lib/api';
import { Server } from '../../types';
import { X, Upload } from 'lucide-react';

interface Props { onClose: () => void; onCreated: (s: Server) => void; }

export default function CreateServerModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const server = await api.post('/api/servers', { name: name.trim() });
      onCreated(server);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#313338] rounded-xl w-full max-w-sm mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center border-b border-discord-bg-accent">
          <h2 className="text-2xl font-bold text-white mb-2">Customize Your Server</h2>
          <p className="text-discord-text-muted text-sm">
            Give your new server a personality with a name and an icon.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Icon upload placeholder */}
          <div className="flex justify-center mb-2">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-discord-bg-accent flex flex-col items-center justify-center cursor-pointer hover:border-discord-brand transition-colors">
              <Upload size={20} className="text-discord-text-muted mb-1" />
              <span className="text-xs text-discord-text-muted">Upload</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-1">
              Server Name <span className="text-discord-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-discord-bg-tertiary text-white rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-discord-brand"
              placeholder="My Awesome Server"
              maxLength={100}
              required
            />
          </div>

          {error && <p className="text-discord-danger text-sm">{error}</p>}

          <p className="text-xs text-discord-text-muted">
            By creating a server, you agree to Discord's Community Guidelines.
          </p>

          <div className="flex justify-between pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-white hover:underline">
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-2 bg-discord-brand hover:bg-discord-brand-hover text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
