"use client";

import { useState, useMemo, useEffect } from "react";
import { ProductCard } from "@/components/product-card";
import { FilterPills } from "@/components/filter-pills";
import { ProductDrawer } from "@/components/product-drawer";
import { ProductModal } from "@/components/product-modal";
import { HeroSection } from "@/components/hero-section";
import { Category } from "@/lib/data/products";
import { Product } from "@/lib/store/cart-store";

interface CatalogProps {
  products: Product[];
  featuredProducts: Product[];
  heroTitle: string;
  heroSubtitle: string;
  stats: {
    completedOrdersCount: number;
    averageRating: number | null;
    totalReviews: number;
  };
}

export function Catalog({
  products,
  featuredProducts,
  heroTitle,
  heroSubtitle,
  stats,
}: CatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((product) => product.category === selectedCategory);
  }, [selectedCategory]);

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];

    return products
      .filter(
        (product) =>
          product.id !== selectedProduct.id &&
          product.category === selectedProduct.category,
      )
      .slice(0, 4);
  }, [products, selectedProduct]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    if (isDesktop) {
      setModalOpen(true);
    } else {
      setDrawerOpen(true);
    }
  };

  const handleRelatedProductSelect = (product: Product) => {
    setSelectedProduct(product);
  };

  return (
    <>
      {/* Hero Section */}
      <HeroSection
        onProductSelect={handleProductSelect}
        featuredProducts={featuredProducts}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        stats={stats}
      />

      {/* Decorative wave divider */}
      <div className="relative h-16 overflow-hidden md:h-24">
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 40C240 10 480 70 720 40C960 10 1200 70 1440 40V80H0V40Z" fill="var(--pastel-rose)" fillOpacity="0.15" />
          <path d="M0 50C200 20 400 70 600 45C800 20 1000 70 1200 45C1400 20 1440 50 1440 50V80H0V50Z" fill="var(--pastel-lavender)" fillOpacity="0.12" />
        </svg>
      </div>

      {/* Catalog Section */}
      <section
        id="catalog"
        className="relative px-4 py-12 md:px-8 md:py-16 lg:px-12 lg:py-20 xl:px-16"
      >
        {/* Decorative side elements */}
        <div className="pointer-events-none absolute left-0 top-20 hidden xl:block">
          <div className="size-3 rounded-full bg-pastel-rose/40" />
          <div className="ml-4 mt-6 size-5 rounded-full bg-pastel-lavender/30" />
          <div className="ml-1 mt-8 size-2 rounded-full bg-pastel-sage/40" />
          <div className="ml-6 mt-4 size-4 rounded-full bg-pastel-peach/35" />
        </div>
        <div className="pointer-events-none absolute right-2 top-40 hidden xl:block">
          <div className="size-4 rounded-full bg-pastel-lavender/35" />
          <div className="ml-3 mt-5 size-2 rounded-full bg-pastel-rose/40" />
          <div className="-ml-2 mt-7 size-6 rounded-full bg-pastel-peach/25" />
          <div className="ml-2 mt-4 size-3 rounded-full bg-pastel-sage/35" />
        </div>

        {/* Subtle background gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-pastel-lavender/5 to-transparent" />

        <div className="mx-auto max-w-[1600px]">
          <div className="mb-8 space-y-4 md:mb-12">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <h2 className="font-sans text-2xl font-semibold tracking-tight text-foreground md:text-3xl lg:text-4xl">
                  Nossos Produtos
                </h2>
                <p
                  className="max-w-md text-muted-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Explore nossa coleção cuidadosamente selecionada de produtos
                  premium.
                </p>
              </div>
              <span
                className="rounded-full bg-pastel-sage/20 px-3 py-1 text-sm text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "produto" : "produtos"}
              </span>
            </div>

            <FilterPills
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 xl:gap-6 2xl:grid-cols-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={handleProductSelect}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 size-16 rounded-full bg-pastel-lavender/20" />
              <p className="text-lg font-medium text-foreground">
                Nenhum produto encontrado
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tente selecionar outra categoria.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Mobile Drawer */}
      <ProductDrawer
        product={selectedProduct}
        open={drawerOpen && !isDesktop}
        onOpenChange={setDrawerOpen}
      />

      {/* Desktop Modal */}
      <ProductModal
        product={selectedProduct}
        relatedProducts={relatedProducts}
        open={modalOpen && isDesktop}
        onOpenChange={setModalOpen}
        onRelatedProductSelect={handleRelatedProductSelect}
      />
    </>
  );
}
