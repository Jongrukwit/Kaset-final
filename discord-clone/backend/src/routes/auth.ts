import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password || !username) return res.status(400).json({ error: 'Missing fields' });

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });

  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      username,
      discriminator: Math.floor(1000 + Math.random() * 9000).toString(),
      avatar_url: null,
      status: 'online',
    });
  }

  res.json({ user: data.user, session: data.session });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data.user, session: data.session });
});

router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) await supabase.auth.admin.signOut(token);
  res.json({ success: true });
});

export default router;
