import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthUser {
  id:       string;
  email:    string;
  name:     string;
  avatarUrl: string | null;
  plan:     'free' | 'pro' | 'team';
  theme:    string;
  locale:   string;
  timezone: string;
}

interface AuthState {
  user:        AuthUser | null;
  accessToken: string | null;
  isLoading:   boolean;

  setUser:        (user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  setLoading:     (loading: boolean) => void;
  logout:         () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:        null,
      accessToken: null,  // stored in memory only — not persisted to localStorage
      isLoading:   true,

      setUser:        (user)    => set({ user }),
      setAccessToken: (token)   => set({ accessToken: token }),
      setLoading:     (loading) => set({ isLoading: loading }),

      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'glt-auth',
      storage: createJSONStorage(() => sessionStorage), // session only
      partialize: (state) => ({ user: state.user }), // never persist access token
    },
  ),
);
