export type UserRole = 'ADMIN' | 'OPERATIONS' | 'SALES';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    user: User;
  };
}

export interface MeResponse {
  success: boolean;
  data?: {
    user: User;
  };
}
