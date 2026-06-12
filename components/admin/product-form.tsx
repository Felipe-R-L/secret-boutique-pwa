"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { upsertProduct } from "@/lib/actions/products";
import {
  GalleryEditor,
  type GalleryItem,
} from "@/components/admin/gallery-editor";

type SpecItem = {
  key: string;
  value: string;
};

type VariantFormValue = {
  id?: string;
  sku: string;
  label: string;
  price: number;
  stockQuantity: number;
  inStock: boolean;
  isDefault?: boolean;
  images?: string[];
  attributes: SpecItem[];
};

type VariantDraft = {
  tempId: string;
  id?: string;
  sku: string;
  label: string;
  price: string;
  stockQuantity: string;
  inStock: boolean;
  isDefault: boolean;
  attributes: SpecItem[];
  images: GalleryItem[];
};

type ProductFormValue = {
  productId?: string;
  name: string;
  price: number;
  category: string;
  description: string;
  curatorship?: string;
  inStock: boolean;
  isFeatured: boolean;
  isAdult?: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  specs: SpecItem[];
  variants?: VariantFormValue[];
};

function emptySpec(): SpecItem {
  return { key: "", value: "" };
}

function urlsToGalleryItems(urls: string[]): GalleryItem[] {
  return urls
    .filter(Boolean)
    .map((url) => ({
      id: crypto.randomUUID(),
      kind: "existing" as const,
      url,
    }));
}

function revokeGallery(items: GalleryItem[]) {
  items.forEach((item) => {
    if (item.kind === "upload") URL.revokeObjectURL(item.previewUrl);
  });
}

function createEmptyVariantDraft(index = 0): VariantDraft {
  return {
    tempId: crypto.randomUUID(),
    sku: "",
    label: "",
    price: "",
    stockQuantity: "0",
    inStock: true,
    isDefault: index === 0,
    attributes: [emptySpec()],
    images: [],
  };
}

function createVariantDraft(
  value: VariantFormValue,
  index: number,
): VariantDraft {
  return {
    tempId: crypto.randomUUID(),
    id: value.id,
    sku: value.sku,
    label: value.label,
    price: String(value.price),
    stockQuantity: String(value.stockQuantity),
    inStock: value.inStock,
    isDefault: value.isDefault ?? index === 0,
    attributes: value.attributes.length ? value.attributes : [emptySpec()],
    images: urlsToGalleryItems(value.images ?? []),
  };
}

function toStoragePath(name: string, fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "bin";
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  return `product/${crypto.randomUUID()}-${slug}.${extension}`;
}

interface ProductFormProps {
  mode: "create" | "edit";
  initialValue?: ProductFormValue;
  categories?: string[];
  onSaved?: () => void;
}

