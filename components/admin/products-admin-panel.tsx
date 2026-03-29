"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Plus, Star, Tags } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteProduct } from "@/lib/actions/products";
import { updateStoreCategories } from "@/lib/actions/admin";

export type AdminProductCard = {
  id: string;
  name: string;
  price: number;
  description: string;
  curatorship?: string;
  category: string;
  inStock: boolean;
  isFeatured: boolean;
  stockQuantity: number;
  imageUrl?: string;
  imageUrls?: string[];
  specs: Array<{ key: string; value: string }>;
  variants: Array<{
    id: string;
    sku: string;
    label: string;
    price: number;
    stockQuantity: number;
    inStock: boolean;
    isDefault?: boolean;
    images?: string[];
    attributes: Array<{ key: string; value: string }>;
  }>;
};

interface ProductsAdminPanelProps {
  products: AdminProductCard[];
  categories: string[];
}

function normalizeCategories(categories: string[]) {
  return Array.from(
    new Set(
      categories.map((item) => item.trim()).filter((item) => item.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function ProductsAdminPanel({
  products,
  categories,
}: ProductsAdminPanelProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const sortedCategories = useMemo(
    () => normalizeCategories(categories),
    [categories],
  );

  const saveCategories = (nextCategories: string[]) => {
    setFeedback("");

    startTransition(async () => {
      const result = await updateStoreCategories({
        categories: normalizeCategories(nextCategories),
      });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }

      setFeedback("Categorias atualizadas com sucesso.");
      setNewCategory("");
    });
  };

  const addCategory = () => {
    const candidate = newCategory.trim();
    if (!candidate) return;
    if (sortedCategories.includes(candidate)) {
      setFeedback("Categoria ja existe.");
      return;
    }

    saveCategories([...sortedCategories, candidate]);
  };

  const removeCategory = (category: string) => {
    const next = sortedCategories.filter((item) => item !== category);
    saveCategories(next);
  };

  const removeProduct = (productId: string) => {
    setFeedback("");

    startTransition(async () => {
      const result = await deleteProduct({ productId });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }

      setFeedback("Produto removido com sucesso.");
    });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Categorias</h3>
            <p className="text-xs text-muted-foreground">
              Crie categorias aqui e depois use no cadastro dos produtos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Nova categoria"
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
            <Button
              type="button"
              size="sm"
              onClick={addCategory}
              disabled={isPending}
            >
              Adicionar
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {sortedCategories.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhuma categoria cadastrada.
            </p>
          )}

          {sortedCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => removeCategory(category)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
              title="Clique para remover categoria"
            >
              <Tags className="size-3" />
              {category}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Produtos</h3>
          <p className="text-xs text-muted-foreground">
            Edite em modal para evitar lista gigante.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Novo produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Novo produto</DialogTitle>
              <DialogDescription>
                Preencha os dados do produto e, se necessário, crie variantes
                com SKU, preço, estoque e galeria próprios.
              </DialogDescription>
            </DialogHeader>
            <ProductForm
              mode="create"
              categories={sortedCategories}
              onSaved={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {feedback && (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          {feedback}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article
            key={product.id}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="relative aspect-4/3 w-full bg-muted">
              <Image
                src={product.imageUrl ?? "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>

            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="line-clamp-1 font-medium">{product.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {product.category}
                  </p>
                </div>
                <Badge variant={product.inStock ? "secondary" : "outline"}>
                  {product.inStock
                    ? `Em estoque (${product.stockQuantity})`
                    : "Sem estoque"}
                </Badge>
              </div>

              <p className="line-clamp-2 text-sm text-muted-foreground">
                {product.description}
              </p>

              <div className="flex items-center justify-between">
                <strong className="text-sm">
                  R$ {product.price.toFixed(2)}
                </strong>
                <div className="flex items-center gap-2 text-xs">
                  {product.variants.length > 0 && (
                    <span className="rounded-full bg-pastel-lavender/25 px-2 py-1 text-foreground">
                      {product.variants.length} variante
                      {product.variants.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {product.isFeatured && (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Star className="size-3 fill-amber-500 text-amber-500" />
                      Destaque
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Dialog
                  open={editingProductId === product.id}
                  onOpenChange={(open) =>
                    setEditingProductId(open ? product.id : null)
                  }
                >
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" className="flex-1">
                      Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
                    <DialogHeader>
                      <DialogTitle>Editar produto</DialogTitle>
                      <DialogDescription>
                        {product.name}{" "}
                        {product.variants.length > 0
                          ? `• ${product.variants.length} variante${product.variants.length > 1 ? "s" : ""}`
                          : "• produto simples"}
                      </DialogDescription>
                    </DialogHeader>
                    <ProductForm
                      mode="edit"
                      categories={sortedCategories}
                      initialValue={{
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        category: product.category,
                        description: product.description,
                        curatorship: product.curatorship ?? "",
                        inStock: product.inStock,
                        isFeatured: product.isFeatured,
                        imageUrl: product.imageUrl,
                        imageUrls: product.imageUrls,
                        specs: product.specs,
                        variants: product.variants,
                      }}
                      onSaved={() => setEditingProductId(null)}
                    />
                  </DialogContent>
                </Dialog>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeProduct(product.id)}
                  disabled={isPending}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
