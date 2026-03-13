import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  searchParams?: Promise<{ orderId?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const resolvedParams = (await searchParams) ?? {};

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <CheckCircle className="size-8 text-primary" />
      </div>
      <h1 className="text-2xl font-semibold">Pedido confirmado</h1>
      <p className="text-sm text-muted-foreground">
        {resolvedParams.orderId
          ? `ID do pedido: ${resolvedParams.orderId}`
          : "Seu pedido foi criado com sucesso."}
      </p>
      <Button asChild>
        <Link href="/">Voltar ao catalogo</Link>
      </Button>
    </main>
  );
}
