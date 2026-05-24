import { useState, useRef, useCallback, useEffect } from 'react';
import { Channel, Message } from '../../types';
import { getSocket } from '../../lib/socket';
import { Plus, Smile, Gift, X } from 'lucide-react';

interface Props {
  channel: Channel;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (content: string) => void;
}

export default function MessageInput({ channel, replyTo, onCancelReply, onSend }: Props) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const socket = getSocket();

  useEffect(() => {
    textareaRef.current?.focus();
  }, [channel.id]);

  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing_start', { channelId: channel.id });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing_stop', { channelId: channel.id });
    }, 3000);
  }, [isTyping, channel.id]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (e.target.value) startTyping();
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!content.trim()) return;
    onSend(content.trim());
    setContent('');
    clearTimeout(typingTimer.current);
    setIsTyping(false);
    socket.emit('typing_stop', { channelId: channel.id });
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <div className="px-4 pb-6 flex-shrink-0">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 bg-discord-bg-secondary rounded-t-lg px-4 py-2 border-b border-discord-bg-tertiary">
          <div className="text-xs text-discord-text-muted flex-1">
            Replying to <span className="font-semibold text-discord-text-normal">{replyTo.profiles?.username}</span>
            <span className="ml-2 text-discord-text-muted truncate">{replyTo.content.slice(0, 50)}{replyTo.content.length > 50 ? '…' : ''}</span>
          </div>
          <button onClick={onCancelReply} className="text-discord-text-muted hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input box */}
      <div className={`flex items-end gap-2 bg-discord-bg-accent rounded-lg px-4 py-3 ${replyTo ? 'rounded-t-none' : ''}`}>
        {/* Attachment button */}
        <button className="text-discord-interactive-normal hover:text-white flex-shrink-0 pb-0.5 transition-colors">
          <Plus size={20} />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channel.name}`}
          rows={1}
          className="flex-1 bg-transparent text-discord-text-normal placeholder-discord-text-muted resize-none focus:outline-none text-sm leading-relaxed"
          style={{ maxHeight: '200px', overflowY: 'auto' }}
        />

        {/* Right side icons */}
        <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
          <button className="text-discord-interactive-normal hover:text-white transition-colors">
            <Gift size={20} />
          </button>
          <button className="text-discord-interactive-normal hover:text-white transition-colors">
            <Smile size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
