"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    if (!email || !password) {
      setMessage("Informe email e senha.");
      setIsLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      setIsLoading(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "Conta criada. Se a confirmacao de email estiver ativa no Supabase, confirme seu email antes de entrar.",
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
      <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Acesso administrativo</h1>
          <p className="text-sm text-muted-foreground">
            Entre com email e senha do Supabase Auth.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="seu-email@dominio.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {message && (
            <p className="rounded-lg border border-border bg-muted p-2 text-xs text-muted-foreground">
              {message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setIsSignUp((value) => !value)}
        >
          {isSignUp ? "Ja tenho conta" : "Criar conta de teste"}
        </Button>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/">Voltar ao catalogo</Link>
        </Button>
      </div>
    </main>
  );
}
