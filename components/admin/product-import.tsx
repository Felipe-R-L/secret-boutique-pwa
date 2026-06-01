"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { csvToObjects } from "@/lib/csv";
import { importProducts, type ImportReport } from "@/lib/actions/products";

const TEMPLATE = [
  "nome,categoria,preco_venda,custo,quantidade,descricao,imagem,destaque,variante,atributo,valor,sku",
  '"Sabonete Líquido Morango 200ml",Autocuidado,24.90,9.90,24,"Sabonete corporal de morango com karité, espuma cremosa.",,sim,,,,',
  '"Gel Comestível 35ml",Sensual,19.90,7.90,12,"Gel beijável que esquenta no toque.",,nao,Morango,Sabor,Morango,GEL-MOR',
  '"Gel Comestível 35ml",Sensual,21.90,8.50,8,"Gel beijável que esquenta no toque.",,nao,Menta,Sabor,Menta,GEL-MEN',
].join("\n");

// Preview-only field picker (server does the authoritative parsing/validation).
function pick(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) if (row[alias]) return row[alias];
  return "";
}

export function ProductImport({ categories }: { categories: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [parseError, setParseError] = useState("");
  const [dupMode, setDupMode] = useState<"skip" | "update" | "allow">("skip");
  const [isPending, startTransition] = useTransition();

  const parse = (text: string) => {
    setRawText(text);
    setReport(null);
    setParseError("");
    try {
      setRows(csvToObjects(text));
    } catch {
      setRows([]);
      setParseError("Não consegui ler o CSV. Confira o formato.");
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    parse(await file.text());
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "modelo-produtos.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (rows.length === 0) return;
    startTransition(async () => {
      const result = await importProducts(rows, { duplicates: dupMode });
      setReport(result);
      if (result.inserted > 0) router.refresh();
    });
  };

  const reset = () => {
    setRawText("");
    setRows([]);
    setFileName("");
    setReport(null);
    setParseError("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="size-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar produtos via CSV</DialogTitle>
          <DialogDescription>
            Cria os produtos e, se houver quantidade e custo, lança a entrada de
            estoque inicial automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={downloadTemplate}
            >
              <Download className="size-4" />
              Baixar modelo
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFile}
              />
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                <Upload className="size-4" />
                {fileName || "Escolher arquivo"}
              </span>
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Colunas: <code>nome</code>, <code>categoria</code>,{" "}
            <code>preco_venda</code>, <code>custo</code>,{" "}
            <code>quantidade</code>, <code>descricao</code>, <code>imagem</code>{" "}
            (URL), <code>destaque</code>. Variantes: <code>variante</code>,{" "}
            <code>atributo</code>, <code>valor</code>, <code>sku</code> — linhas
            com o mesmo <code>nome</code> viram um produto só com várias
            variantes. Categorias novas são criadas automaticamente. Já
            existentes:{" "}
            {categories.length > 0 ? categories.join(", ") : "(nenhuma)"}.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Ou cole o CSV aqui
            </label>
            <textarea
              value={rawText}
              onChange={(event) => parse(event.target.value)}
              rows={6}
              placeholder={
                "nome,categoria,preco_venda,custo,quantidade\nProduto X,Sensual,29.90,12.50,10"
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
            />
          </div>

          {parseError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {parseError}
            </p>
          )}

          {rows.length > 0 && (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="bg-muted px-3 py-2 text-sm font-medium">
                Pré-visualização — {rows.length} linha(s)
              </div>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2 text-left">Nome</th>
                      <th className="p-2 text-left">Categoria</th>
                      <th className="p-2 text-left">Venda</th>
                      <th className="p-2 text-left">Custo</th>
                      <th className="p-2 text-left">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t border-border">
                        <td className="p-2">
                          {pick(row, [
                            "nome",
                            "name",
                            "produto",
                            "titulo",
                            "título",
                          ])}
                        </td>
                        <td className="p-2">
                          {pick(row, ["categoria", "category"])}
                        </td>
                        <td className="p-2">
                          {pick(row, [
                            "preco_venda",
                            "preço_venda",
                            "preco",
                            "preço",
                            "price",
                          ])}
                        </td>
                        <td className="p-2">{pick(row, ["custo", "cost"])}</td>
                        <td className="p-2">
                          {pick(row, [
                            "quantidade",
                            "quantity",
                            "qtd",
                            "estoque",
                          ])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 10 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  + {rows.length - 10} linha(s) não exibida(s)…
                </div>
              )}
            </div>
          )}

          {report && (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-4">
                <span className="font-medium text-green-700">
                  ✓ {report.inserted} criado(s)
                </span>
                {report.updated > 0 && (
                  <span className="font-medium text-blue-700">
                    ↻ {report.updated} atualizado(s)
                  </span>
                )}
                {report.skipped > 0 && (
                  <span className="font-medium text-muted-foreground">
                    ⤼ {report.skipped} pulado(s)
                  </span>
                )}
                {report.failedCount > 0 && (
                  <span className="font-medium text-destructive">
                    ✗ {report.failedCount} com erro
                  </span>
                )}
                {report.warnings.length > 0 && (
                  <span className="font-medium text-amber-600">
                    ⚠ {report.warnings.length} aviso(s)
                  </span>
                )}
              </div>
              {report.errors.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/10 p-2">
                  {report.errors.map((item, index) => (
                    <div key={index} className="text-xs text-destructive">
                      {item.row > 0 ? `Linha ${item.row}` : "Geral"}
                      {item.name ? ` (${item.name})` : ""}: {item.message}
                    </div>
                  ))}
                </div>
              )}
              {report.warnings.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-amber-300 bg-amber-50 p-2">
                  {report.warnings.map((item, index) => (
                    <div key={index} className="text-xs text-amber-700">
                      Linha {item.row}
                      {item.name ? ` (${item.name})` : ""}: {item.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Produto já existente (mesmo nome):
            </span>
            {(
              [
                { v: "skip", label: "Pular" },
                { v: "update", label: "Atualizar" },
                { v: "allow", label: "Importar mesmo assim" },
              ] as const
            ).map((opt) => (
              <label key={opt.v} className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name="dupmode"
                  checked={dupMode === opt.v}
                  onChange={() => setDupMode(opt.v)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={isPending || rows.length === 0}
            >
              {isPending
                ? "Importando…"
                : `Importar ${rows.length || ""} produto(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
