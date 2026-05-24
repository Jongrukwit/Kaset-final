import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; username: string; avatar_url?: string };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  req.user = { id: user.id, email: user.email!, username: profile?.username || user.email!, avatar_url: profile?.avatar_url };
  next();
};
