"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryItem =
  | { id: string; kind: "existing"; url: string }
  | { id: string; kind: "upload"; file: File; previewUrl: string };

export function galleryItemUrl(item: GalleryItem): string {
  return item.kind === "existing" ? item.url : item.previewUrl;
}

export function filesToGalleryItems(files: FileList | File[]): GalleryItem[] {
  return Array.from(files).map((file) => ({
    id: crypto.randomUUID(),
    kind: "upload" as const,
    file,
    previewUrl: URL.createObjectURL(file),
  }));
}

interface GalleryEditorProps {
  items: GalleryItem[];
  onChange: (next: GalleryItem[]) => void;
  label?: string;
  help?: string;
}

export function GalleryEditor({
  items,
  onChange,
  label,
  help,
}: GalleryEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    onChange([...items, ...filesToGalleryItems(files)]);
  };

  const removeAt = (index: number) => {
    const item = items[index];
    if (item?.kind === "upload") URL.revokeObjectURL(item.previewUrl);
    onChange(items.filter((_, i) => i !== index));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}

      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (event.dataTransfer.files?.length)
            addFiles(event.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <Upload className="size-5" />
        Arraste imagens aqui ou clique para selecionar
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index)
                  move(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "group relative aspect-square cursor-grab overflow-hidden rounded-md border active:cursor-grabbing",
                index === 0
                  ? "border-foreground ring-1 ring-foreground"
                  : "border-border",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={galleryItemUrl(item)}
                alt=""
                className="h-full w-full object-cover"
              />

              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
                  Capa
                </span>
              )}

              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label="Remover imagem"
                className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-3" />
              </button>

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  title="Mover para a esquerda"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  className="text-white disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {index !== 0 && (
                  <button
                    type="button"
                    title="Tornar capa"
                    onClick={() => move(index, 0)}
                    className="text-white"
                  >
                    <Star className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  title="Mover para a direita"
                  onClick={() => move(index, index + 1)}
                  disabled={index === items.length - 1}
                  className="text-white disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
