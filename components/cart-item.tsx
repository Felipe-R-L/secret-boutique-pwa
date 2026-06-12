"use client";

import Image from "next/image";
import { Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCartItemUnitPrice,
  useCartStore,
  CartItem as CartItemType,
} from "@/lib/store/cart-store";
import { getPrimaryProductImage } from "@/lib/product-images";
import { getVariantDisplayLabel } from "@/lib/product-variants";
import { toast } from "sonner";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { addItem, updateQuantity, removeItem } = useCartStore();

  const handleRemove = () => {
    const removed = item;
    removeItem(item.product.id, item.variant?.id);

    toast("Item removido do carrinho", {
      description: removed.product.name,
      position: "bottom-center",
      duration: 5000,
      action: {
        label: "Desfazer",
        onClick: () => {
          addItem(removed.product, removed.variant);
          updateQuantity(
            removed.product.id,
            removed.variant?.id,
            removed.quantity,
          );
        },
      },
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-3">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        <Image
          src={getPrimaryProductImage(item.product, item.variant?.id)}
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
          {item.variant && (
            <p className="text-xs text-muted-foreground">
              {getVariantDisplayLabel(item.variant)}
            </p>
          )}
          <p className="text-sm font-semibold text-foreground">
            {formatPrice(getCartItemUnitPrice(item))}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-lg bg-secondary p-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                updateQuantity(
                  item.product.id,
                  item.variant?.id,
                  item.quantity - 1,
                )
              }
              aria-label="Diminuir quantidade"
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-6 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                updateQuantity(
                  item.product.id,
                  item.variant?.id,
                  item.quantity + 1,
                )
              }
              aria-label="Aumentar quantidade"
            >
              <Plus className="size-3" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleRemove}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Remover item"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
