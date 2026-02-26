'use client'

import { Button } from '@/components/ui/button'

export function ReloadButton() {
  return (
    <Button
      onClick={() => window.location.reload()}
      className="w-full"
    >
      接続を再試行
    </Button>
  )
}
