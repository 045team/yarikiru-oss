'use client'

import type { AuthBindings } from '@refinedev/core'
import { useAuth, useUser } from '@/lib/auth-stub'

/** Local-First OSS の Refine AuthProvider。常に認証済み扱い。 */
export function useLocalAuth(): AuthBindings {
  const auth = useAuth()
  const { user } = useUser()

  return {
    login: async () => ({
      success: false,
      error: { name: 'NotImplemented', message: 'Local OSS: sign-in not used' },
    }),
    logout: async () => {
      await auth.signOut()
      return { success: true }
    },
    check: async () => ({ authenticated: auth.isSignedIn }),
    getIdentity: async () =>
      auth.isSignedIn && user
        ? {
            id: auth.userId ?? '',
            email: user.primaryEmailAddress?.emailAddress ?? '',
            name: user.fullName ?? user.firstName ?? user.username ?? '',
            avatarUrl: user.imageUrl,
          }
        : null,
    onError: async (error) => {
      console.error('[Local Auth]', error)
      return (error?.status === 401 || error?.status === 403)
        ? { logout: true, redirectTo: '/login' }
        : {}
    },
    getPermissions: async () => undefined,
  }
}
