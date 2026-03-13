'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/store/cart-store'

export function Header() {
  const itemCount = useCartStore((state) => state.getItemCount())

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl">
        <div className="flex h-16 items-center justify-between px-4 md:h-18 md:px-6 lg:h-20">
          <Link href="/" className="group flex flex-col items-start">
            <span className="font-sans text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-foreground/80 md:text-2xl lg:text-3xl">
              The Secret Boutique
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground md:text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              Lifestyle & Wellness
            </span>
          </Link>
          
          <Button 
            variant="ghost" 
            size="icon" 
            asChild 
            className="relative size-11 rounded-full transition-colors hover:bg-accent/60 lg:size-12"
          >
            <Link href="/cart" aria-label="Ver carrinho">
              <ShoppingBag className="size-5 lg:size-6" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background ring-2 ring-background lg:size-6 lg:text-xs">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
