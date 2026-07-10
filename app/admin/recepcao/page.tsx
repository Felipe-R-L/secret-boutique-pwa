import { requireAdminPage } from "@/lib/auth/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { parsePersistedProductVariants } from "@/lib/server/product-variants";
import { ReceptionPos } from "@/components/admin/reception-pos";

export default async function AdminReceptionPage() {
  await requireAdminPage();

  const supabase = createServiceRoleClient();

  const { data: products } = await supabase
    .from("products")
    .select("id,name,price,stock_quantity,in_stock,image,image_url,images,variants")
    .order("name", { ascending: true });

  const productOptions = (products ?? []).map((p) => {
    const imagesArray = Array.isArray(p.images) ? (p.images as unknown[]) : [];
    const firstImage =
      typeof imagesArray[0] === "string" ? (imagesArray[0] as string) : null;

    return {
      id: p.id,
      name: p.name,
      price: Number(p.price),
      stock_quantity: p.stock_quantity ?? 0,
      in_stock: p.in_stock !== false,
      imageUrl: p.image_url ?? p.image ?? firstImage ?? null,
      variants: parsePersistedProductVariants(p.variants).map((variant) => ({
        id: variant.id,
        label: variant.label,
        price: variant.price,
        stock_quantity: variant.stock_quantity,
        in_stock: variant.in_stock,
      })),
    };
  });

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Venda pela Recepção</h2>
        <p className="text-sm text-muted-foreground">
          Monte o pedido, gere o QR Pix (ou copia e cola) na tela e acompanhe o
          pagamento em tempo real. Cartão/dinheiro pela maquininha: confirme
          manualmente após receber.
        </p>
      </div>

      <ReceptionPos products={productOptions} />
    </section>
  );
}
