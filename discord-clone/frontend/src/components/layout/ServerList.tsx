import { Server } from '../../types';

interface Props {
  servers: Server[];
  selectedServer: Server | null;
  onSelectServer: (s: Server) => void;
  onCreateServer: () => void;
  onJoinServer: () => void;
}

const DiscordLogo = () => (
  <svg width="28" height="20" viewBox="0 0 71 55" fill="currentColor">
    <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.52529C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.52529C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z"/>
  </svg>
);

const getInitials = (name: string) => name.slice(0, 2).toUpperCase();
const getColor = (name: string) => {
  const colors = ['#5865f2','#57f287','#fee75c','#eb459e','#ed4245','#3ba55d','#faa61a'];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function ServerList({ servers, selectedServer, onSelectServer, onCreateServer, onJoinServer }: Props) {
  return (
    <div className="w-[72px] min-w-[72px] bg-discord-server-list flex flex-col items-center py-3 gap-2 overflow-y-auto overflow-x-hidden">
      {/* Home button */}
      <ServerIcon active={!selectedServer} color="#5865f2" tooltip="Home" onClick={() => {}}>
        <DiscordLogo />
      </ServerIcon>

      <div className="w-8 h-px bg-discord-bg-accent rounded-full mx-auto" />

      {/* Servers */}
      {servers.map(server => (
        <div key={server.id} className="relative flex items-center">
          {/* Active indicator */}
          {selectedServer?.id === server.id && (
            <div className="absolute -left-3 w-1 h-8 bg-white rounded-r-full" />
          )}
          <ServerIcon
            active={selectedServer?.id === server.id}
            tooltip={server.name}
            onClick={() => onSelectServer(server)}
          >
            {server.icon_url ? (
              <img src={server.icon_url} alt={server.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-white">{getInitials(server.name)}</span>
            )}
          </ServerIcon>
        </div>
      ))}

      <div className="w-8 h-px bg-discord-bg-accent rounded-full mx-auto" />

      {/* Add server */}
      <ServerIcon tooltip="Add a Server" color="#23a55a" onClick={onCreateServer}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11.0011H13V4.00107C13 3.44907 12.553 3.00107 12 3.00107C11.447 3.00107 11 3.44907 11 4.00107V11.0011H4C3.447 11.0011 3 11.4491 3 12.0011C3 12.5531 3.447 13.0011 4 13.0011H11V20.0011C11 20.5531 11.447 21.0011 12 21.0011C12.553 21.0011 13 20.5531 13 20.0011V13.0011H20C20.553 13.0011 21 12.5531 21 12.0011C21 11.4491 20.553 11.0011 20 11.0011Z"/>
        </svg>
      </ServerIcon>

      {/* Explore */}
      <ServerIcon tooltip="Explore Discoverable Servers" color="#23a55a" onClick={onJoinServer}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 10.9C11.39 10.9 10.9 11.39 10.9 12C10.9 12.61 11.39 13.1 12 13.1C12.61 13.1 13.1 12.61 13.1 12C13.1 11.39 12.61 10.9 12 10.9ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13.19 13.19L6 18L10.81 10.81L18 6L13.19 13.19Z"/>
        </svg>
      </ServerIcon>
    </div>
  );
}

function ServerIcon({ children, active, color, tooltip, onClick }: {
  children: React.ReactNode; active?: boolean; color?: string; tooltip?: string; onClick: () => void;
}) {
  return (
    <div className="relative tooltip flex items-center justify-center" data-tip={tooltip}>
      <button
        onClick={onClick}
        className={`server-icon w-12 h-12 flex items-center justify-center text-white cursor-pointer overflow-hidden transition-all duration-150 ${
          active ? 'rounded-[30%] bg-discord-brand' : 'bg-discord-bg-accent hover:bg-discord-brand'
        }`}
        style={color && !active ? { background: color } : undefined}
      >
        {children}
      </button>
    </div>
  );
}
