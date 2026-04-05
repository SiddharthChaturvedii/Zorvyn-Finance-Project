import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      
      setAuth: (user, accessToken, refreshToken) => 
        set({ user, accessToken, refreshToken }),
        
      logout: () => 
        set({ user: null, accessToken: null, refreshToken: null }),
        
      isAuthenticated: () => 
        !!get().accessToken,
    }),
    {
      name: 'zorvyn-auth-storage', // saves perfectly to purely local browser storage
    }
  )
);
