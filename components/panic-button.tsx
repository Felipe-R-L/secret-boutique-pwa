'use client'

import { EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PanicButton() {
  const handlePanic = () => {
    window.location.href = 'https://google.com'
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handlePanic}
      className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm hover:bg-muted"
      aria-label="Sair rapidamente"
    >
      <EyeOff className="size-5" />
    </Button>
  )
}
