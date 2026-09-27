import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminUser } from '../lib/api'

interface AuthStore {
  user: AdminUser | null
  token: string | null
  setAuth: (user: AdminUser, token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('admin_token', token)
        localStorage.setItem('admin_user', JSON.stringify(user))
        set({ user, token })
      },
      logout: () => {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        set({ user: null, token: null })
      },
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'admin-auth',
    }
  )
)
