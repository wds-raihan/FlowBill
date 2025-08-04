import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'sonner';

interface Modal {
  id: string;
  isOpen: boolean;
  data?: any;
}

interface UIState {
  // Loading states
  isGlobalLoading: boolean;
  loadingStates: Record<string, boolean>;
  
  // Modals
  modals: Record<string, Modal>;
  
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Mobile
  isMobile: boolean;
  
  // Actions
  setGlobalLoading: (loading: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  
  // Modal actions
  openModal: (id: string, data?: any) => void;
  closeModal: (id: string) => void;
  isModalOpen: (id: string) => boolean;
  getModalData: (id: string) => any;
  
  // Sidebar actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Theme actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Mobile actions
  setIsMobile: (isMobile: boolean) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isGlobalLoading: false,
      loadingStates: {},
      modals: {},
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'system',
      isMobile: false,

      // Loading actions
      setGlobalLoading: (loading) =>
        set({ isGlobalLoading: loading }, false, 'setGlobalLoading'),

      setLoading: (key, loading) =>
        set(
          (state) => ({
            loadingStates: {
              ...state.loadingStates,
              [key]: loading,
            },
          }),
          false,
          'setLoading'
        ),

      isLoading: (key) => {
        const state = get();
        return state.loadingStates[key] || false;
      },

      // Modal actions
      openModal: (id, data) =>
        set(
          (state) => ({
            modals: {
              ...state.modals,
              [id]: { id, isOpen: true, data },
            },
          }),
          false,
          'openModal'
        ),

      closeModal: (id) =>
        set(
          (state) => ({
            modals: {
              ...state.modals,
              [id]: { ...state.modals[id], isOpen: false },
            },
          }),
          false,
          'closeModal'
        ),

      isModalOpen: (id) => {
        const state = get();
        return state.modals[id]?.isOpen || false;
      },

      getModalData: (id) => {
        const state = get();
        return state.modals[id]?.data;
      },

      // Sidebar actions
      toggleSidebar: () =>
        set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          false,
          'toggleSidebar'
        ),

      setSidebarOpen: (open) =>
        set({ sidebarOpen: open }, false, 'setSidebarOpen'),

      toggleSidebarCollapsed: () =>
        set(
          (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
          false,
          'toggleSidebarCollapsed'
        ),

      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed'),

      // Theme actions
      setTheme: (theme) =>
        set({ theme }, false, 'setTheme'),

      // Mobile actions
      setIsMobile: (isMobile) =>
        set({ isMobile }, false, 'setIsMobile'),
    }),
    {
      name: 'ui-store',
    }
  )
);

// Convenience hooks for common UI patterns
export const useModal = (id: string) => {
  const { openModal, closeModal, isModalOpen, getModalData } = useUIStore();
  
  return {
    isOpen: isModalOpen(id),
    data: getModalData(id),
    open: (data?: any) => openModal(id, data),
    close: () => closeModal(id),
  };
};

// Updated notification hook using Sonner
export const useNotifications = () => {
  return {
    notify: {
      success: (title: string, message?: string) => {
        if (message) {
          toast.success(title, { description: message });
        } else {
          toast.success(title);
        }
      },
      error: (title: string, message?: string) => {
        if (message) {
          toast.error(title, { description: message });
        } else {
          toast.error(title);
        }
      },
      warning: (title: string, message?: string) => {
        if (message) {
          toast.warning(title, { description: message });
        } else {
          toast.warning(title);
        }
      },
      info: (title: string, message?: string) => {
        if (message) {
          toast.info(title, { description: message });
        } else {
          toast.info(title);
        }
      },
      promise: <T,>(
        promise: Promise<T>,
        {
          loading,
          success,
          error,
        }: {
          loading: string;
          success: string | ((data: T) => string);
          error: string | ((error: any) => string);
        }
      ) => {
        return toast.promise(promise, {
          loading,
          success,
          error,
        });
      },
    },
    dismiss: (id?: string | number) => toast.dismiss(id),
  };
};

export const useLoading = (key?: string) => {
  const { setLoading, isLoading, setGlobalLoading, isGlobalLoading } = useUIStore();
  
  if (!key) {
    return {
      isLoading: isGlobalLoading,
      setLoading: setGlobalLoading,
    };
  }
  
  return {
    isLoading: isLoading(key),
    setLoading: (loading: boolean) => setLoading(key, loading),
  };
};