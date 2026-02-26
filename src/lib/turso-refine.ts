// ============================================
// Refine Data Provider for Turso
// Temporarily disabled for YARIKIRU build
// ============================================

import type { DataProvider } from '@refinedev/core'

export const dataProvider: DataProvider = {
  getApiUrl: () => '',
  getList: async () => ({ data: [], total: 0 }),
  getOne: async () => ({ data: {} as any }),
  create: async () => ({ data: {} as any }),
  update: async () => ({ data: {} as any }),
  deleteOne: async () => ({ data: {} as any }),
  getMany: async () => ({ data: [] }),
  updateMany: async () => ({ data: [] }),
  deleteMany: async () => ({ data: [] }),
  custom: async () => ({ data: {} as any }),
}