export function ProductForm({
  mode,
  initialValue,
  categories = [],
  onSaved,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialValue?.name ?? "");
  const [price, setPrice] = useState(String(initialValue?.price ?? ""));
  const [category, setCategory] = useState(initialValue?.category ?? "");
  const [description, setDescription] = useState(
    initialValue?.description ?? "",
  );
  const [curatorship, setCuratorship] = useState(
    initialValue?.curatorship ?? "",
  );
  const [isFeatured, setIsFeatured] = useState(
    initialValue?.isFeatured ?? false,
  );
  const [isAdult, setIsAdult] = useState(initialValue?.isAdult ?? true);
  const [inStock, setInStock] = useState(initialValue?.inStock ?? true);
  const [specs, setSpecs] = useState<SpecItem[]>(
    initialValue?.specs?.length ? initialValue.specs : [emptySpec()],
  );
  const [productImages, setProductImages] = useState<GalleryItem[]>(() =>
    urlsToGalleryItems(
      initialValue?.imageUrls?.length
        ? initialValue.imageUrls
        : initialValue?.imageUrl
          ? [initialValue.imageUrl]
          : [],
    ),
  );
  const [variants, setVariants] = useState<VariantDraft[]>(
    initialValue?.variants?.length
      ? initialValue.variants.map(createVariantDraft)
      : [],
  );
  const [message, setMessage] = useState("");

  const variantCount = variants.length;

  // Revoke object URLs of any pending uploads when the form unmounts.
  const galleriesRef = useRef({ productImages, variants });
  galleriesRef.current = { productImages, variants };
  useEffect(() => {
    return () => {
      revokeGallery(galleriesRef.current.productImages);
      galleriesRef.current.variants.forEach((variant) =>
        revokeGallery(variant.images),
      );
    };
  }, []);

  const addSpec = () => setSpecs((prev) => [...prev, emptySpec()]);

  const removeSpec = (index: number) => {
    setSpecs((prev) => {
      if (prev.length === 1) return [emptySpec()];
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const updateSpec = (index: number, field: keyof SpecItem, value: string) => {
    setSpecs((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addVariant = () => {
    setVariants((prev) => [...prev, createEmptyVariantDraft(prev.length)]);
  };

  const removeVariant = (tempId: string) => {
    setVariants((prev) => {
      const variant = prev.find((item) => item.tempId === tempId);
      if (variant) revokeGallery(variant.images);

      const next = prev.filter((item) => item.tempId !== tempId);
      if (next.length === 1) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  };

  const updateVariant = (
    tempId: string,
    field: keyof Omit<VariantDraft, "tempId" | "attributes" | "images">,
    value: string | boolean,
  ) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.tempId === tempId ? { ...variant, [field]: value } : variant,
      ),
    );
  };

  const setDefaultVariant = (tempId: string) => {
    setVariants((prev) =>
      prev.map((variant) => ({
        ...variant,
        isDefault: variant.tempId === tempId,
      })),
    );
  };

  const setVariantImages = (tempId: string, images: GalleryItem[]) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.tempId === tempId ? { ...variant, images } : variant,
      ),
    );
  };

  const addVariantAttribute = (tempId: string) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.tempId === tempId
          ? { ...variant, attributes: [...variant.attributes, emptySpec()] }
          : variant,
      ),
    );
  };

  const removeVariantAttribute = (tempId: string, index: number) => {
    setVariants((prev) =>
      prev.map((variant) => {
        if (variant.tempId !== tempId) return variant;
        if (variant.attributes.length === 1) {
          return { ...variant, attributes: [emptySpec()] };
        }

        return {
          ...variant,
          attributes: variant.attributes.filter(
            (_, currentIndex) => currentIndex !== index,
          ),
        };
      }),
    );
  };

  const updateVariantAttribute = (
    tempId: string,
    index: number,
    field: keyof SpecItem,
    value: string,
  ) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.tempId === tempId
          ? {
              ...variant,
              attributes: variant.attributes.map((attribute, currentIndex) =>
                currentIndex === index
                  ? { ...attribute, [field]: value }
                  : attribute,
              ),
            }
          : variant,
      ),
    );
  };

  // Uploads pending files (in order) and returns the ordered list of URLs.
  const resolveGallery = async (
    gallery: GalleryItem[],
    label: string,
  ): Promise<string[]> => {
    const supabase = createClient();
    const urls: string[] = [];

    for (const item of gallery) {
      if (item.kind === "existing") {
        urls.push(item.url);
        continue;
      }

      const path = toStoragePath(label || "produto", item.file.name);
      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(path, item.file, {
          upsert: false,
          contentType: item.file.type || "application/octet-stream",
        });

      if (uploadError) {
        if (uploadError.message.toLowerCase().includes("bucket not found")) {
          throw new Error(
            "Erro no upload: bucket 'products' não encontrado. Rode a migration scripts/004_storage_products_bucket.sql no Supabase SQL Editor.",
          );
        }
        throw new Error(`Erro no upload da imagem: ${uploadError.message}`);
      }

      const { data } = supabase.storage.from("products").getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    return urls;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      let resolvedImageUrls: string[];
      try {
        resolvedImageUrls = await resolveGallery(
          productImages,
          name || "produto",
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Erro no upload das imagens.",
        );
        return;
      }

      const sanitizedSpecs = specs
        .map((item) => ({ key: item.key.trim(), value: item.value.trim() }))
        .filter((item) => item.key.length > 0 && item.value.length > 0);

      const resolvedVariants: VariantFormValue[] = [];

      for (const variant of variants) {
        if (!variant.sku.trim() || !variant.label.trim()) {
          setMessage("Todas as variantes precisam de SKU e nome de exibição.");
          return;
        }

        const priceValue = Number(variant.price);
        if (!Number.isFinite(priceValue) || priceValue <= 0) {
          setMessage("Cada variante precisa de um preço válido.");
          return;
        }

        const stockValue = Number(variant.stockQuantity);
        if (!Number.isFinite(stockValue) || stockValue < 0) {
          setMessage("Cada variante precisa de um estoque válido.");
          return;
        }

        let variantImages: string[];
        try {
          variantImages = await resolveGallery(
            variant.images,
            `${name || "produto"}-${variant.label || variant.sku || "variante"}`,
          );
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Erro no upload das imagens da variante.",
          );
          return;
        }

        const attributes = variant.attributes
          .map((item) => ({ key: item.key.trim(), value: item.value.trim() }))
          .filter((item) => item.key.length > 0 && item.value.length > 0);

        resolvedVariants.push({
          id: variant.id,
          sku: variant.sku.trim(),
          label: variant.label.trim(),
          price: priceValue,
          stockQuantity: stockValue,
          inStock: variant.inStock,
          isDefault: variant.isDefault,
          images: variantImages,
          attributes,
        });
      }

      const result = await upsertProduct({
        productId: initialValue?.productId,
        name,
        price,
        category,
        description,
        curatorship,
        isFeatured,
        isAdult,
        inStock,
        imageUrl: resolvedImageUrls[0],
        imageUrls: resolvedImageUrls,
        specs: sanitizedSpecs,
        variants: resolvedVariants,
      });

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      setMessage(
        mode === "create"
          ? "Produto criado com sucesso."
          : "Produto atualizado com sucesso.",
      );

      if (mode === "create") {
        setName("");
        setPrice("");
        setCategory("");
        setDescription("");
        setCuratorship("");
        revokeGallery(productImages);
        setProductImages([]);
        setIsFeatured(false);
        setIsAdult(true);
        setInStock(true);
        setSpecs([emptySpec()]);
        variants.forEach((variant) => revokeGallery(variant.images));
        setVariants([]);
      }

      onSaved?.();
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-border p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome do produto"
          required
        />
        <Input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Categoria"
          list="product-category-options"
          required
        />
        <Input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          type="number"
          min="0"
          step="0.01"
          placeholder="Preço base ou menor preço"
          required
        />
      </div>

      {categories.length > 0 && (
        <datalist id="product-category-options">
          {categories.map((categoryOption) => (
            <option key={categoryOption} value={categoryOption} />
          ))}
        </datalist>
      )}

      <div className="rounded-xl border border-border p-3">
        <GalleryEditor
          label="Imagens do produto"
          help="Galeria geral (imagens editoriais). A primeira é a capa exibida no card e na vitrine. Arraste para reordenar ou use o ★ para tornar capa."
          items={productImages}
          onChange={setProductImages}
        />
      </div>

      <div className="rounded-2xl border border-foreground/10 bg-gradient-to-br from-card via-card to-pastel-lavender/10 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Variantes do produto
            </p>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Crie combinações vendáveis com SKU, preço, estoque, atributos e
              fotos próprias. Sem selecionar uma variante na vitrine, o cliente
              verá a galeria agregada de todas elas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground">
              {variantCount === 0
                ? "Produto simples"
                : `${variantCount} variante${variantCount > 1 ? "s" : ""}`}
            </span>
            <Button type="button" onClick={addVariant} className="rounded-full">
              <Plus className="size-4" />
              {variantCount === 0 ? "Criar primeira variante" : "Nova variante"}
            </Button>
          </div>
        </div>
      </div>

      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Descricao"
        className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2"
        required
      />

      <textarea
        value={curatorship}
        onChange={(event) => setCuratorship(event.target.value)}
        placeholder="Curadoria da Loja (analise tecnica, sensorial e recomendacoes)"
        className="min-h-28 w-full rounded-md border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm"
      />

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-sm font-medium">Especificações dinâmicas</p>

        <div className="space-y-2">
          {specs.map((spec, index) => (
            <div
              key={`spec-${index}`}
              className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
            >
              <Input
                value={spec.key}
                placeholder="Chave (ex: Material)"
                onChange={(event) =>
                  updateSpec(index, "key", event.target.value)
                }
              />
              <Input
                value={spec.value}
                placeholder="Valor (ex: Silicone)"
                onChange={(event) =>
                  updateSpec(index, "value", event.target.value)
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => removeSpec(index)}
              >
                Remover
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="secondary" onClick={addSpec}>
          Adicionar especificação
        </Button>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Variantes vendáveis
            </p>
            <p className="text-xs text-muted-foreground">
              Cadastre combinações de atributos, cada uma com preço, estoque e
              galeria próprios.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={addVariant}>
            <Plus className="size-4" />
            Adicionar variante
          </Button>
        </div>

        {variants.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Nenhuma variante criada ainda.
            </p>
            <p className="mt-1 leading-relaxed">
              Use o botão acima para adicionar a primeira combinação vendável.
              Você poderá definir SKU, atributos, preço, estoque e fotos
              específicas para cada uma.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div
              key={variant.tempId}
              className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-pastel-lavender/25 px-3 py-1 text-xs font-medium text-foreground">
                    <Sparkles className="size-3.5" />
                    Variante {index + 1}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Defina aqui a combinação vendável que aparecerá para o
                    cliente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="radio"
                      name="default-variant"
                      checked={variant.isDefault}
                      onChange={() => setDefaultVariant(variant.tempId)}
                    />
                    Padrão
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeVariant(variant.tempId)}
                  >
                    Remover
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Input
                  value={variant.label}
                  onChange={(event) =>
                    updateVariant(variant.tempId, "label", event.target.value)
                  }
                  placeholder="Nome visível da variante"
                />
                <Input
                  value={variant.sku}
                  onChange={(event) =>
                    updateVariant(variant.tempId, "sku", event.target.value)
                  }
                  placeholder="SKU"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.price}
                  onChange={(event) =>
                    updateVariant(variant.tempId, "price", event.target.value)
                  }
                  placeholder="Preço da variante"
                />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={variant.stockQuantity}
                  onChange={(event) =>
                    updateVariant(
                      variant.tempId,
                      "stockQuantity",
                      event.target.value,
                    )
                  }
                  placeholder="Estoque disponível"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={variant.inStock}
                  onChange={(event) =>
                    updateVariant(
                      variant.tempId,
                      "inStock",
                      event.target.checked,
                    )
                  }
                />
                Variante disponível para venda
              </label>

              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-sm font-medium">Atributos da combinação</p>
                <div className="space-y-2">
                  {variant.attributes.map((attribute, attributeIndex) => (
                    <div
                      key={`${variant.tempId}-attribute-${attributeIndex}`}
                      className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                    >
                      <Input
                        value={attribute.key}
                        placeholder="Atributo (ex: Cor)"
                        onChange={(event) =>
                          updateVariantAttribute(
                            variant.tempId,
                            attributeIndex,
                            "key",
                            event.target.value,
                          )
                        }
                      />
                      <Input
                        value={attribute.value}
                        placeholder="Valor (ex: Preto)"
                        onChange={(event) =>
                          updateVariantAttribute(
                            variant.tempId,
                            attributeIndex,
                            "value",
                            event.target.value,
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          removeVariantAttribute(variant.tempId, attributeIndex)
                        }
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addVariantAttribute(variant.tempId)}
                >
                  Adicionar atributo
                </Button>
              </div>

              <div className="rounded-xl border border-border p-3">
                <GalleryEditor
                  label="Galeria da variante"
                  help="Essas imagens aparecem quando o cliente seleciona esta combinação. A primeira é a capa da variante."
                  items={variant.images}
                  onChange={(next) => setVariantImages(variant.tempId, next)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
          />
          Produto em destaque
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(event) => setInStock(event.target.checked)}
          />
          Em estoque para produto sem variantes
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAdult}
            onChange={(event) => setIsAdult(event.target.checked)}
          />
          Produto adulto (+18) — desmarque para itens livres (SFW)
        </label>
      </div>

      {message && (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          {message}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending
          ? "Salvando..."
          : mode === "create"
            ? "Criar produto"
            : "Salvar alteracoes"}
      </Button>
    </form>
  );
}
