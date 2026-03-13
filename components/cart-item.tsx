'use client'

import Image from 'next/image'
import { Plus, Minus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore, CartItem as CartItemType } from '@/lib/store/cart-store'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-3">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        <Image
          src={item.product.image || "/placeholder.svg"}
          alt={item.product.name}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>
      
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="line-clamp-1 text-sm font-medium text-foreground">
            {item.product.name}
          </h3>
          <p className="text-sm font-semibold text-foreground">
            {formatPrice(item.product.price)}
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-lg bg-secondary p-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
              aria-label="Diminuir quantidade"
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
              aria-label="Aumentar quantidade"
            >
              <Plus className="size-3" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeItem(item.product.id)}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Remover item"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
