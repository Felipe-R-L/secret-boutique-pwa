'use client'

import React from "react"
import Image from 'next/image'
import { Plus, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore, Product } from '@/lib/store/cart-store'

interface ProductCardProps {
  product: Product
  onSelect: (product: Product) => void
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addItem(product)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  return (
    <article
      onClick={() => onSelect(product)}
      className="group cursor-pointer overflow-hidden rounded-2xl bg-card ring-1 ring-border/50 transition-all duration-300 hover:ring-border hover:shadow-xl hover:shadow-foreground/5"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <Image
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Quick add button */}
        <Button
          variant="secondary"
          size="icon"
          onClick={handleAddToCart}
          className="absolute bottom-3 right-3 size-10 rounded-full bg-background/95 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-background hover:scale-110 group-hover:opacity-100 lg:size-11"
          aria-label={`Adicionar ${product.name} ao carrinho`}
        >
          <Plus className="size-5" />
        </Button>

        {/* In stock badge */}
        {product.inStock && (
          <div className="absolute left-3 top-3 rounded-full bg-green-600/90 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            Em estoque
          </div>
        )}
      </div>
      
      <div className="p-4 lg:p-5">
        {/* Rating */}
        {product.rating && (
          <div className="mb-2 flex items-center gap-1.5">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-foreground">{product.rating}</span>
            {product.reviews && (
              <span className="text-xs text-muted-foreground">({product.reviews})</span>
            )}
          </div>
        )}
        
        {/* Product name */}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-foreground/80 lg:text-base" style={{ fontFamily: 'Inter, sans-serif' }}>
          {product.name}
        </h3>
        
        {/* Price */}
        <div className="mt-2.5 flex items-baseline gap-1">
          <span className="font-sans text-lg font-semibold text-foreground lg:text-xl">
            {formatPrice(product.price)}
          </span>
        </div>
      </div>
    </article>
  )
}
