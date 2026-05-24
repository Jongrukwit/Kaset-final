import { useState, useRef, useEffect } from 'react';
import { Message } from '../../types';
import { format, isToday, isYesterday } from 'date-fns';
import { Reply, Edit2, Trash2, MoreHorizontal } from 'lucide-react';

interface Props {
  message: Message;
  grouped: boolean;
  isOwn: boolean;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReply: () => void;
}

function formatTime(date: string) {
  const d = new Date(date);
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
  return format(d, 'MM/dd/yyyy h:mm a');
}

const avatarColors = ['#5865f2','#57f287','#fee75c','#eb459e','#ed4245','#3ba55d','#faa61a'];
function getColor(id: string) {
  let h = 0; for (const c of id) h = c.charCodeAt(0) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

export default function MessageItem({ message, grouped, isOwn, onEdit, onDelete, onReply }: Props) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const author = message.profiles;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const submitEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
    if (e.key === 'Escape') { setEditing(false); setEditContent(message.content); }
  };

  return (
    <div
      className={`relative flex px-4 gap-4 group animate-fade-in
        ${hovered ? 'bg-discord-bg-hover/40' : ''}
        ${grouped ? 'py-0.5' : 'pt-4 pb-0.5'}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMenu(false); }}
    >
      {/* Avatar column */}
      <div className="w-10 flex-shrink-0 flex items-start justify-center pt-0.5">
        {!grouped ? (
          author?.avatar_url ? (
            <img src={author.avatar_url} className="w-10 h-10 rounded-full cursor-pointer hover:ring-2 ring-discord-brand" alt="" />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
              style={{ background: getColor(author?.id || message.user_id) }}
            >
              {(author?.username || '?').slice(0, 1).toUpperCase()}
            </div>
          )
        ) : (
          hovered && (
            <span className="text-xs text-discord-text-muted mt-1 select-none">
              {format(new Date(message.created_at), 'h:mm')}
            </span>
          )
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!grouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-white hover:underline cursor-pointer text-sm">
              {author?.username || 'Unknown'}
            </span>
            <span className="text-xs text-discord-text-muted">{formatTime(message.created_at)}</span>
          </div>
        )}

        {editing ? (
          <div>
            <textarea
              ref={inputRef}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-discord-bg-accent text-discord-text-normal rounded px-3 py-2 text-sm resize-none border border-discord-brand focus:outline-none"
              rows={Math.min(editContent.split('\n').length + 1, 6)}
            />
            <p className="text-xs text-discord-text-muted mt-1">
              escape to <button onClick={() => setEditing(false)} className="text-discord-text-link hover:underline">cancel</button>
              {' '}• enter to <button onClick={submitEdit} className="text-discord-text-link hover:underline">save</button>
            </p>
          </div>
        ) : (
          <p className="text-sm text-discord-text-normal leading-relaxed break-words discord-message">
            {message.content}
            {message.edited_at && (
              <span className="text-xs text-discord-text-muted ml-1">(edited)</span>
            )}
          </p>
        )}
      </div>

      {/* Action buttons - show on hover */}
      {hovered && !editing && (
        <div className="absolute right-4 top-0 -translate-y-1/2 flex items-center bg-discord-bg-secondary border border-discord-bg-accent rounded shadow-lg z-10">
          <ActionBtn onClick={onReply} tip="Reply"><Reply size={16} /></ActionBtn>
          {isOwn && <ActionBtn onClick={() => setEditing(true)} tip="Edit"><Edit2 size={16} /></ActionBtn>}
          {isOwn && (
            <ActionBtn onClick={() => onDelete(message.id)} tip="Delete" danger>
              <Trash2 size={16} />
            </ActionBtn>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, tip, danger }: {
  children: React.ReactNode; onClick: () => void; tip?: string; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={tip}
      className={`p-2 transition-colors tooltip ${
        danger
          ? 'text-discord-text-muted hover:text-discord-danger hover:bg-discord-danger/10'
          : 'text-discord-text-muted hover:text-white hover:bg-discord-bg-hover'
      }`}
      data-tip={tip}
    >
      {children}
    </button>
  );
}
