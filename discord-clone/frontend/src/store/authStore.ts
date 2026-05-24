import { create } from 'zustand';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,

  loadSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      const user: User = {
        id: session.user.id,
        email: session.user.email,
        username: profile?.username || session.user.email!,
        discriminator: profile?.discriminator,
        avatar_url: profile?.avatar_url,
        status: profile?.status || 'online',
      };
      localStorage.setItem('discord_token', session.access_token);
      set({ user, token: session.access_token, loading: false });
      connectSocket(session.access_token);
    } else {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    const user: User = {
      id: data.user.id,
      email: data.user.email,
      username: profile?.username || data.user.email!,
      discriminator: profile?.discriminator,
      avatar_url: profile?.avatar_url,
      status: 'online',
    };
    localStorage.setItem('discord_token', data.session.access_token);
    set({ user, token: data.session.access_token });
    connectSocket(data.session.access_token);
  },

  register: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username,
        discriminator: Math.floor(1000 + Math.random() * 9000).toString(),
        status: 'online',
      });
    }
    // Auto-login after register
    if (data.session) {
      localStorage.setItem('discord_token', data.session.access_token);
      set({ user: { id: data.user!.id, email, username }, token: data.session.access_token });
      connectSocket(data.session.access_token);
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('discord_token');
    disconnectSocket();
    set({ user: null, token: null });
  },
}));
