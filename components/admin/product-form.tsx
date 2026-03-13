"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { X } from "lucide-react";
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
  curatorship?: string;
  inStock: boolean;
  isFeatured: boolean;
  imageUrl?: string;
  imageUrls?: string[];
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
  const [curatorship, setCuratorship] = useState(
    initialValue?.curatorship ?? "",
  );
  const [isFeatured, setIsFeatured] = useState(
    initialValue?.isFeatured ?? false,
  );
  const [inStock, setInStock] = useState(initialValue?.inStock ?? true);
  const [specs, setSpecs] = useState<SpecItem[]>(
    initialValue?.specs?.length ? initialValue.specs : [emptySpec()],
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [keptExistingImageUrls, setKeptExistingImageUrls] = useState<string[]>(
    initialValue?.imageUrls?.length
      ? initialValue.imageUrls.filter(Boolean)
      : initialValue?.imageUrl
        ? [initialValue.imageUrl]
        : [],
  );
  const [message, setMessage] = useState("");

  const previewUrls = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const removeExistingImage = (url: string) => {
    setKeptExistingImageUrls((prev) => prev.filter((item) => item !== url));
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
  };

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
      let resolvedImageUrls =
        keptExistingImageUrls.length > 0 ? [...keptExistingImageUrls] : [];

      if (imageFiles.length > 0) {
        const supabase = createClient();
        const uploadedUrls: string[] = [];

        for (const file of imageFiles) {
          const path = toStoragePath(name || "produto", file.name);

          const { error: uploadError } = await supabase.storage
            .from("products")
            .upload(path, file, {
              upsert: false,
              contentType: file.type || "application/octet-stream",
            });

          if (uploadError) {
            if (
              uploadError.message.toLowerCase().includes("bucket not found")
            ) {
              setMessage(
                "Erro no upload: bucket 'products' nao encontrado. Rode a migration scripts/004_storage_products_bucket.sql no Supabase SQL Editor.",
              );
              return;
            }

            setMessage(`Erro no upload da imagem: ${uploadError.message}`);
            return;
          }

          const { data } = supabase.storage.from("products").getPublicUrl(path);
          uploadedUrls.push(data.publicUrl);
        }

        resolvedImageUrls = [...keptExistingImageUrls, ...uploadedUrls];
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
        curatorship,
        isFeatured,
        inStock,
        imageUrl: resolvedImageUrls[0],
        imageUrls: resolvedImageUrls,
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
        setCuratorship("");
        setImageFiles([]);
        setKeptExistingImageUrls([]);
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
          multiple
          onChange={(event) =>
            setImageFiles(Array.from(event.target.files ?? []))
          }
        />
      </div>

      {(imageFiles.length > 0 || keptExistingImageUrls.length > 0) && (
        <p className="text-xs text-muted-foreground">
          {imageFiles.length > 0
            ? `${imageFiles.length} imagem(ns) selecionada(s) para upload no bucket 'products'.`
            : `${keptExistingImageUrls.length} imagem(ns) ja vinculada(s) a este produto.`}
        </p>
      )}

      {keptExistingImageUrls.length > 0 && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Imagens atuais
          </p>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
            {keptExistingImageUrls.map((url) => (
              <div
                key={url}
                className="relative aspect-square overflow-hidden rounded-md border border-border"
              >
                <Image
                  src={url}
                  alt="Imagem atual"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(url)}
                  className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label="Remover imagem atual"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewUrls.length > 0 && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Novas imagens selecionadas
          </p>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
            {previewUrls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="relative aspect-square overflow-hidden rounded-md border border-border"
              >
                <Image
                  src={url}
                  alt="Nova imagem"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label="Remover imagem selecionada"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <textarea
        value={curatorship}
        onChange={(event) => setCuratorship(event.target.value)}
        placeholder="Curadoria da Loja (analise tecnica, sensorial e recomendacoes)"
        className="min-h-28 w-full rounded-md border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm"
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
