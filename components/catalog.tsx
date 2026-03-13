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
}

export function Catalog({
  products,
  featuredProducts,
  heroTitle,
  heroSubtitle,
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
      />

      {/* Catalog Section */}
      <section
        id="catalog"
        className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:py-20"
      >
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
                Explore nossa colecao cuidadosamente selecionada de produtos
                premium.
              </p>
            </div>
            <span
              className="text-sm text-muted-foreground"
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

        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:gap-6">
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
            <div className="mb-4 size-16 rounded-full bg-muted" />
            <p className="text-lg font-medium text-foreground">
              Nenhum produto encontrado
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tente selecionar outra categoria.
            </p>
          </div>
        )}
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
