'use client'

import Image from 'next/image'
import { Plus, Minus, Star, Check, Truck, Shield, Package } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCartStore, Product } from '@/lib/store/cart-store'
import { getRelatedProducts } from '@/lib/data/products'

interface ProductModalProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRelatedProductSelect?: (product: Product) => void
}

export function ProductModal({ product, open, onOpenChange, onRelatedProductSelect }: ProductModalProps) {
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

  const relatedProducts = product ? getRelatedProducts(product.id, 4) : []

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0">
        <div className="grid gap-0 lg:grid-cols-2">
          {/* Image section */}
          <div className="relative aspect-square bg-muted lg:aspect-auto lg:min-h-[600px]">
            <Image
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            {product.inStock && (
              <Badge className="absolute left-4 top-4 bg-green-600 hover:bg-green-700">
                Em estoque
              </Badge>
            )}
          </div>

          {/* Content section */}
          <div className="flex flex-col p-6 lg:p-8">
            <DialogHeader className="space-y-4 text-left">
              <div className="flex items-center gap-2">
                {product.rating && (
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-amber-700">{product.rating}</span>
                    {product.reviews && (
                      <span className="text-sm text-amber-600">({product.reviews} avaliacoes)</span>
                    )}
                  </div>
                )}
              </div>
              
              <DialogTitle className="font-sans text-2xl font-semibold text-foreground lg:text-3xl">
                {product.name}
              </DialogTitle>
              
              <DialogDescription className="text-3xl font-bold text-foreground lg:text-4xl" style={{ fontFamily: 'Playfair Display, serif' }}>
                {formatPrice(product.price)}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="description" className="mt-6 flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="description">Descricao</TabsTrigger>
                <TabsTrigger value="specs">Especificacoes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="mt-4">
                <p className="leading-relaxed text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {product.description}
                </p>
                
                {/* Trust badges */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-secondary/50 p-4 text-center">
                    <Truck className="size-5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">Entrega Discreta</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-secondary/50 p-4 text-center">
                    <Shield className="size-5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">Compra Segura</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-secondary/50 p-4 text-center">
                    <Package className="size-5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">Embalagem Neutra</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="specs" className="mt-4">
                {product.specs ? (
                  <div className="space-y-3">
                    {Object.entries(product.specs).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-3">
                        <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                        <div>
                          <span className="font-medium capitalize text-foreground">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="ml-2 text-muted-foreground">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Especificacoes nao disponiveis.</p>
                )}
              </TabsContent>
            </Tabs>

            {/* Add to cart section */}
            <div className="mt-6 space-y-4 border-t border-border pt-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground">Quantidade:</span>
                <div className="flex items-center gap-3 rounded-lg bg-secondary p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="size-8"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    className="size-8"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
              
              <Button 
                className="h-14 w-full text-base font-semibold" 
                size="lg"
                onClick={handleAddToCart}
              >
                Adicionar ao Carrinho - {formatPrice(product.price * quantity)}
              </Button>
            </div>

            {/* Related products */}
            {relatedProducts.length > 0 && (
              <div className="mt-6 border-t border-border pt-6">
                <h4 className="mb-4 font-sans text-sm font-semibold text-foreground">
                  Produtos Relacionados
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {relatedProducts.map((related) => (
                    <button
                      key={related.id}
                      onClick={() => onRelatedProductSelect?.(related)}
                      className="group overflow-hidden rounded-lg bg-muted transition-all hover:ring-2 hover:ring-foreground/20"
                    >
                      <div className="relative aspect-square">
                        <Image
                          src={related.image || "/placeholder.svg"}
                          alt={related.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="100px"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
