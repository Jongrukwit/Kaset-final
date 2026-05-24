import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authMiddleware as any);

// Get all servers user is member of
router.get('/', async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('server_members')
    .select('servers(*)')
    .eq('user_id', req.user!.id);

  if (error) return res.status(500).json({ error: error.message });
  const servers = data?.map((m: any) => m.servers).filter(Boolean) || [];
  res.json(servers);
});

// Get server details with channels and members
router.get('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;

  const { data: server } = await supabase.from('servers').select('*').eq('id', id).single();
  if (!server) return res.status(404).json({ error: 'Not found' });

  const { data: channels } = await supabase.from('channels').select('*').eq('server_id', id).order('position');
  const { data: members } = await supabase
    .from('server_members')
    .select('profiles(*), role, joined_at')
    .eq('server_id', id);

  res.json({ ...server, channels: channels || [], members: members?.map((m: any) => ({ ...m.profiles, role: m.role })) || [] });
});

// Create server
router.post('/', async (req: AuthRequest, res) => {
  const { name, icon_url } = req.body;
  const inviteCode = uuidv4().split('-')[0].toUpperCase();

  const { data: server, error } = await supabase.from('servers').insert({
    name, icon_url, owner_id: req.user!.id, invite_code: inviteCode,
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  // Add owner as member
  await supabase.from('server_members').insert({ server_id: server.id, user_id: req.user!.id, role: 'owner' });

  // Create default channels
  await supabase.from('channels').insert([
    { server_id: server.id, name: 'general', type: 'text', position: 0, category: 'TEXT CHANNELS' },
    { server_id: server.id, name: 'General', type: 'voice', position: 1, category: 'VOICE CHANNELS' },
  ]);

  res.json(server);
});

// Join server via invite code
router.post('/join', async (req: AuthRequest, res) => {
  const { invite_code } = req.body;

  const { data: server } = await supabase.from('servers').select('*').eq('invite_code', invite_code).single();
  if (!server) return res.status(404).json({ error: 'Invalid invite code' });

  const { data: existing } = await supabase
    .from('server_members')
    .select('id')
    .eq('server_id', server.id)
    .eq('user_id', req.user!.id)
    .single();

  if (existing) return res.status(400).json({ error: 'Already a member' });

  const { data: memberCount } = await supabase
    .from('server_members')
    .select('id', { count: 'exact' })
    .eq('server_id', server.id);

  await supabase.from('server_members').insert({ server_id: server.id, user_id: req.user!.id, role: 'member' });

  res.json({ server, member_count: (memberCount?.length || 0) + 1 });
});

// Get server preview (for invite)
router.get('/invite/:code', async (req, res) => {
  const { code } = req.params;
  const { data: server } = await supabase
    .from('servers')
    .select('id, name, icon_url, description')
    .eq('invite_code', code)
    .single();

  if (!server) return res.status(404).json({ error: 'Invalid invite' });

  const { count } = await supabase
    .from('server_members')
    .select('*', { count: 'exact', head: true })
    .eq('server_id', server.id);

  res.json({ ...server, member_count: count || 0 });
});

export default router;
