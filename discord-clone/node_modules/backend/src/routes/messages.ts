import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware as any);

// Get messages with pagination
router.get('/:channelId', async (req: AuthRequest, res) => {
  const { channelId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string;

  let query = supabase
    .from('messages')
    .select('*, profiles(id, username, avatar_url, discriminator)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).reverse());
});

// Search messages
router.get('/:channelId/search', async (req: AuthRequest, res) => {
  const { channelId } = req.params;
  const { q } = req.query;

  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles(id, username, avatar_url, discriminator)')
    .eq('channel_id', channelId)
    .ilike('content', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

export default router;
