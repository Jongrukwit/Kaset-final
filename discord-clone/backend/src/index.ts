import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSocket } from './socket/socketHandler';
import authRoutes from './routes/auth';
import serverRoutes from './routes/servers';
import channelRoutes from './routes/channels';
import messageRoutes from './routes/messages';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Socket.io setup
setupSocket(io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export { io };
