"use client";

import Image from "next/image";
import {
  Plus,
  Minus,
  Star,
  Truck,
  Shield,
  Package,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useCartStore, Product } from "@/lib/store/cart-store";
import { getProductImages } from "@/lib/product-images";

interface ProductDrawerProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDrawer({
  product,
  open,
  onOpenChange,
}: ProductDrawerProps) {
  const AUTO_PLAY_MS = 5000;
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
  const imageCount =
    product?.images?.filter(Boolean).length ?? (product?.image ? 1 : 0);

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-0">
        <div className="flex h-full flex-col">
          {/* Drag indicator */}
          <div className="flex justify-center pb-2 pt-1">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Image */}
            <div className="space-y-2 bg-muted/40 p-3">
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
                        key={`${product.id}-drawer-carousel-${index}`}
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
                            sizes="100vw"
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
                          : "text-green-800"
                      }`}
                      aria-live="polite"
                    >
                      {autoplayIsPaused ? "PAUSADO" : "AUTO"}
                    </span>
                  </div>

                  {productImages.map((_, index) => (
                    <button
                      key={`${product.id}-drawer-dot-${index}`}
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
                <div className="grid grid-cols-5 gap-2">
                  {productImages.map((image, index) => (
                    <button
                      key={`${product.id}-drawer-image-${index}`}
                      type="button"
                      onClick={() => {
                        setActiveImageIndex(index);
                        carouselApi?.scrollTo(index);
                        pauseAutoplay();
                      }}
                      className="relative aspect-square overflow-hidden rounded-lg"
                      aria-label={`Ver imagem ${index + 1} de ${product.name}`}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} miniatura ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="72px"
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

            {/* Content */}
            <div className="space-y-5 px-5 py-6">
              {/* Rating */}
              {product.rating && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-amber-700">
                      {product.rating}
                    </span>
                  </div>
                  {product.reviews && (
                    <span className="text-sm text-muted-foreground">
                      ({product.reviews} avaliações)
                    </span>
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

              <p
                className="leading-relaxed text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {product.description}
              </p>

              {/* Specs */}
              {product.specs && (
                <div className="space-y-3 rounded-xl bg-secondary/50 p-4">
                  <h4 className="text-sm font-semibold text-foreground">
                    Especificações
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(product.specs)
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <div key={key}>
                          <span className="text-xs capitalize text-muted-foreground">
                            {key.replace(/_/g, " ")}
                          </span>
                          <p className="text-sm font-medium text-foreground">
                            {value}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Trust badges */}
              <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-4">
                <div className="flex flex-col items-center gap-1">
                  <Truck className="size-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    Discrição
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Shield className="size-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    Segurança
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Package className="size-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    Qualidade
                  </span>
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
  );
}
