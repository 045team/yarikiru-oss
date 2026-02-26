import type { ReactNode } from 'react'

/**
 * Local-First OSS Auth Stub
 * クラウド認証なし。常に local-oss-user として扱う。
 */
const USER = { id: 'local-oss-user', email: 'local@example.com' } as const

export const auth = () => ({ userId: USER.id })
export const currentUser = async () => ({ id: USER.id, emailAddresses: [{ emailAddress: USER.email }] })
export const useAuth = () => ({ isLoaded: true, isSignedIn: true, userId: USER.id, signOut: async () => {} })
export const useUser = () => ({ isLoaded: true, isSignedIn: true, user: { id: USER.id, primaryEmailAddress: { emailAddress: USER.email } } })
export const LocalAuthProvider = ({ children }: { children: ReactNode }) => children
export const SignOutButton = ({ children }: { children?: ReactNode }) => children ?? null
export const localProxy = (handler?: (auth: typeof auth, req: unknown) => unknown) =>
  (req?: unknown) => (handler ? handler(auth, req) : undefined)
