export interface User {
  id: string;
  email?: string;
  username: string;
  discriminator?: string;
  avatar_url?: string;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  role?: string;
}

export interface Server {
  id: string;
  name: string;
  icon_url?: string;
  description?: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  channels?: Channel[];
  members?: User[];
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: 'text' | 'voice';
  position: number;
  category?: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  edited_at?: string;
  reply_to_id?: string;
  profiles?: User;
}

export interface VoiceUser {
  socketId: string;
  userId: string;
  username: string;
  avatar_url?: string;
  muted?: boolean;
  deafened?: boolean;
}
