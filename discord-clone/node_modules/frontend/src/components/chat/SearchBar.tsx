import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { Message } from '../../types';
import { Search, X } from 'lucide-react';
import { format } from 'date-fns';

interface Props { channelId: string; onClose: () => void; }

export default function SearchBar({ channelId, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const data = await api.get(`/api/messages/${channelId}/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  }, [query, channelId]);

  const highlight = (text: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((p, i) =>
      p.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{p}</mark>
        : p
    );
  };

  return (
    <div className="border-b border-discord-bg-tertiary bg-discord-bg-secondary">
      {/* Search input */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Search size={16} className="text-discord-text-muted flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search messages..."
          className="flex-1 bg-transparent text-discord-text-normal placeholder-discord-text-muted text-sm focus:outline-none"
        />
        {loading && (
          <div className="w-4 h-4 border-2 border-discord-brand border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
        <button onClick={onClose} className="text-discord-text-muted hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="max-h-72 overflow-y-auto border-t border-discord-bg-tertiary messages-scroll">
          <div className="px-4 py-2 text-xs text-discord-text-muted font-semibold uppercase tracking-wide">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
          {results.map(msg => (
            <div key={msg.id} className="flex items-start gap-3 px-4 py-2 hover:bg-discord-bg-hover">
              <div className="w-8 h-8 rounded-full bg-discord-brand flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {(msg.profiles?.username || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-white">{msg.profiles?.username}</span>
                  <span className="text-xs text-discord-text-muted">{format(new Date(msg.created_at), 'MM/dd/yyyy')}</span>
                </div>
                <p className="text-sm text-discord-text-normal">{highlight(msg.content)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {query && !loading && results.length === 0 && (
        <div className="px-4 py-4 text-sm text-discord-text-muted text-center border-t border-discord-bg-tertiary">
          No messages found for "<strong>{query}</strong>"
        </div>
      )}
    </div>
  );
}
