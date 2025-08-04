import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  dateFormat: string;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  autoSave: boolean;
  defaultDueDays: number;
  defaultTax: number;
  compactView: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  orgId: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface UserState {
  // User data
  profile: UserProfile | null;
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
  
  // Computed
  isAuthenticated: () => boolean;
  getDisplayName: () => string;
  getInitials: () => string;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  currency: 'USD',
  dateFormat: 'MM/dd/yyyy',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  language: 'en',
  emailNotifications: true,
  autoSave: true,
  defaultDueDays: 30,
  defaultTax: 0,
  compactView: false,
};

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        profile: null,
        preferences: defaultPreferences,
        isLoading: false,
        error: null,

        // Actions
        setProfile: (profile) =>
          set(
            { profile, error: null },
            false,
            'setProfile'
          ),

        updateProfile: (updates) =>
          set(
            (state) => ({
              profile: state.profile ? { ...state.profile, ...updates } : null,
            }),
            false,
            'updateProfile'
          ),

        updatePreferences: (updates) =>
          set(
            (state) => ({
              preferences: { ...state.preferences, ...updates },
            }),
            false,
            'updatePreferences'
          ),

        setLoading: (loading) =>
          set({ isLoading: loading }, false, 'setLoading'),

        setError: (error) =>
          set({ error }, false, 'setError'),

        clearUser: () =>
          set(
            {
              profile: null,
              error: null,
              isLoading: false,
            },
            false,
            'clearUser'
          ),

        // Computed methods
        isAuthenticated: () => {
          const state = get();
          return !!state.profile;
        },

        getDisplayName: () => {
          const state = get();
          return state.profile?.name || state.profile?.email || 'User';
        },

        getInitials: () => {
          const state = get();
          const name = state.profile?.name || state.profile?.email || 'U';
          return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        },
      }),
      {
        name: 'user-storage',
        partialize: (state) => ({
          preferences: state.preferences,
          // Don't persist profile for security - it should come from session
        }),
      }
    ),
    {
      name: 'user-store',
    }
  )
);

// Selectors for common use cases
export const useUserSelectors = () => {
  const store = useUserStore();
  
  return {
    ...store,
    isFirstTimeUser: !store.profile?.lastLoginAt,
    shouldShowOnboarding: !store.profile?.orgId,
    formattedLastLogin: store.profile?.lastLoginAt 
      ? new Date(store.profile.lastLoginAt).toLocaleDateString(
          store.preferences.language,
          { 
            dateStyle: 'medium',
            timeStyle: 'short'
          }
        )
      : null,
  };
};