import { UserRole } from '@prisma/client';

// JWT Payload stored inside the token
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// Safe user object returned to clients (no passwordHash)
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
