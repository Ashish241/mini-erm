import { Request, Response } from 'express';
import { loginSchema } from './auth.schema';
import { loginUser, getUserById } from './auth.service';

export async function login(req: Request, res: Response): Promise<void> {
  // Validate request body with Zod
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = result.data;

  try {
    const { token, user } = await loginUser(email, password);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { token, user },
    });
  } catch (error) {
    // Deliberate generic message to prevent email enumeration
    res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  // req.user is set by authenticate middleware
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.status(200).json({ success: true, data: { user } });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}
