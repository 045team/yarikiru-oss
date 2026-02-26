'use client'

import type { AuthBindings } from '@refinedev/core'
import { useAuth, useUser } from '@/lib/auth-stub'
import { useSignIn } from '@/lib/auth-stub'

/**
 * Custom hook to create Clerk Auth Provider for Refine
 *
 * Integrates Clerk authentication with Refine's AuthProvider interface.
 * Provides login, logout, identity verification, and error handling.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { Refine } from '@refinedev/core'
 * import { useClerkAuth } from '@/lib/clerk-auth'
 *
 * export default function App() {
 *   const authProvider = useClerkAuth()
 *
 *   return (
 *     <Refine
 *       authProvider={authProvider}
 *       // ... other props
 *     />
 *   )
 * }
 * ```
 */
export function useClerkAuth(): AuthBindings {
  const auth = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const { signIn } = useSignIn()

  return {
    login: async ({ email, password }) => {
      try {
        if (!auth.isLoaded) {
          return {
            success: false,
            error: {
              name: 'AuthNotReady',
              message: 'Authentication is not ready yet. Please try again.',
            }
          }
        }

        // Note: Clerk primarily handles sign-in through their UI components
        // This programmatic sign-in is a fallback for custom implementations
        if (!signIn) {
          return {
            success: false,
            error: {
              name: 'NotImplemented',
              message: 'Please use the Clerk SignIn component for authentication.',
            }
          }
        }

        const result = await signIn.create({
          identifier: email,
          password,
        })

        if (result.status === 'complete') {
          return {
            success: true,
          }
        }

        return {
          success: false,
          error: {
            name: 'SignInError',
            message: result.status || 'Sign in failed',
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            name: error.name || 'SignInError',
            message: error.message || 'Failed to sign in',
          }
        }
      }
    },

    logout: async () => {
      try {
        await auth.signOut()
        return {
          success: true,
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            name: error.name || 'SignOutError',
            message: error.message || 'Failed to sign out',
          }
        }
      }
    },

    check: async () => {
      if (!auth.isLoaded) {
        return {
          authenticated: false,
        }
      }

      if (auth.isSignedIn) {
        return {
          authenticated: true,
        }
      }

      return {
        authenticated: false,
        logout: true,
        redirectTo: '/login',
      }
    },

    getIdentity: async () => {
      if (!auth.isLoaded || !auth.isSignedIn || !userLoaded || !user) {
        return null
      }

      return {
        id: auth.userId || '',
        email: user.emailAddresses[0]?.emailAddress || '',
        name: user.fullName || user.firstName || user.username || '',
        avatarUrl: user.imageUrl,
      }
    },

    onError: async (error) => {
      console.error('[Clerk Auth Error]:', error)

      // Clerk errors are handled by Clerk components
      // This is for additional custom error handling
      if (error?.status === 401 || error?.status === 403) {
        return {
          logout: true,
          redirectTo: '/login',
        }
      }

      return {}
    },

    // Optional: Implement permissions if you have role-based access
    getPermissions: async () => {
      // Clerk doesn't have built-in role management
      // You can use Clerk's publicMetadata or custom claims
      // Example:
      // if (user?.publicMetadata?.role) {
      //   return user.publicMetadata.role
      // }
      return undefined
    },
  }
}

/**
 * Server-side auth check for API routes and server components
 *
 * Use this in server components and API routes to verify authentication.
 *
 * @example
 * ```tsx
 * import { getAuth } from '@/lib/auth-stub'
 * import { clerkAuthCheck } from '@/lib/clerk-auth'
 *
 * export async function GET() {
 *   const { userId } = await getAuth()
 *   const authCheck = await clerkAuthCheck(userId)
 *
 *   if (!authCheck.authenticated) {
 *     return new Response('Unauthorized', { status: 401 })
 *   }
 *
 *   // ... proceed with authenticated request
 * }
 * ```
 */
export async function clerkAuthCheck(userId: string | null): Promise<{
  authenticated: boolean
  userId?: string
}> {
  if (!userId) {
    return {
      authenticated: false,
    }
  }

  return {
    authenticated: true,
    userId,
  }
}
