import { useState, useEffect, useRef, useCallback } from 'react';
import { Channel, Server, Message } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import SearchBar from './SearchBar';
import { Hash, Users, Search, Bell, Pin, HelpCircle } from 'lucide-react';

interface Props {
  channel: Channel;
  server: Server;
  showMembers: boolean;
  onToggleMembers: () => void;
}

export default function ChatArea({ channel, server, showMembers, onToggleMembers }: Props) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  const loadMessages = useCallback(async (before?: string) => {
    try {
      const url = `/api/messages/${channel.id}${before ? `?before=${before}` : ''}`;
      const data = await api.get(url);
      if (!before) {
        setMessages(data);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      } else {
        setMessages(prev => [...data, ...prev]);
      }
      setHasMore(data.length === 50);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [channel.id]);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setHasMore(true);
    setTypingUsers([]);
    loadMessages();
    socket.emit('join_channel', { channelId: channel.id });

    const onNew = (msg: Message) => {
      if (msg.channel_id !== channel.id) return;
      setMessages(prev => [...prev, msg]);
      setTypingUsers(prev => prev.filter(u => u !== msg.profiles?.username));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
    const onUpdated = (msg: Message) => {
      if (msg.channel_id !== channel.id) return;
      setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
    };
    const onDeleted = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    };
    const onTyping = ({ username, channelId }: any) => {
      if (channelId !== channel.id) return;
      setTypingUsers(prev => prev.includes(username) ? prev : [...prev, username]);
    };
    const onStopTyping = ({ userId, channelId }: any) => {
      if (channelId !== channel.id) return;
      setTypingUsers(prev => prev.filter(u => u !== userId));
    };

    socket.on('new_message', onNew);
    socket.on('message_updated', onUpdated);
    socket.on('message_deleted', onDeleted);
    socket.on('user_typing', onTyping);
    socket.on('user_stop_typing', onStopTyping);

    return () => {
      socket.off('new_message', onNew);
      socket.off('message_updated', onUpdated);
      socket.off('message_deleted', onDeleted);
      socket.off('user_typing', onTyping);
      socket.off('user_stop_typing', onStopTyping);
    };
  }, [channel.id]);

  // Infinite scroll
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || !hasMore || loading) return;
    if (el.scrollTop < 100) {
      const oldest = messages[0];
      if (oldest) loadMessages(oldest.created_at);
    }
  };

  const handleSend = (content: string) => {
    if (!content.trim()) return;
    socket.emit('send_message', { channelId: channel.id, content, replyToId: replyTo?.id });
    setReplyTo(null);
  };

  const handleEdit = (id: string, content: string) => {
    socket.emit('edit_message', { messageId: id, content });
  };

  const handleDelete = (id: string) => {
    socket.emit('delete_message', { messageId: id });
  };

  // Group consecutive messages from same author within 7 min
  const groupedMessages = messages.reduce<{ message: Message; grouped: boolean }[]>((acc, msg, i) => {
    const prev = messages[i - 1];
    const grouped =
      prev &&
      prev.profiles?.id === msg.profiles?.id &&
      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 7 * 60 * 1000;
    acc.push({ message: msg, grouped: !!grouped });
    return acc;
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-discord-bg-primary">
      {/* Channel header */}
      <div className="flex items-center px-4 h-12 border-b border-discord-bg-tertiary flex-shrink-0 shadow-sm">
        <Hash size={20} className="text-discord-text-muted mr-2 flex-shrink-0" />
        <span className="font-semibold text-white mr-2">{channel.name}</span>
        <div className="h-5 w-px bg-discord-bg-accent mx-2" />
        <span className="text-sm text-discord-text-muted truncate hidden sm:block">
          {server.description || `Welcome to #${channel.name}!`}
        </span>

        <div className="flex items-center gap-1 ml-auto">
          {[
            { icon: <Bell size={20} />, tip: 'Notification Settings' },
            { icon: <Pin size={20} />, tip: 'Pinned Messages' },
            { icon: <Users size={20} />, tip: 'Member List', onClick: onToggleMembers, active: showMembers },
          ].map(({ icon, tip, onClick, active }, i) => (
            <button key={i} onClick={onClick}
              className={`p-1.5 rounded transition-colors tooltip ${active ? 'text-white' : 'text-discord-interactive-normal hover:text-white'}`}
              data-tip={tip}>
              {icon}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setShowSearch(v => !v)}
              className="flex items-center gap-2 bg-discord-bg-tertiary rounded px-2 py-1 ml-1 text-discord-text-muted hover:text-white transition-colors"
            >
              <Search size={14} />
              <span className="text-sm hidden md:inline">Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <SearchBar channelId={channel.id} onClose={() => setShowSearch(false)} />
      )}

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto messages-scroll py-4"
      >
        {loading && (
          <div className="flex justify-center py-4">
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-discord-brand animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Channel intro */}
        {!hasMore && !loading && (
          <div className="px-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-discord-bg-accent flex items-center justify-center mb-4">
              <Hash size={32} className="text-discord-text-muted" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Welcome to #{channel.name}!</h2>
            <p className="text-discord-text-muted text-sm">
              This is the start of the #{channel.name} channel.
            </p>
          </div>
        )}

        {groupedMessages.map(({ message, grouped }) => (
          <MessageItem
            key={message.id}
            message={message}
            grouped={grouped}
            isOwn={message.user_id === user?.id}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReply={() => setReplyTo(message)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 pb-1 text-xs text-discord-text-muted flex items-center gap-1 flex-shrink-0">
          <div className="flex gap-0.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-1 h-1 rounded-full bg-discord-text-muted animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <span>
            <strong>{typingUsers.slice(0, 3).join(', ')}</strong>
            {typingUsers.length === 1 ? ' is' : ' are'} typing...
          </span>
        </div>
      )}

      {/* Message input */}
      <MessageInput
        channel={channel}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
      />
    </div>
  );
}
