import { User } from '../../types';

interface Props { members: User[]; }

const statusColors: Record<string, string> = {
  online: '#23a55a', idle: '#f0b232', dnd: '#f23f43', offline: '#80848e',
};

export default function MembersPanel({ members }: Props) {
  const online = members.filter(m => m.status && m.status !== 'offline');
  const offline = members.filter(m => !m.status || m.status === 'offline');

  return (
    <div className="w-60 min-w-[240px] bg-discord-sidebar overflow-y-auto py-4 messages-scroll">
      {online.length > 0 && (
        <MemberGroup title={`Online — ${online.length}`} members={online} />
      )}
      {offline.length > 0 && (
        <MemberGroup title={`Offline — ${offline.length}`} members={offline} />
      )}
    </div>
  );
}

function MemberGroup({ title, members }: { title: string; members: User[] }) {
  return (
    <div className="mb-4">
      <div className="px-4 py-1 text-xs font-semibold text-discord-text-muted uppercase tracking-wide">{title}</div>
      {members.map(m => (
        <div key={m.id}
          className="flex items-center gap-3 px-2 py-1.5 mx-2 rounded hover:bg-discord-bg-hover cursor-pointer group"
        >
          <div className="relative flex-shrink-0">
            {m.avatar_url ? (
              <img src={m.avatar_url} className="w-8 h-8 rounded-full opacity-70 group-hover:opacity-100" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-discord-brand flex items-center justify-center text-white text-sm font-semibold opacity-70 group-hover:opacity-100">
                {m.username?.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-discord-sidebar"
              style={{ background: statusColors[m.status || 'offline'] }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-discord-text-muted group-hover:text-discord-text-normal truncate">
              {m.username}
            </p>
            {m.role === 'owner' && (
              <p className="text-xs text-discord-text-muted">Owner</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
