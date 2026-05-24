import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
      autoConnect: false,
      withCredentials: true,
    });
  }
  return socket;
};

export const connectSocket = (token: string) => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.emit('authenticate', { token });
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};
