import { Server, Socket } from 'socket.io';
import { supabase } from '../lib/supabase';

interface ConnectedUser {
  userId: string;
  username: string;
  avatar_url?: string;
  channelId?: string;
  voiceChannelId?: string;
}

const connectedUsers = new Map<string, ConnectedUser>();
const voiceChannelUsers = new Map<string, Set<string>>(); // channelId -> Set<socketId>

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Authenticate socket
    socket.on('authenticate', async ({ token }) => {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) { socket.emit('auth_error', 'Invalid token'); return; }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const userInfo: ConnectedUser = {
          userId: user.id,
          username: profile?.username || user.email!,
          avatar_url: profile?.avatar_url,
        };
        connectedUsers.set(socket.id, userInfo);

        // Update status to online
        await supabase.from('profiles').update({ status: 'online' }).eq('id', user.id);
        socket.emit('authenticated', { userId: user.id });
        console.log(`User ${userInfo.username} authenticated`);
      } catch (e) {
        socket.emit('auth_error', 'Authentication failed');
      }
    });

    // Join text channel room
    socket.on('join_channel', ({ channelId }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;
      if (user.channelId) socket.leave(`channel:${user.channelId}`);
      socket.join(`channel:${channelId}`);
      user.channelId = channelId;
    });

    // Send message
    socket.on('send_message', async ({ channelId, content, replyToId }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const { data: message, error } = await supabase
        .from('messages')
        .insert({ channel_id: channelId, user_id: user.userId, content, reply_to_id: replyToId || null })
        .select('*, profiles(id, username, avatar_url, discriminator)')
        .single();

      if (error) { socket.emit('message_error', error.message); return; }
      io.to(`channel:${channelId}`).emit('new_message', message);
    });

    // Edit message
    socket.on('edit_message', async ({ messageId, content }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const { data, error } = await supabase
        .from('messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user.userId)
        .select('*, profiles(id, username, avatar_url, discriminator)')
        .single();

      if (error) return;
      if (data) io.to(`channel:${data.channel_id}`).emit('message_updated', data);
    });

    // Delete message
    socket.on('delete_message', async ({ messageId }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const { data } = await supabase
        .from('messages')
        .select('channel_id, user_id')
        .eq('id', messageId)
        .single();

      if (!data || data.user_id !== user.userId) return;

      await supabase.from('messages').delete().eq('id', messageId);
      io.to(`channel:${data.channel_id}`).emit('message_deleted', { messageId, channelId: data.channel_id });
    });

    // Typing indicator
    socket.on('typing_start', ({ channelId }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;
      socket.to(`channel:${channelId}`).emit('user_typing', { userId: user.userId, username: user.username, channelId });
    });

    socket.on('typing_stop', ({ channelId }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;
      socket.to(`channel:${channelId}`).emit('user_stop_typing', { userId: user.userId, channelId });
    });

    // ===== VOICE / WebRTC Signaling =====
    socket.on('join_voice', ({ channelId }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // Leave previous voice channel
      if (user.voiceChannelId) {
        leaveVoice(socket, user, io);
      }

      user.voiceChannelId = channelId;
      socket.join(`voice:${channelId}`);

      if (!voiceChannelUsers.has(channelId)) voiceChannelUsers.set(channelId, new Set());
      voiceChannelUsers.get(channelId)!.add(socket.id);

      // Tell existing users about new peer
      const existingPeers = Array.from(voiceChannelUsers.get(channelId)!).filter(s => s !== socket.id);
      socket.emit('voice_peers', {
        channelId,
        peers: existingPeers.map(s => ({
          socketId: s,
          userId: connectedUsers.get(s)?.userId,
          username: connectedUsers.get(s)?.username,
        }))
      });

      // Tell others that a new user joined
      socket.to(`voice:${channelId}`).emit('voice_user_joined', {
        socketId: socket.id,
        userId: user.userId,
        username: user.username,
        avatar_url: user.avatar_url,
        channelId,
      });

      // Broadcast voice channel members to server room
      broadcastVoiceMembers(io, channelId);
    });

    socket.on('leave_voice', () => {
      const user = connectedUsers.get(socket.id);
      if (user) leaveVoice(socket, user, io);
    });

    // WebRTC: offer, answer, ice-candidate relay
    socket.on('webrtc_offer', ({ to, offer }) => {
      io.to(to).emit('webrtc_offer', { from: socket.id, offer });
    });

    socket.on('webrtc_answer', ({ to, answer }) => {
      io.to(to).emit('webrtc_answer', { from: socket.id, answer });
    });

    socket.on('webrtc_ice_candidate', ({ to, candidate }) => {
      io.to(to).emit('webrtc_ice_candidate', { from: socket.id, candidate });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        if (user.voiceChannelId) leaveVoice(socket, user, io);
        await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.userId);
        connectedUsers.delete(socket.id);
      }
    });
  });
};

function leaveVoice(socket: Socket, user: ConnectedUser, io: Server) {
  const channelId = user.voiceChannelId!;
  socket.leave(`voice:${channelId}`);
  voiceChannelUsers.get(channelId)?.delete(socket.id);
  user.voiceChannelId = undefined;

  socket.to(`voice:${channelId}`).emit('voice_user_left', {
    socketId: socket.id, userId: user.userId, channelId,
  });
  broadcastVoiceMembers(io, channelId);
}

function broadcastVoiceMembers(io: Server, channelId: string) {
  const members = Array.from(voiceChannelUsers.get(channelId) || []).map(sid => ({
    socketId: sid,
    userId: connectedUsers.get(sid)?.userId,
    username: connectedUsers.get(sid)?.username,
    avatar_url: connectedUsers.get(sid)?.avatar_url,
  }));
  io.to(`voice:${channelId}`).emit('voice_channel_members', { channelId, members });
}
