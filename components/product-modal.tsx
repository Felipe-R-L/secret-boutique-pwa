"use client";

import Image from "next/image";
import {
  Plus,
  Minus,
  Star,
  Check,
  Truck,
  Shield,
  Package,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useCartStore, Product } from "@/lib/store/cart-store";
import { getPrimaryProductImage, getProductImages } from "@/lib/product-images";
import { ProductCuratorship } from "@/components/product-curatorship";
import { AnonymousReviews } from "@/components/anonymous-reviews";

interface ProductModalProps {
  product: Product | null;
  relatedProducts?: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRelatedProductSelect?: (product: Product) => void;
}

export function ProductModal({
  product,
  relatedProducts = [],
  open,
  onOpenChange,
  onRelatedProductSelect,
}: ProductModalProps) {
  const AUTO_PLAY_MS = 3500;
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [autoplayTick, setAutoplayTick] = useState(0);
  const [isHoveringCarousel, setIsHoveringCarousel] = useState(false);
  const [autoplayPausedUntil, setAutoplayPausedUntil] = useState(0);
  const [isInViewport, setIsInViewport] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isAutoplayManuallyPaused, setIsAutoplayManuallyPaused] =
    useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const carouselWrapperRef = useRef<HTMLDivElement | null>(null);
  const imageCount = product ? getProductImages(product).length : 0;

  const pauseAutoplay = (duration = AUTO_PLAY_MS) => {
    setAutoplayPausedUntil(Date.now() + duration);
    setAutoplayTick((tick) => tick + 1);
  };

  useEffect(() => {
    setQuantity(1);
    setActiveImageIndex(0);
    setAutoplayPausedUntil(0);
    setIsHoveringCarousel(false);
    setAutoplayTick(0);
    setIsAutoplayManuallyPaused(false);
    setIsInViewport(true);
  }, [product?.id]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open || !carouselWrapperRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );

    observer.observe(carouselWrapperRef.current);

    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!carouselApi) return;

    const handleSelect = () => {
      setActiveImageIndex(carouselApi.selectedScrollSnap());
      setAutoplayTick((tick) => tick + 1);
    };

    handleSelect();
    carouselApi.on("select", handleSelect);
    carouselApi.on("reInit", handleSelect);

    return () => {
      carouselApi.off("select", handleSelect);
      carouselApi.off("reInit", handleSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (
      !carouselApi ||
      !open ||
      imageCount <= 1 ||
      isHoveringCarousel ||
      !isInViewport ||
      prefersReducedMotion ||
      isAutoplayManuallyPaused
    ) {
      return;
    }

    const now = Date.now();

    if (autoplayPausedUntil > now) {
      const waitMs = autoplayPausedUntil - now;
      const resumeTimeoutId = window.setTimeout(() => {
        setAutoplayTick((tick) => tick + 1);
      }, waitMs);

      return () => window.clearTimeout(resumeTimeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      carouselApi.scrollNext();
    }, AUTO_PLAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    carouselApi,
    open,
    imageCount,
    isHoveringCarousel,
    isInViewport,
    prefersReducedMotion,
    isAutoplayManuallyPaused,
    autoplayPausedUntil,
    autoplayTick,
  ]);

  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    setQuantity(1);
    onOpenChange(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (!product) return null;

  const productImages = getProductImages(product);
  const autoplayIsPaused =
    isAutoplayManuallyPaused ||
    prefersReducedMotion ||
    isHoveringCarousel ||
    !isInViewport ||
    autoplayPausedUntil > Date.now();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(95vw,1280px)] max-w-none overflow-y-auto p-0 sm:max-w-[min(95vw,1280px)]!">
        <div className="grid gap-0 lg:grid-cols-2">
          {/* Image section */}
          <div className="space-y-3 bg-muted/40 p-4 lg:min-h-155 lg:p-6">
            <div
              ref={carouselWrapperRef}
              className="relative overflow-hidden rounded-2xl bg-muted"
            >
              <Carousel
                setApi={setCarouselApi}
                opts={{ loop: productImages.length > 1 }}
                className="w-full"
              >
                <CarouselContent className="ml-0">
                  {productImages.map((image, index) => (
                    <CarouselItem
                      key={`${product.id}-carousel-${index}`}
                      className="pl-0"
                    >
                      <div
                        className="relative aspect-square w-full"
                        onMouseEnter={() => setIsHoveringCarousel(true)}
                        onMouseLeave={() => {
                          setIsHoveringCarousel(false);
                          setAutoplayTick((tick) => tick + 1);
                        }}
                        onClick={() => pauseAutoplay()}
                      >
                        <Image
                          src={image}
                          alt={`${product.name} - imagem ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          priority={index === 0}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {productImages.length > 1 && (
                  <>
                    <CarouselPrevious
                      className="left-3 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background"
                      onClick={() => {
                        carouselApi?.scrollPrev();
                        pauseAutoplay(3000);
                      }}
                    />
                    <CarouselNext
                      className="right-3 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background"
                      onClick={() => {
                        carouselApi?.scrollNext();
                        pauseAutoplay(3000);
                      }}
                    />
                  </>
                )}
              </Carousel>

              {product.inStock && (
                <Badge className="absolute left-4 top-4 bg-green-600 hover:bg-green-700">
                  Em estoque
                </Badge>
              )}
            </div>

            {productImages.length > 1 && (
              <div className="flex items-center justify-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    disabled={prefersReducedMotion}
                    onClick={() => {
                      if (isAutoplayManuallyPaused) {
                        setIsAutoplayManuallyPaused(false);
                        setAutoplayPausedUntil(0);
                        setAutoplayTick((tick) => tick + 1);
                      } else {
                        setIsAutoplayManuallyPaused(true);
                      }
                    }}
                    className={`size-8 rounded-full bg-black/60 text-white hover:bg-black/75 disabled:opacity-50 ${
                      autoplayIsPaused
                        ? ""
                        : "animate-[pulse_2.4s_ease-in-out_infinite]"
                    }`}
                    aria-label={
                      autoplayIsPaused
                        ? "Reproduzir carrossel automaticamente"
                        : "Pausar carrossel automático"
                    }
                  >
                    {autoplayIsPaused ? (
                      <Play className="size-3.5 fill-white" />
                    ) : (
                      <Pause className="size-3.5 fill-white" />
                    )}
                  </Button>
                  <span
                    className={`ml-1 select-none text-xs font-semibold tracking-wide transition-colors ${
                      autoplayIsPaused
                        ? "text-muted-foreground"
                        : "text-bold-foreground"
                    }`}
                    aria-live="polite"
                  >
                    {autoplayIsPaused ? "PAUSADO" : "AUTO"}
                  </span>
                </div>

                {productImages.map((_, index) => (
                  <button
                    key={`${product.id}-dot-${index}`}
                    type="button"
                    onClick={() => {
                      carouselApi?.scrollTo(index);
                      pauseAutoplay();
                    }}
                    aria-label={`Ir para imagem ${index + 1}`}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeImageIndex
                        ? "w-6 bg-foreground"
                        : "w-2.5 bg-foreground/35 hover:bg-foreground/60"
                    }`}
                  />
                ))}
              </div>
            )}

            {productImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
                {productImages.map((image, index) => (
                  <button
                    key={`${product.id}-image-${index}`}
                    type="button"
                    onClick={() => {
                      setActiveImageIndex(index);
                      carouselApi?.scrollTo(index);
                      pauseAutoplay();
                    }}
                    className="relative aspect-square overflow-hidden rounded-lg ring-2 transition-all"
                    aria-label={`Ver imagem ${index + 1} de ${product.name}`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} miniatura ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                    <span
                      className={`absolute inset-0 ${
                        index === activeImageIndex
                          ? "ring-2 ring-foreground/60"
                          : "bg-black/20"
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content section */}
          <div className="flex flex-col p-6 lg:p-8">
            <DialogHeader className="space-y-4 text-left">
              <div className="flex items-center gap-2">
                {product.rating && (
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-amber-700">
                      {product.rating}
                    </span>
                    {product.reviews && (
                      <span className="text-sm text-amber-600">
                        ({product.reviews} avaliações)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <DialogTitle className="font-sans text-2xl font-semibold text-foreground lg:text-3xl">
                {product.name}
              </DialogTitle>

              <DialogDescription
                className="text-3xl font-bold text-foreground lg:text-4xl"
                style={{ fontFamily: "Playfair Display, serif" }}
              >
                {formatPrice(product.price)}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="description" className="mt-6 flex-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="description">Descrição</TabsTrigger>
                <TabsTrigger value="specs">Especificações</TabsTrigger>
                <TabsTrigger value="reviews">Avaliações</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-4">
                <p
                  className="leading-relaxed text-muted-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {product.description}
                </p>

                {/* Trust badges */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-secondary/50 p-4 text-center">
                    <Truck className="size-5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">
                      Entrega Discreta
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-secondary/50 p-4 text-center">
                    <Shield className="size-5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">
                      Compra Segura
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-secondary/50 p-4 text-center">
                    <Package className="size-5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">
                      Embalagem Neutra
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <ProductCuratorship curatorship={product.curatorship} />
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
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Especificações não disponíveis.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="mt-4">
                <div className="mt-6">
                  <AnonymousReviews productId={product.id} />
                </div>
              </TabsContent>
            </Tabs>

            {/* Add to cart section */}
            <div className="mt-6 space-y-4 border-t border-border pt-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground">
                  Quantidade:
                </span>
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
                  <span className="w-8 text-center font-medium">
                    {quantity}
                  </span>
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
                          src={getPrimaryProductImage(related)}
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
  );
}
