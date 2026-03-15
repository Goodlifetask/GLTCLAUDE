export type UserPlan = 'free' | 'pro' | 'team' | 'family';

export type AuthProvider = 'email' | 'google' | 'apple' | 'microsoft';

export type Theme = 'warm_corporate' | 'blue_spectrum' | 'india' | 'usa';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  plan: UserPlan;
  authProvider: AuthProvider;
  locale: string;
  timezone: string;
  theme: Theme;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  profileCategory:  string | null;
  profileSubType:   string | null;
  taskPreferences:  string[];
}

export interface UserProfile extends User {
  reminderCount: number;
  completedCount: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds (900 = 15 min)
}

export interface JWTPayload {
  sub: string;      // user UUID
  email: string;
  plan: UserPlan;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}
