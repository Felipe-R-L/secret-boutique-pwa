"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { upsertProduct } from "@/lib/actions/products";

type SpecItem = {
  key: string;
  value: string;
};

type ProductFormValue = {
  productId?: string;
  name: string;
  price: number;
  category: string;
  description: string;
  inStock: boolean;
  isFeatured: boolean;
  imageUrl?: string;
  specs: SpecItem[];
};

function emptySpec(): SpecItem {
  return { key: "", value: "" };
}

function toStoragePath(name: string, fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "bin";
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
  const [isFeatured, setIsFeatured] = useState(
    initialValue?.isFeatured ?? false,
  );
  const [inStock, setInStock] = useState(initialValue?.inStock ?? true);
  const [specs, setSpecs] = useState<SpecItem[]>(
    initialValue?.specs?.length ? initialValue.specs : [emptySpec()],
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const existingImageUrl = useMemo(
    () => initialValue?.imageUrl,
    [initialValue?.imageUrl],
  );

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setMessage("");

    startTransition(async () => {
      let publicImageUrl = existingImageUrl;

      if (imageFile) {
        const supabase = createClient();
        const path = toStoragePath(name || "produto", imageFile.name);

        const { error: uploadError } = await supabase.storage
          .from("products")
          .upload(path, imageFile, {
            upsert: false,
            contentType: imageFile.type || "application/octet-stream",
          });

        if (uploadError) {
          if (uploadError.message.toLowerCase().includes("bucket not found")) {
            setMessage(
              "Erro no upload: bucket 'products' nao encontrado. Rode a migration scripts/004_storage_products_bucket.sql no Supabase SQL Editor.",
            );
            return;
          }

          setMessage(`Erro no upload da imagem: ${uploadError.message}`);
          return;
        }

        const { data } = supabase.storage.from("products").getPublicUrl(path);
        publicImageUrl = data.publicUrl;
      }

      const sanitizedSpecs = specs
        .map((item) => ({ key: item.key.trim(), value: item.value.trim() }))
        .filter((item) => item.key.length > 0 && item.value.length > 0);

      const result = await upsertProduct({
        productId: initialValue?.productId,
        name,
        price,
        category,
        description,
        isFeatured,
        inStock,
        imageUrl: publicImageUrl,
        specs: sanitizedSpecs,
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
        setImageFile(null);
        setIsFeatured(false);
        setInStock(true);
        setSpecs([emptySpec()]);
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
          placeholder="Preco"
          required
        />
        <Input
          type="file"
          accept="image/*"
          onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {categories.length > 0 && (
        <datalist id="product-category-options">
          {categories.map((categoryOption) => (
            <option key={categoryOption} value={categoryOption} />
          ))}
        </datalist>
      )}

      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Descricao"
        className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2"
        required
      />

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-sm font-medium">Especificacoes dinamicas</p>

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
          Adicionar especificacao
        </Button>
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
          Em estoque
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
