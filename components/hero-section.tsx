'use client'

import Image from 'next/image'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { products } from '@/lib/data/products'
import { Product } from '@/lib/store/cart-store'

interface HeroSectionProps {
  onProductSelect: (product: Product) => void
}

export function HeroSection({ onProductSelect }: HeroSectionProps) {
  const featuredProducts = products.filter(p => p.category === 'destaques').slice(0, 3)
  const heroProduct = featuredProducts[0]

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-background to-secondary/30" />
      
      <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          {/* Left content */}
          <div className="flex flex-col justify-center space-y-6 lg:space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/30 px-4 py-2 text-sm font-medium text-accent-foreground">
                <Sparkles className="size-4" />
                <span>Novidades da Semana</span>
              </div>
              
              <h1 className="font-sans text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl xl:text-6xl text-balance">
                Descubra o prazer do <span className="text-muted-foreground">autocuidado</span>
              </h1>
              
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg lg:text-xl" style={{ fontFamily: 'Inter, sans-serif' }}>
                Produtos premium selecionados para transformar seus momentos especiais em experiencias inesqueciveis.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button 
                size="lg" 
                className="group h-12 px-6 text-base md:h-14 md:px-8"
                onClick={() => {
                  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Explorar Catalogo
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-4 lg:gap-12">
              <div>
                <p className="font-sans text-2xl font-semibold text-foreground md:text-3xl">500+</p>
                <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Clientes Satisfeitos</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div>
                <p className="font-sans text-2xl font-semibold text-foreground md:text-3xl">4.9</p>
                <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Avaliacao Media</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div>
                <p className="font-sans text-2xl font-semibold text-foreground md:text-3xl">24h</p>
                <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Entrega Discreta</p>
              </div>
            </div>
          </div>

          {/* Right content - Featured product showcase */}
          <div className="relative">
            {/* Main featured product */}
            {heroProduct && (
              <div 
                onClick={() => onProductSelect(heroProduct)}
                className="group relative cursor-pointer overflow-hidden rounded-3xl bg-card shadow-2xl transition-all duration-500 hover:shadow-3xl"
              >
                <div className="relative aspect-[4/5] md:aspect-[3/4] lg:aspect-square">
                  <Image
                    src={heroProduct.image || "/placeholder.svg"}
                    alt={heroProduct.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
                </div>
                
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                  <span className="mb-2 inline-block rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                    Em destaque
                  </span>
                  <h3 className="font-sans text-xl font-semibold text-background md:text-2xl lg:text-3xl">
                    {heroProduct.name}
                  </h3>
                  <p className="mt-1 font-sans text-2xl font-bold text-background md:text-3xl">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(heroProduct.price)}
                  </p>
                </div>
              </div>
            )}

            {/* Floating product cards */}
            <div className="absolute -bottom-4 -left-4 hidden w-32 overflow-hidden rounded-2xl bg-card shadow-xl lg:block xl:-left-8 xl:w-40">
              {featuredProducts[1] && (
                <div 
                  onClick={() => onProductSelect(featuredProducts[1])}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={featuredProducts[1].image || "/placeholder.svg"}
                      alt={featuredProducts[1].name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="160px"
                    />
                  </div>
                  <div className="p-2 xl:p-3">
                    <p className="truncate text-xs font-medium text-foreground">{featuredProducts[1].name}</p>
                    <p className="font-sans text-sm font-semibold text-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(featuredProducts[1].price)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute -right-4 -top-4 hidden w-28 overflow-hidden rounded-2xl bg-card shadow-xl lg:block xl:-right-8 xl:w-36">
              {featuredProducts[2] && (
                <div 
                  onClick={() => onProductSelect(featuredProducts[2])}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={featuredProducts[2].image || "/placeholder.svg"}
                      alt={featuredProducts[2].name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="144px"
                    />
                  </div>
                  <div className="p-2 xl:p-3">
                    <p className="truncate text-xs font-medium text-foreground">{featuredProducts[2].name}</p>
                    <p className="font-sans text-sm font-semibold text-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(featuredProducts[2].price)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
