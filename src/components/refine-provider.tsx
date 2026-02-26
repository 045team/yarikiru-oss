'use client'

import { Refine } from '@refinedev/core'
import { useClerkAuth } from '@/lib/clerk-auth'
import { dataProvider } from '@/lib/turso-refine'

/**
 * Refine Provider Component
 *
 * Wraps the application with Refine's core functionality.
 * Integrates authentication and data providers.
 */
export function RefineProvider({ children }: { children: React.ReactNode }) {
  const authProvider = useClerkAuth()

  return (
    <Refine
      dataProvider={dataProvider}
      authProvider={authProvider}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        useNewQueryKeys: true,
        projectId: 'YARIKIRU-Web',
      }}
    >
      {children}
    </Refine>
  )
}
