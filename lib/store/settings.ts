import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppearanceSettings {
  fontSize: 'sm' | 'base' | 'lg'
  compactMode: boolean
}

interface NotificationSettings {
  desktop: boolean
  sound: boolean
  mentions: boolean
  email: boolean
}

interface SettingsState {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  appearance: AppearanceSettings
  notifications: NotificationSettings
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setFontSize: (size: number) => void
  setAppearance: (settings: Partial<AppearanceSettings>) => void
  setNotifications: (settings: Partial<NotificationSettings>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      fontSize: 16,
      appearance: {
        fontSize: 'base',
        compactMode: false
      },
      notifications: {
        desktop: true,
        sound: true,
        mentions: true,
        email: false
      },
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setAppearance: (settings) => set((state) => ({
        appearance: { ...state.appearance, ...settings }
      })),
      setNotifications: (settings) => set((state) => ({
        notifications: { ...state.notifications, ...settings }
      }))
    }),
    {
      name: 'settings-storage',
    }
  )
) 