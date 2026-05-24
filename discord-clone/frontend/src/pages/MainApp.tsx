import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ServerList from '../components/layout/ServerList';
import ChannelSidebar from '../components/layout/ChannelSidebar';
import ChatArea from '../components/chat/ChatArea';
import UserPanel from '../components/layout/UserPanel';
import VoiceArea from '../components/voice/VoiceArea';
import MembersPanel from '../components/layout/MembersPanel';
import InviteModal from '../components/modals/InviteModal';
import CreateServerModal from '../components/modals/CreateServerModal';
import JoinServerModal from '../components/modals/JoinServerModal';
import { Server, Channel } from '../types';
import { api } from '../lib/api';

export default function MainApp() {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showMembers, setShowMembers] = useState(true);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);
  const [voiceChannel, setVoiceChannel] = useState<Channel | null>(null);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const data = await api.get('/api/servers');
      setServers(data);
      if (data.length > 0 && !selectedServer) {
        selectServer(data[0]);
      }
    } catch (e) { console.error(e); }
  };

  const selectServer = async (server: Server) => {
    try {
      const detailed = await api.get(`/api/servers/${server.id}`);
      setSelectedServer(detailed);
      const firstText = detailed.channels?.find((c: Channel) => c.type === 'text');
      if (firstText) setSelectedChannel(firstText);
    } catch (e) { console.error(e); }
  };

  const handleServerCreated = (server: Server) => {
    setServers(prev => [...prev, server]);
    selectServer(server);
    setShowCreateServer(false);
  };

  const handleServerJoined = (server: Server) => {
    setServers(prev => [...prev, server]);
    selectServer(server);
    setShowJoinServer(false);
  };

  const handleJoinVoice = (channel: Channel) => {
    if (voiceChannel?.id === channel.id) {
      setVoiceChannel(null);
    } else {
      setVoiceChannel(channel);
    }
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-discord-bg-primary">
      {/* Server list */}
      <ServerList
        servers={servers}
        selectedServer={selectedServer}
        onSelectServer={selectServer}
        onCreateServer={() => setShowCreateServer(true)}
        onJoinServer={() => setShowJoinServer(true)}
      />

      {/* Channel sidebar */}
      {selectedServer && (
        <ChannelSidebar
          server={selectedServer}
          selectedChannel={selectedChannel}
          onSelectChannel={setSelectedChannel}
          onJoinVoice={handleJoinVoice}
          voiceChannelId={voiceChannel?.id}
          voiceBottom={<UserPanel voiceChannel={voiceChannel} onLeaveVoice={() => setVoiceChannel(null)} />}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 min-w-0">
        {selectedChannel && (
          <div className="flex flex-col flex-1 min-w-0">
            {selectedChannel.type === 'text' ? (
              <ChatArea
                channel={selectedChannel}
                server={selectedServer!}
                showMembers={showMembers}
                onToggleMembers={() => setShowMembers(v => !v)}
              />
            ) : (
              <VoiceArea
                channel={selectedChannel}
                server={selectedServer!}
                isConnected={voiceChannel?.id === selectedChannel.id}
                onJoin={() => handleJoinVoice(selectedChannel)}
              />
            )}
          </div>
        )}

        {/* Members panel */}
        {showMembers && selectedServer && selectedChannel?.type === 'text' && (
          <MembersPanel members={selectedServer.members || []} />
        )}
      </div>

      {/* Modals */}
      {showCreateServer && (
        <CreateServerModal onClose={() => setShowCreateServer(false)} onCreated={handleServerCreated} />
      )}
      {showJoinServer && (
        <JoinServerModal onClose={() => setShowJoinServer(false)} onJoined={handleServerJoined} />
      )}
    </div>
  );
}
