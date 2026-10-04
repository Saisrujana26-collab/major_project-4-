import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'teacher' | 'student';
    name: string;
    rollNo: string;
    systemNo: number;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as AuthRequest['user'];
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireTeacher = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'teacher') {
    res.status(403).json({ error: 'Teacher access required' });
    return;
  }
  next();
};

export const requireStudent = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'student') {
    res.status(403).json({ error: 'Student access required' });
    return;
  }
  next();
};
