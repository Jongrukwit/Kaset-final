import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware as any);

router.get('/:id', async (req: AuthRequest, res) => {
  const { data, error } = await supabase.from('channels').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

export default router;
