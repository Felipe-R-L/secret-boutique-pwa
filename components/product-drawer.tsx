'use client'

import Image from 'next/image'
import { Plus, Minus, Star, Truck, Shield, Package } from 'lucide-react'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore, Product } from '@/lib/store/cart-store'

interface ProductDrawerProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductDrawer({ product, open, onOpenChange }: ProductDrawerProps) {
  const [quantity, setQuantity] = useState(1)
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = () => {
    if (!product) return
    for (let i = 0; i < quantity; i++) {
      addItem(product)
    }
    setQuantity(1)
    onOpenChange(false)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  if (!product) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-0">
        <div className="flex h-full flex-col">
          {/* Drag indicator */}
          <div className="flex justify-center pb-2 pt-1">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* Image */}
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              <Image
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
              {product.inStock && (
                <Badge className="absolute left-4 top-4 bg-green-600 hover:bg-green-700">
                  Em estoque
                </Badge>
              )}
            </div>
            
            {/* Content */}
            <div className="space-y-5 px-5 py-6">
              {/* Rating */}
              {product.rating && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-amber-700">{product.rating}</span>
                  </div>
                  {product.reviews && (
                    <span className="text-sm text-muted-foreground">({product.reviews} avaliacoes)</span>
                  )}
                </div>
              )}
              
              <SheetHeader className="space-y-2 text-left">
                <SheetTitle className="font-sans text-2xl font-semibold leading-tight text-foreground">
                  {product.name}
                </SheetTitle>
                <SheetDescription className="font-sans text-3xl font-bold text-foreground">
                  {formatPrice(product.price)}
                </SheetDescription>
              </SheetHeader>
              
              <p className="leading-relaxed text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
                {product.description}
              </p>

              {/* Specs */}
              {product.specs && (
                <div className="space-y-3 rounded-xl bg-secondary/50 p-4">
                  <h4 className="text-sm font-semibold text-foreground">Especificacoes</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(product.specs).slice(0, 4).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-xs capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                        <p className="text-sm font-medium text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Trust badges */}
              <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-4">
                <div className="flex flex-col items-center gap-1">
                  <Truck className="size-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Discreto</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Shield className="size-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Seguro</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Package className="size-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Qualidade</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <SheetFooter className="flex-row items-center gap-4 border-t border-border bg-background px-5 py-4">
            <div className="flex items-center gap-3 rounded-xl bg-secondary p-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="size-9"
                aria-label="Diminuir quantidade"
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                className="size-9"
                aria-label="Aumentar quantidade"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            
            <Button 
              className="h-12 flex-1 text-base font-semibold" 
              size="lg"
              onClick={handleAddToCart}
            >
              Adicionar - {formatPrice(product.price * quantity)}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
